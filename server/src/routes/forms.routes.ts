import { and, count, desc, eq, isNotNull, isNull, sql } from "drizzle-orm"
import { Router } from "express"
import { z } from "zod"

import { db } from "../config/db.js"
import { forms, responses, type Form } from "../schema.js"

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

// What we send to the browser for one form (no document, used in lists)
function summary(form: Form, responseCount = 0) {
  return {
    id: form.id,
    title: form.title,
    status: form.status,
    access: form.access,
    responses: responseCount,
    updatedAt: form.updatedAt,
    archived: form.archivedAt !== null,
  }
}

// The title shown in lists follows the title typed into the form header
function titleFrom(document: Record<string, unknown>): string | undefined {
  const header = document.header as { title?: unknown } | undefined
  const title = typeof header?.title === "string" ? header.title.trim() : ""
  return title ? title.slice(0, 200) : undefined
}

// Finds one form that belongs to the signed-in user. Someone else's form looks like "not found".
async function findOwnForm(userId: string, id: string) {
  if (!idSchema.safeParse(id).success) return undefined
  const [form] = await db
    .select()
    .from(forms)
    .where(and(eq(forms.id, id), eq(forms.ownerId, userId)))
  return form
}

// ---------- GET /forms : all my forms ----------
// ?archived=true shows the archived ones instead

router.get("/", async (req, res) => {
  const archived = req.query.archived === "true"

  const rows = await db
    .select({ form: forms, responseCount: count(responses.id) })
    .from(forms)
    .leftJoin(responses, eq(responses.formId, forms.id))
    .where(and(eq(forms.ownerId, req.user!.id), archived ? isNotNull(forms.archivedAt) : isNull(forms.archivedAt)))
    .groupBy(forms.id)
    .orderBy(desc(forms.updatedAt))

  res.json({ forms: rows.map((r) => summary(r.form, r.responseCount)) })
})

// ---------- POST /forms : create a form ----------
// Body: { title?, document }  (the browser sends a blank form or a template)

const createSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
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
      title: body.data.title ?? titleFrom(body.data.document) ?? "Untitled form",
      draft: body.data.document,
    })
    .returning()

  res.status(201).json({ form: summary(form!) })
})

// ---------- GET /forms/:id : one form with its document ----------

router.get("/:id", async (req, res) => {
  const form = await findOwnForm(req.user!.id, req.params.id)
  if (!form) {
    res.status(404).json({ error: "Form not found" })
    return
  }
  res.json({ form: summary(form), document: form.draft, version: form.version })
})

// ---------- PUT /forms/:id : save the document ----------
// Body: { document, baseVersion }
// 200 { version, updatedAt }
// 409 { document, version }  if someone saved a newer version first

const saveSchema = z.object({
  document: documentSchema,
  baseVersion: z.number().int().min(1),
})

router.put("/:id", async (req, res) => {
  const body = saveSchema.safeParse(req.body)
  if (!body.success) {
    res.status(400).json({ error: "Invalid form", details: z.flattenError(body.error) })
    return
  }

  const userId = req.user!.id
  const id = req.params.id

  // Only saves when the version still matches. Doing it in one query means two saves can't both win.
  const [saved] = idSchema.safeParse(id).success
    ? await db
        .update(forms)
        .set({
          draft: body.data.document,
          version: sql`${forms.version} + 1`,
          ...(titleFrom(body.data.document) ? { title: titleFrom(body.data.document)! } : {}),
        })
        .where(and(eq(forms.id, id), eq(forms.ownerId, userId), eq(forms.version, body.data.baseVersion)))
        .returning()
    : []

  if (saved) {
    res.json({ version: saved.version, updatedAt: saved.updatedAt, title: saved.title })
    return
  }

  // Not saved: the form is missing, or the version was old
  const current = await findOwnForm(userId, id)
  if (!current) {
    res.status(404).json({ error: "Form not found" })
    return
  }
  res.status(409).json({ document: current.draft, version: current.version, updatedAt: current.updatedAt })
})

// ---------- PATCH /forms/:id : change the title or who can fill it in ----------

const patchSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    access: z.enum(["public", "private"]),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nothing to change")

router.patch("/:id", async (req, res) => {
  const body = patchSchema.safeParse(req.body)
  if (!body.success) {
    res.status(400).json({ error: "Invalid change", details: z.flattenError(body.error) })
    return
  }
  const form = await findOwnForm(req.user!.id, req.params.id)
  if (!form) {
    res.status(404).json({ error: "Form not found" })
    return
  }
  const [updated] = await db.update(forms).set(body.data).where(eq(forms.id, form.id)).returning()
  res.json({ form: summary(updated!) })
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

export default router
