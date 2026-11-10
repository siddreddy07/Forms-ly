import { randomInt } from "node:crypto"
import { and, count, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm"
import { Router } from "express"
import rateLimit from "express-rate-limit"
import { z } from "zod"

import { db } from "../config/db.js"
import { makeSlug } from "../libs/slug.js"
import { buildAnalytics } from "../libs/analytics.js"
import { formFilterFields, nextFilterFields } from "../libs/filterFields.js"
import type { Block } from "../libs/answers.js"
import { files, formVersions, forms, responses, type Form } from "../schema.js"
import { deleteStoredFile, ownStorage, platformStorage, privateFileUrl } from "../services/storage.js"

const router = Router()

// requireUser is added where this router is mounted (see server.ts), so req.user is always set here

// ---------- Small helpers ----------

// The form builder document (steps, blocks...). We only check its basic shape here.
// The browser has already validated the details.
const documentSchema = z.looseObject({
  version: z.number(),
  steps: z.array(z.looseObject({ id: z.string(), blocks: z.array(z.unknown()) })).min(1),
})

const idSchema = z.uuid()

// The form's look (Design tab). Same shape as FormDesign in the frontend (lib/api/mock-design.ts).
// Link fields are only length-limited here because people type them letter by letter; the page only uses a link once
// it is a valid web address, and anything that shows these to the public must check that again.
const designSchema = z.object({
  background: z
    .object({
      color: z.enum(["red", "orange", "yellow", "green", "blue", "indigo", "violet"]),
      opacity: z.union([z.literal(30), z.literal(60), z.literal(100)]),
    })
    .nullable(),
  font: z.enum(["sans", "serif", "mono"]),
  accent: z.string().regex(/^#[0-9a-f]{6}$/i).nullable(),
  radius: z.enum(["sm", "md", "lg"]),
  width: z.enum(["narrow", "normal", "wide"]),
  thankYou: z.object({
    title: z.string().max(120),
    message: z.string().max(500),
    buttonLabel: z.string().max(40),
    buttonUrl: z.string().max(500),
    redirectUrl: z.string().max(500),
  }),
  hideBadge: z.boolean(),
})

// A small cut-down piece of the form for the dashboard card: the heading and the first few questions, nothing more.
// It is made here so the list does not have to send every form's whole document.
const PREVIEW_BLOCKS = 5

function previewOf(form: Form) {
  const draft = (form.draft ?? {}) as { header?: { title?: unknown; description?: unknown }; steps?: { blocks?: unknown[] }[] }
  const first = Array.isArray(draft.steps) ? draft.steps[0] : undefined
  const blocks = (Array.isArray(first?.blocks) ? first.blocks : []).slice(0, PREVIEW_BLOCKS).map((raw) => {
    const b = (raw ?? {}) as { id?: unknown; type?: unknown; label?: unknown; content?: unknown; options?: { label?: unknown }[] }
    return {
      id: String(b.id ?? ""),
      type: String(b.type ?? ""),
      label: typeof b.label === "string" ? b.label.slice(0, 80) : "",
      content: typeof b.content === "string" ? b.content.slice(0, 120) : "",
      options: Array.isArray(b.options) ? b.options.slice(0, 3).map((o) => (typeof o?.label === "string" ? o.label.slice(0, 40) : "")) : [],
    }
  })
  return {
    title: typeof draft.header?.title === "string" ? draft.header.title.slice(0, 120) : "",
    description: typeof draft.header?.description === "string" ? draft.header.description.slice(0, 160) : "",
    blocks,
    design: form.design,
  }
}

// What we send to the browser for one form (no document, used in lists)
function summary(form: Form, responseCount = 0) {
  return {
    id: form.id,
    title: form.title,
    status: form.status,
    access: form.access,
    slug: form.slug,
    responses: responseCount,
    updatedAt: form.updatedAt,
    archived: form.archivedAt !== null,
    preview: previewOf(form),
  }
}

// A new blank form shows its name as the form heading. Templates keep their own heading.
function withHeaderTitle(document: Record<string, unknown>, name: string) {
  const header = (document.header ?? {}) as { title?: unknown }
  const hasTitle = typeof header.title === "string" && header.title.trim() !== ""
  return hasTitle ? document : { ...document, header: { ...header, title: name } }
}

// Finds one form that belongs to the signed-in user. Someone else's form looks like "not found".
// Is the form live, which link, and has it been edited since it went live?
function publishInfo(form: Form) {
  const published = form.status === "published" && form.publishedVersion !== null
  return {
    published,
    slug: form.slug,
    publishedVersion: published ? form.publishedVersion : null,
    publishedAt: published ? form.publishedAt : null,
    hasChanges: published && form.publishedVersion !== form.version,
    accessCode: form.access === "private" ? form.accessCode : null,
  }
}

// A random 4 digit code, with leading zeros kept ("0042")
function newAccessCode() {
  return String(randomInt(0, 10_000)).padStart(4, "0")
}

// Postgres says 23505 when a unique value is already taken
function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } }
  return e?.code === "23505" || e?.cause?.code === "23505"
}

