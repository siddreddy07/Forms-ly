import { createHash, timingSafeEqual } from "node:crypto"

import { and, eq, inArray } from "drizzle-orm"
import { Router } from "express"
import rateLimit, { ipKeyGenerator } from "express-rate-limit"
import { z } from "zod"

import { db } from "../config/db.js"
import { isSlug } from "../libs/slug.js"
import { checkSubmission, LAYOUT_BLOCKS, type Block, type FileRef } from "../libs/answers.js"
import { closedReason, publishedSettingsOf } from "../libs/formSettings.js"
import { files, formVersions, forms, responses } from "../schema.js"
import { cacheKeys, cached, responsesChanged, TTL } from "../services/cache.js"
import { checkUploadedFile, PLATFORM_FREE_FILES, platformFilesUsed, storageFor, uploadAuth } from "../services/storage.js"

// Everything here is open to anyone, with no sign-in. So it only ever sends what a person filling in the form
// needs: the published copy, the design and the title. Never the owner, the id or the unpublished draft.
const router = Router()

const publicLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: "Too many requests. Try again in a moment." })
  },
})

type Form = typeof forms.$inferSelect

function isOpen(form: Form) {
  return form.status === "published" && form.publishedVersion !== null && form.archivedAt === null
}

// The frozen copy made at publish, so edits after publishing do not show until published again.
// The closing date is part of the published settings for the same reason.
async function liveBody(form: Form) {
  const [published] = await db
    .select()
    .from(formVersions)
    .where(and(eq(formVersions.formId, form.id), eq(formVersions.version, form.publishedVersion!)))
  if (!published) return { state: "unpublished" as const }
  return {
    state: "live" as const,
    title: form.title,
    document: published.document,
    design: form.design,
    version: published.version,
    closesAt: publishedSettingsOf(form).closeAt,
  }
}

// The form exists and is live, but its published closing time has passed.
function closedBody(form: Form) {
  const settings = publishedSettingsOf(form)
  const reason = closedReason(settings)
  return reason ? { state: "closed" as const, reason, title: form.title, closesAt: settings.closeAt } : null
}

// ---------- GET /public/forms/:slug : the form people fill in ----------
// 404                       no form has this link
// { state: "unpublished" }  not open (unpublished, archived)
// { state: "private" }      the owner made it private
// { state: "closed" }       its published closing date has passed
// { state: "live", title, document, design, version, closesAt }

router.get("/forms/:slug", publicLimiter, async (req, res) => {
  // Access can change at any moment, so nobody should keep an old answer. A short shared cache in Redis is fine:
  // publishing, settings changes and archiving delete it, and the submit route checks the closing date again.
  res.set("Cache-Control", "no-store")

  const slug = String(req.params.slug).toLowerCase()
  if (!isSlug(slug)) {
    res.status(404).json({ error: "Form not found" })
    return
  }

  const payload = await cached(cacheKeys.publicForm(slug), TTL.publicForm, async () => {
    const [form] = await db.select().from(forms).where(eq(forms.slug, slug))
    if (!form) return null

    if (!isOpen(form)) return { state: "unpublished" as const }
    const closed = closedBody(form)
    if (closed) return closed
    if (form.access === "private") return { state: "private" as const }
    return await liveBody(form)
  })

  if (!payload) {
    res.status(404).json({ error: "Form not found" })
    return
  }
  res.json(payload)
})

// ---------- POST /public/forms/:slug/unlock : open a private form with its 4 digit code ----------
// Body: { code }
// 200 { state: "live", ... }  the right code (the same answer a public form gives)
// 403 { error }               the wrong code
// 4 digits are easy to guess, so guesses are limited hard: a few a minute for each visitor, and a cap for the form as
// a whole so many visitors cannot add up to a brute force.

