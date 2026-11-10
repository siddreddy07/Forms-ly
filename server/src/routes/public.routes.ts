import { createHash, timingSafeEqual } from "node:crypto"

import { and, eq } from "drizzle-orm"
import { Router } from "express"
import rateLimit, { ipKeyGenerator } from "express-rate-limit"
import { z } from "zod"

import { db } from "../config/db.js"
import { isSlug } from "../libs/slug.js"
import { formVersions, forms, responses } from "../schema.js"

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

// The frozen copy made at publish, so edits after publishing do not show until published again
async function liveBody(form: Form) {
  const [published] = await db
    .select()
    .from(formVersions)
    .where(and(eq(formVersions.formId, form.id), eq(formVersions.version, form.publishedVersion!)))
  if (!published) return { state: "unpublished" as const }
  return { state: "live" as const, title: form.title, document: published.document, design: form.design, version: published.version }
}

// ---------- GET /public/forms/:slug : the form people fill in ----------
// 404                       no form has this link
// { state: "unpublished" }  not open (unpublished, archived)
// { state: "private" }      the owner made it private
// { state: "live", title, document, design, version }

router.get("/forms/:slug", publicLimiter, async (req, res) => {
  // Access can change at any moment, so nobody should keep an old answer
  res.set("Cache-Control", "no-store")

  const slug = String(req.params.slug).toLowerCase()
  if (!isSlug(slug)) {
    res.status(404).json({ error: "Form not found" })
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
  if (form.access === "private") {
    res.json({ state: "private" })
    return
  }
  res.json(await liveBody(form))
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

const LAYOUT_BLOCKS = new Set(["heading", "paragraph", "divider", "image"])

// One answer, cut down to something safe to store: text, numbers, yes/no, a list of text, or file names and sizes.
function cleanAnswer(value: unknown): unknown {
  if (typeof value === "string") return value.slice(0, 5000)
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined
  if (typeof value === "boolean") return value
  if (Array.isArray(value)) {
    return value
      .slice(0, 100)
      .map((v) => {
        if (typeof v === "string") return v.slice(0, 500)
        if (v && typeof v === "object") {
          const f = v as { name?: unknown; size?: unknown }
          return typeof f.name === "string" ? { name: f.name.slice(0, 200), size: typeof f.size === "number" ? f.size : 0 } : undefined
        }
        return undefined
      })
      .filter((v) => v !== undefined)
  }
  return undefined
}

router.post("/forms/:slug/responses", submitPerVisitor, submitPerForm, async (req, res) => {
  res.set("Cache-Control", "no-store")

  const slug = String(req.params.slug).toLowerCase()
  const body = submitSchema.safeParse(req.body)
  if (!isSlug(slug) || !body.success) {
    res.status(400).json({ error: "Invalid answers" })
    return
  }

  const [form] = await db.select().from(forms).where(eq(forms.slug, slug))
  if (!form) {
    res.status(404).json({ error: "Form not found" })
    return
  }
  if (!isOpen(form)) {
    res.status(409).json({ error: "This form is not open any more." })
    return
  }
  if (form.access === "private" && !(form.accessCode && body.data.code && sameCode(form.accessCode, body.data.code))) {
    res.status(403).json({ error: "Wrong code" })
    return
  }

  const live = await liveBody(form)
  if (live.state !== "live") {
    res.status(409).json({ error: "This form is not open any more." })
    return
  }

  const steps = (live.document as { steps?: { blocks?: unknown[] }[] }).steps ?? []
  const fields = steps
    .flatMap((st) => (Array.isArray(st.blocks) ? st.blocks : []))
    .filter((b): b is { id: string; type: string } => !!b && typeof (b as { id?: unknown }).id === "string" && !LAYOUT_BLOCKS.has(String((b as { type?: unknown }).type)))

  const answers: Record<string, unknown> = {}
  for (const f of fields) {
    const clean = cleanAnswer(body.data.answers[f.id])
    if (clean !== undefined) answers[f.id] = clean
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

  res.status(201).json({ id: saved!.id })
})

export default router