// Gives the form its public link the first time it is published. Nothing happens if it already has one.
// The database guarantees no two forms share a slug; on the rare clash we try another random ending.
async function claimSlug(form: Form): Promise<void> {
  if (form.slug) return
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await db
        .update(forms)
        .set({ slug: makeSlug(form.title) })
        .where(and(eq(forms.id, form.id), isNull(forms.slug)))
      return
    } catch (error) {
      if (!isUniqueViolation(error)) throw error
    }
  }
  throw new Error("Could not find a free link for this form")
}

async function findOwnForm(userId: string, id: string) {
  if (!idSchema.safeParse(id).success) return undefined
  const [form] = await db
    .select()
    .from(forms)
    .where(and(eq(forms.id, id), eq(forms.ownerId, userId)))
  return form
}

// ---------- GET /forms : all my forms ----------
// ?archived=true shows only the archived ones, ?archived=all shows everything (each has an "archived" flag)

router.get("/", async (req, res) => {
  const which = req.query.archived // "true", "all", or nothing (live forms only)

  const rows = await db
    .select({ form: forms, responseCount: count(responses.id) })
    .from(forms)
    .leftJoin(responses, eq(responses.formId, forms.id))
    .where(
      and(eq(forms.ownerId, req.user!.id), which === "all" ? undefined : which === "true" ? isNotNull(forms.archivedAt) : isNull(forms.archivedAt))
    )
    .groupBy(forms.id)
    .orderBy(desc(forms.updatedAt))

  res.json({ forms: rows.map((r) => summary(r.form, r.responseCount)) })
})

// ---------- POST /forms : create a form ----------
// Body: { title, document }  (title is required)  (the browser sends a blank form or a template)

const createSchema = z.object({
  // Every form must have a name
  title: z.string().trim().min(1, "Name is required").max(200),
  document: documentSchema,
})

router.post("/", async (req, res) => {
  const body = createSchema.safeParse(req.body)
  if (!body.success) {
    res.status(400).json({ error: "Invalid form", details: z.flattenError(body.error) })
    return
  }

  const [form] = await db
    .insert(forms)
    .values({
      ownerId: req.user!.id,
      title: body.data.title,
      draft: withHeaderTitle(body.data.document, body.data.title),
    })
    .returning()

  res.status(201).json({ form: summary(form!) })
})

// ---------- GET /forms/:id : one form with its document ----------

router.get("/:id", async (req, res) => {
  let form = await findOwnForm(req.user!.id, req.params.id)
  if (!form) {
    res.status(404).json({ error: "Form not found" })
    return
  }
  if (form.access === "private" && !form.accessCode) {
    const [fixed] = await db.update(forms).set({ accessCode: newAccessCode() }).where(eq(forms.id, form.id)).returning()
    if (fixed) form = fixed
  }
  res.json({ form: summary(form), document: form.draft, version: form.version, design: form.design, publish: publishInfo(form) })
})

// ---------- PUT /forms/:id : save the document ----------
// Body: { document, baseVersion }
// 200 { version, updatedAt }
// 409 { document, version }  if someone saved a newer version first

const saveSchema = z.object({
  document: documentSchema,
  baseVersion: z.number().int().min(1),
})

// The browser saves automatically while someone edits (about once every few seconds at most).
// This limit stops a buggy or abusive client from hammering the database. It counts per user.
const saveLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: "draft-8", // sends RateLimit headers and Retry-After
  legacyHeaders: false,
  keyGenerator: (req) => req.user!.id,
  handler: (_req, res) => {
    res.status(429).json({ error: "Too many saves. Slow down a little." })
  },
})