const unlockPerVisitor = rateLimit({
  windowMs: 60_000,
  limit: 6,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? "")}:${String(req.params.slug)}`,
  handler: (_req, res) => {
    res.status(429).json({ error: "Too many tries. Wait a minute." })
  },
})

const unlockPerForm = rateLimit({
  windowMs: 10 * 60_000,
  limit: 40,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => String(req.params.slug),
  handler: (_req, res) => {
    res.status(429).json({ error: "Too many tries on this form. Try again later." })
  },
})

const unlockSchema = z.object({ code: z.string().regex(/^\d{4}$/) })

function sameCode(a: string, b: string) {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

router.post("/forms/:slug/unlock", unlockPerVisitor, unlockPerForm, async (req, res) => {
  res.set("Cache-Control", "no-store")

  const slug = String(req.params.slug).toLowerCase()
  const body = unlockSchema.safeParse(req.body)
  if (!isSlug(slug) || !body.success) {
    res.status(403).json({ error: "Wrong code" })
    return
  }

  const [form] = await db.select().from(forms).where(eq(forms.slug, slug))
  if (!form) {
    res.status(404).json({ error: "Form not found" })
    return
  }
  if (!isOpen(form)) {
    res.json({ state: "unpublished" })
    return
  }
  const closed = closedBody(form)
  if (closed) {
    res.json(closed)
    return
  }
  if (form.access === "private" && !(form.accessCode && sameCode(form.accessCode, body.data.code))) {
    res.status(403).json({ error: "Wrong code" })
    return
  }
  res.json(await liveBody(form))
})

// ---------- POST /public/forms/:slug/responses : someone submits the form ----------
// Body: { answers, durationMs?, device?, code? }  (code only for a private form)
// 201 { id }   saved
// 403          private form and the code is missing or wrong
// 409 { error } the form is not open any more
// The questions are taken from the published copy on the server, never from the browser, so a response always matches
// the form people saw. Answers for questions that are not in the form are dropped.

const submitPerVisitor = rateLimit({
  windowMs: 60_000,
  limit: 8,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? "")}:${String(req.params.slug)}`,
  handler: (_req, res) => {
    res.status(429).json({ error: "Too many submissions. Wait a minute and try again." })
  },
})

const submitPerForm = rateLimit({
  windowMs: 10 * 60_000,
  limit: 600,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => String(req.params.slug),
  handler: (_req, res) => {
    res.status(429).json({ error: "This form is getting a lot of traffic. Try again in a few minutes." })
  },
})

const submitSchema = z.object({
  answers: z.record(z.string().max(100), z.unknown()),
  durationMs: z.number().int().min(0).max(24 * 60 * 60_000).nullish(),
  device: z.enum(["phone", "tablet", "desktop"]).nullish(),
  code: z.string().regex(/^\d{4}$/).optional(),
})

type Live = Extract<Awaited<ReturnType<typeof liveBody>>, { state: "live" }>

// The form's answerable questions, from the published copy
function answerBlocks(live: Live): Block[] {
  const steps = (live.document as { steps?: { blocks?: unknown[] }[] }).steps ?? []
  return steps
    .flatMap((st) => (Array.isArray(st.blocks) ? st.blocks : []))
    .filter((b): b is Block => !!b && typeof (b as { id?: unknown }).id === "string" && !LAYOUT_BLOCKS.has(String((b as { type?: unknown }).type)))
}

// Is this visitor allowed to use the form right now? Open, and for a private form the right code.
async function openFor(slug: string, code: string | undefined) {
  const [form] = await db.select().from(forms).where(eq(forms.slug, slug))
  if (!form) return { ok: false as const, error: 404 as const, message: "Form not found" }
  if (!isOpen(form)) return { ok: false as const, error: 409 as const, message: "This form is not open any more." }
  if (closedBody(form)) return { ok: false as const, error: 409 as const, message: "This form is no longer accepting responses." }
  if (form.access === "private" && !(form.accessCode && code && sameCode(form.accessCode, code))) return { ok: false as const, error: 403 as const, message: "Wrong code" }
  const live = await liveBody(form)
  if (live.state !== "live") return { ok: false as const, error: 409 as const, message: "This form is not open any more." }
  return { ok: true as const, form, live }
}