router.put("/:id", saveLimiter, async (req, res) => {
  const body = saveSchema.safeParse(req.body)
  if (!body.success) {
    res.status(400).json({ error: "Invalid form", details: z.flattenError(body.error) })
    return
  }

  const userId = req.user!.id
  const id = String(req.params.id)

  // One query that only writes when (1) the version still matches, so two saves can't both win, and
  // (2) the content really changed, so saving the same thing again costs no database write.
  const [saved] = idSchema.safeParse(id).success
    ? await db
        .update(forms)
        .set({
          draft: body.data.document,
          version: sql`${forms.version} + 1`,
        })
        .where(
          and(
            eq(forms.id, id),
            eq(forms.ownerId, userId),
            eq(forms.version, body.data.baseVersion),
            sql`${forms.draft} is distinct from ${JSON.stringify(body.data.document)}::jsonb`
          )
        )
        .returning()
    : []

  if (saved) {
    res.json({ version: saved.version, updatedAt: saved.updatedAt, title: saved.title })
    return
  }

  // Nothing was written: the form is missing, the version was old, or nothing changed
  const current = await findOwnForm(userId, id)
  if (!current) {
    res.status(404).json({ error: "Form not found" })
    return
  }
  if (current.version === body.data.baseVersion) {
    // Same version and same content: already saved, just say so
    res.json({ version: current.version, updatedAt: current.updatedAt, title: current.title })
    return
  }
  res.status(409).json({ document: current.draft, version: current.version, updatedAt: current.updatedAt })
})

// ---------- PATCH /forms/:id : change the name, who can fill it in, or the design ----------
// The Design tab autosaves here, so it shares the save rate limit.

const patchSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    access: z.enum(["public", "private"]),
    design: designSchema,
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nothing to change")

router.patch("/:id", saveLimiter, async (req, res) => {
  const body = patchSchema.safeParse(req.body)
  if (!body.success) {
    res.status(400).json({ error: "Invalid change", details: z.flattenError(body.error) })
    return
  }
  const form = await findOwnForm(req.user!.id, String(req.params.id))
  if (!form) {
    res.status(404).json({ error: "Form not found" })
    return
  }
  // Every switch to private makes a new code (so an old one stops working); going public clears it.
  const changes: Partial<typeof forms.$inferInsert> = { ...body.data }
  if (body.data.access === "private" && (form.access !== "private" || !form.accessCode)) changes.accessCode = newAccessCode()
  if (body.data.access === "public") changes.accessCode = null
  const [updated] = await db.update(forms).set(changes).where(eq(forms.id, form.id)).returning()
  res.json({ form: summary(updated!), publish: publishInfo(updated!) })
})

// ---------- POST /forms/:id/publish : make the saved form live ----------
// Body: { baseVersion }  the saved version the person is looking at.
// 200 { form, publish }  live (the first time it also gets its link; later it is an update)
// 409 { document, version, updatedAt }  the form changed since, nothing was published
// Publishing keeps a frozen copy, so editing afterwards does not change the live form until it is published again.

const publishSchema = z.object({ baseVersion: z.number().int().min(1) })

// Publishing writes a frozen copy of the form, so it gets a tighter limit than ordinary saves. The app also pauses its
// own buttons for a few seconds after each change, so a normal person never gets near this.
const publishLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => req.user!.id,
  handler: (_req, res) => {
    res.status(429).json({ error: "Too many publish changes. Wait a moment." })
  },
})

router.post("/:id/publish", publishLimiter, async (req, res) => {
  const body = publishSchema.safeParse(req.body)
  if (!body.success) {
    res.status(400).json({ error: "Invalid request", details: z.flattenError(body.error) })
    return
  }
  const form = await findOwnForm(req.user!.id, String(req.params.id))
  if (!form) {
    res.status(404).json({ error: "Form not found" })
    return
  }
  if (form.archivedAt) {
    res.status(409).json({ error: "Restore this form before publishing it." })
    return
  }
  if (form.version !== body.data.baseVersion) {
    res.status(409).json({ document: form.draft, version: form.version, updatedAt: form.updatedAt })
    return
  }

  await claimSlug(form)

  // The fields responses can be filtered by, with this version added to what earlier versions had
  const filterFields = await nextFilterFields(form, form.draft)

  const updated = await db.transaction(async (tx) => {
    // The same saved version always has the same content, so a copy that already exists is the right one
    await tx.insert(formVersions).values({ formId: form.id, version: form.version, document: form.draft }).onConflictDoNothing()
    // Only if nobody saved in between; otherwise nothing changes and we answer with a conflict below
    const [row] = await tx
      .update(forms)
      .set({ status: "published", publishedVersion: form.version, publishedAt: new Date(), filterFields })
      .where(and(eq(forms.id, form.id), eq(forms.version, form.version)))
      .returning()
    return row
  })
  if (!updated) {
    const [latest] = await db.select().from(forms).where(eq(forms.id, form.id))
    res.status(409).json({ document: latest?.draft, version: latest?.version, updatedAt: latest?.updatedAt })
    return
  }
  res.json({ form: summary(updated), publish: publishInfo(updated) })
})

// ---------- POST /forms/:id/unpublish : take it offline ----------
// The link stays reserved for this form, so it shows "not open yet" until published again.

router.post("/:id/unpublish", publishLimiter, async (req, res) => {
  const form = await findOwnForm(req.user!.id, String(req.params.id))
  if (!form) {
    res.status(404).json({ error: "Form not found" })
    return
  }
  const [updated] = await db
    .update(forms)
    .set({ status: "draft", publishedVersion: null, publishedAt: null })
    .where(eq(forms.id, form.id))
    .returning()
  res.json({ form: summary(updated!), publish: publishInfo(updated!) })
})

// ---------- POST /forms/:id/duplicate ----------

router.post("/:id/duplicate", async (req, res) => {
  const form = await findOwnForm(req.user!.id, req.params.id)
  if (!form) {
    res.status(404).json({ error: "Form not found" })
    return
  }
  const [copy] = await db
    .insert(forms)
    .values({
      ownerId: form.ownerId,
      title: `${form.title} (copy)`.slice(0, 200),
      draft: form.draft,
      design: form.design,
      settings: form.settings,
      brandKitId: form.brandKitId,
    })
    .returning()
  res.status(201).json({ form: summary(copy!) })
})

// ---------- POST /forms/:id/archive and /restore ----------

for (const action of ["archive", "restore"] as const) {
  router.post(`/:id/${action}`, async (req, res) => {
    const form = await findOwnForm(req.user!.id, req.params.id)
    if (!form) {
      res.status(404).json({ error: "Form not found" })
      return
    }
    const [updated] = await db
      .update(forms)
      .set({ archivedAt: action === "archive" ? new Date() : null })
      .where(eq(forms.id, form.id))
      .returning()
    res.json({ form: summary(updated!) })
  })
}

// ---------- DELETE /forms/:id : delete for good (also deletes its responses) ----------

router.delete("/:id", async (req, res) => {
  const form = await findOwnForm(req.user!.id, req.params.id)
  if (!form) {
    res.status(404).json({ error: "Form not found" })
    return
  }
  await db.delete(forms).where(eq(forms.id, form.id))
  res.status(204).end()
})

// ---------- GET /forms/:id/responses : everything people submitted, newest first ----------
// Used by the Responses tab. Capped so one huge form cannot flood the browser.
// A file answer comes with a link that stops working after an hour (the files are private).

const RESPONSE_CAP = 5000