router.post("/forms/:slug/responses", submitPerVisitor, submitPerForm, async (req, res) => {
  res.set("Cache-Control", "no-store")

  const slug = String(req.params.slug).toLowerCase()
  const body = submitSchema.safeParse(req.body)
  if (!isSlug(slug) || !body.success) {
    res.status(400).json({ error: "Invalid answers" })
    return
  }

  const open = await openFor(slug, body.data.code)
  if (!open.ok) {
    res.status(open.error).json({ error: open.message })
    return
  }
  const { form, live } = open

  // Required questions and every answer's shape, using the questions the server holds (not the browser's)
  const fields = answerBlocks(live)
  const checked = checkSubmission(fields, body.data.answers)
  if (!checked.ok) {
    res.status(422).json({ error: "Some answers need attention.", errors: checked.errors })
    return
  }
  const answers = checked.answers

  // Uploads: ask the storage what really arrived, and keep its name and size, not the browser's
  const stored: { blockId: string; fileId: string; filePath: string; name: string; size: number; mime: string }[] = []
  const refs = fields.flatMap((b) =>
    b.type === "file_upload" ? ((answers[b.id] as FileRef[] | undefined) ?? []).map((r) => ({ blockId: b.id, fileId: r.fileId })) : []
  )
  let storage: Awaited<ReturnType<typeof storageFor>> = null
  if (refs.length > 0) {
    storage = await storageFor(form.ownerId)
    if (!storage) {
      res.status(503).json({ error: "File uploads are turned off for this form." })
      return
    }
    const reused = await db.select({ ref: files.providerRef }).from(files).where(inArray(files.providerRef, refs.map((r) => r.fileId)))
    if (reused.length > 0) {
      res.status(422).json({ error: "That file was already used.", errors: { [refs[0]!.blockId]: "Upload the file again" } })
      return
    }
    if (storage.source === "platform" && (await platformFilesUsed(form.ownerId)) + refs.length > PLATFORM_FREE_FILES) {
      res.status(422).json({ error: "This form can't take more uploads right now.", errors: { [refs[0]!.blockId]: "Uploads are full for this form" } })
      return
    }
    for (const r of refs) {
      const result = await checkUploadedFile(storage, r.fileId, { formId: form.id })
      if (!result.ok) {
        res.status(422).json({ error: result.reason, errors: { [r.blockId]: result.reason } })
        return
      }
      stored.push({ blockId: r.blockId, fileId: r.fileId, filePath: result.filePath, name: result.name, size: result.size, mime: result.mime })
    }
    for (const b of fields) {
      if (b.type === "file_upload" && answers[b.id]) {
        answers[b.id] = stored.filter((f) => f.blockId === b.id).map((f) => ({ fileId: f.fileId, name: f.name, size: f.size }))
      }
    }
  }

  const [saved] = await db
    .insert(responses)
    .values({
      formId: form.id,
      formVersion: live.version,
      fields,
      answers,
      durationMs: body.data.durationMs ?? null,
      device: body.data.device ?? null,
      completed: true,
      ipHash: createHash("sha256").update(`${process.env.IP_HASH_SALT ?? "formly"}:${req.ip ?? ""}`).digest("hex"),
    })
    .returning({ id: responses.id })

  if (stored.length > 0 && storage) {
    const onPlatform = storage.source === "platform"
    try {
      await db.insert(files).values(
        stored.map((f) => ({
          responseId: saved!.id,
          ownerId: form.ownerId,
          provider: "imagekit" as const,
          onPlatform,
          providerRef: f.fileId,
          filePath: f.filePath,
          name: f.name,
          size: f.size,
          mime: f.mime,
        }))
      )
    } catch (error) {
      // No response without its files
      await db.delete(responses).where(eq(responses.id, saved!.id))
      throw error
    }
  }

  await responsesChanged(form.id, form.ownerId)
  res.status(201).json({ id: saved!.id })
})

// ---------- POST /public/forms/:slug/uploads : permission to upload one file ----------
// Body: { code? }
// 200 { uploadUrl, publicKey, token, expire, signature, folder, ... }   what the browser sends to ImageKit
// The file goes straight from the browser to storage. It only counts once the form is submitted with it.

const uploadPerVisitor = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? "")}:${String(req.params.slug)}`,
  handler: (_req, res) => {
    res.status(429).json({ error: "Too many uploads. Wait a minute and try again." })
  },
})

const uploadPerForm = rateLimit({
  windowMs: 10 * 60_000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => String(req.params.slug),
  handler: (_req, res) => {
    res.status(429).json({ error: "This form is getting a lot of uploads. Try again in a few minutes." })
  },
})

router.post("/forms/:slug/uploads", uploadPerVisitor, uploadPerForm, async (req, res) => {
  res.set("Cache-Control", "no-store")

  const slug = String(req.params.slug).toLowerCase()
  const body = z.object({ code: z.string().regex(/^\d{4}$/).optional() }).safeParse(req.body ?? {})
  if (!isSlug(slug) || !body.success) {
    res.status(400).json({ error: "Invalid request" })
    return
  }

  const open = await openFor(slug, body.data.code)
  if (!open.ok) {
    res.status(open.error).json({ error: open.message })
    return
  }
  // Only forms that ask for a file can get upload permission
  if (!answerBlocks(open.live).some((b) => b.type === "file_upload")) {
    res.status(400).json({ error: "This form has no file questions." })
    return
  }
  const storage = await storageFor(open.form.ownerId)
  if (!storage) {
    res.status(503).json({ error: "File uploads are turned off for this form." })
    return
  }
  if (storage.source === "platform" && (await platformFilesUsed(open.form.ownerId)) >= PLATFORM_FREE_FILES) {
    res.status(409).json({ error: "This form can't take more uploads right now." })
    return
  }
  res.json({ uploadUrl: "https://upload.imagekit.io/api/v1/files/upload", ...uploadAuth(storage, open.form.id) })
})

export default router