router.get("/:id/responses", async (req, res) => {
  const form = await findOwnForm(req.user!.id, req.params.id)
  if (!form) {
    res.status(404).json({ error: "Form not found" })
    return
  }
  const rows = await db
    .select({
      id: responses.id,
      formVersion: responses.formVersion,
      fields: responses.fields,
      answers: responses.answers,
      durationMs: responses.durationMs,
      device: responses.device,
      submittedAt: responses.submittedAt,
    })
    .from(responses)
    .where(eq(responses.formId, form.id))
    .orderBy(desc(responses.submittedAt))
    .limit(RESPONSE_CAP)
  const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(responses).where(eq(responses.formId, form.id))

  // Links for the files, keyed by the file's id at the storage
  const links = new Map<string, string>()
  if (rows.length > 0) {
    const stored = await db
      .select()
      .from(files)
      .where(inArray(files.responseId, rows.map((r) => r.id)))
    if (stored.length > 0) {
      const platform = platformStorage()
      const own = stored.some((f) => !f.onPlatform) ? await ownStorage(form.ownerId) : null
      for (const f of stored) {
        const storage = f.onPlatform ? platform : own
        if (storage) links.set(f.providerRef, privateFileUrl(storage, f.filePath))
      }
    }
  }

  const items = rows.map((r) => {
    const answers: Record<string, unknown> = { ...r.answers }
    for (const [key, value] of Object.entries(answers)) {
      if (Array.isArray(value) && value.some((v) => v && typeof v === "object" && "fileId" in v)) {
        answers[key] = value.map((v) => {
          const file = v as { fileId: string; name: string; size: number }
          return { name: file.name, size: file.size, url: links.get(file.fileId) ?? null }
        })
      }
    }
    return { ...r, answers, formId: form.id }
  })

  // The fields the filter panel (and later the AI) can use: current questions plus ones older responses still answer
  res.json({ items, total, publishedAt: form.publishedAt, createdAt: form.createdAt, filterFields: await formFilterFields(form) })
})

// ---------- GET /forms/:id/analytics?range=7|30|all&tz=<minutes> : numbers only ----------
// Counts, averages and a per day series. Never an answer's text, a name, an email or a file name. See libs/analytics.ts.

const ANALYTICS_CAP = 20000

const analyticsQuery = z.object({
  range: z.enum(["7", "30", "all"]).default("30"),
  tz: z.coerce.number().int().min(-840).max(840).default(0),
})

router.get("/:id/analytics", async (req, res) => {
  const query = analyticsQuery.safeParse(req.query)
  const form = query.success ? await findOwnForm(req.user!.id, req.params.id) : undefined
  if (!query.success || !form) {
    res.status(form ? 400 : 404).json({ error: form ? "Invalid request" : "Form not found" })
    return
  }

  // The questions as they are now: the live copy if there is one, otherwise the draft
  let document: unknown = form.draft
  if (form.publishedVersion !== null) {
    const [live] = await db
      .select({ document: formVersions.document })
      .from(formVersions)
      .where(and(eq(formVersions.formId, form.id), eq(formVersions.version, form.publishedVersion)))
    if (live) document = live.document
  }
  const steps = (document as { steps?: { blocks?: unknown[] }[] }).steps ?? []
  const blocks = steps.flatMap((st) => (Array.isArray(st.blocks) ? st.blocks : [])).filter((b): b is Block => !!b && typeof (b as { id?: unknown }).id === "string")

  const rows = await db
    .select({ answers: responses.answers, durationMs: responses.durationMs, submittedAt: responses.submittedAt, device: responses.device })
    .from(responses)
    .where(eq(responses.formId, form.id))
    .orderBy(desc(responses.submittedAt))
    .limit(ANALYTICS_CAP)
  const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(responses).where(eq(responses.formId, form.id))

  res.json(
    buildAnalytics({ rows, blocks, range: query.data.range, tzOffsetMin: query.data.tz, now: Date.now(), publishedAt: form.publishedAt, total })
  )
})

// ---------- DELETE /forms/:id/responses/:rid : remove one response and its files ----------

router.delete("/:id/responses/:rid", async (req, res) => {
  const form = await findOwnForm(req.user!.id, req.params.id)
  if (!form || !idSchema.safeParse(req.params.rid).success) {
    res.status(404).json({ error: "Response not found" })
    return
  }
  const [response] = await db
    .select({ id: responses.id })
    .from(responses)
    .where(and(eq(responses.id, req.params.rid), eq(responses.formId, form.id)))
  if (!response) {
    res.status(204).end()
    return
  }

  // Take the files out of storage first; if that fails the response stays so nothing is left behind
  const stored = await db.select().from(files).where(eq(files.responseId, response.id))
  if (stored.length > 0) {
    const platform = platformStorage()
    const own = stored.some((f) => !f.onPlatform) ? await ownStorage(form.ownerId) : null
    try {
      for (const f of stored) {
        const storage = f.onPlatform ? platform : own
        if (storage) await deleteStoredFile(storage, f.providerRef)
      }
    } catch (error) {
      console.error(error)
      res.status(502).json({ error: "Couldn't remove the files. Try again." })
      return
    }
  }
  await db.delete(responses).where(eq(responses.id, response.id))
  res.status(204).end()
})

export default router
