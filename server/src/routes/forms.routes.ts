import { randomInt } from "node:crypto"
import { and, asc, count, desc, eq, ilike, inArray, isNotNull, isNull, sql, type SQL } from "drizzle-orm"
import { Router } from "express"
import rateLimit from "express-rate-limit"
import { z } from "zod"

import { db } from "../config/db.js"
import { makeSlug } from "../libs/slug.js"
import { buildAnalytics } from "../libs/analytics.js"
import { formFilterFields, nextFilterFields, responseColumns } from "../libs/filterFields.js"
import { formSettingsSchema, settingsChanged, settingsOf, withPublishedSnapshot } from "../libs/formSettings.js"
import type { Block } from "../libs/answers.js"
import { decodeCursor, encodeCursor } from "../libs/paging.js"
import { answerText, csvLine } from "../libs/csv.js"
import { parseResponseFilter, responseFilterSchema, responseFilterWhere, responseSearchWhere } from "../libs/responseFilter.js"
import { files, formVersions, forms, responses, responseViews, type Form } from "../schema.js"
import { bump, cacheKeys, cached, formChanged, responsesChanged, TTL, version } from "../services/cache.js"
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
    /* Settings (closing date, and so on) are published too, so they can leave the live form behind. */
    hasChanges: published && (form.publishedVersion !== form.version || settingsChanged(form)),
    accessCode: form.access === "private" ? form.accessCode : null,
    useAI: form.useAi,
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

// ---------- GET /forms : my forms, one page at a time ----------
// ?archived=true shows only the archived ones, ?archived=all shows everything (each has an "archived" flag).
// ?q= searches the names, ?sort=recent|name|responses, ?status=draft|published|closed.
// ?limit= (1-100, default 24) and ?cursor= (the nextCursor of the page before) page through the list.
// Answers { forms, total, nextCursor, counts }. total is for the current search and filters; counts is for the two
// tabs (live and archived) and does not change with the search.

const formsQuery = z.object({
  archived: z.enum(["true", "all"]).optional(),
  status: z.enum(["draft", "published", "closed"]).optional(),
  q: z.string().trim().max(200).optional(),
  sort: z.enum(["recent", "name", "responses"]).default("recent"),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  cursor: z.string().max(400).optional(),
})

// Keeps % and _ literal in a LIKE pattern
const likeTerm = (q: string) => `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`

router.get("/", async (req, res) => {
  const query = formsQuery.safeParse(req.query)
  if (!query.success) {
    res.status(400).json({ error: "Invalid request", details: z.flattenError(query.error) })
    return
  }
  const { archived, status, q, sort, limit } = query.data

  const cursor = query.data.cursor ? decodeCursor(query.data.cursor, sort) : null
  if (query.data.cursor && !cursor) {
    res.status(400).json({ error: "Invalid cursor" })
    return
  }

  const userId = req.user!.id
  const userVersion = await version(cacheKeys.userVersion(userId))
  const cacheKey = cacheKeys.formList(
    userId,
    userVersion,
    JSON.stringify([archived ?? "", status ?? "", q ?? "", sort, limit, query.data.cursor ?? ""])
  )

  const payload = await cached(cacheKey, TTL.formList, async () => {
    const filter = and(
      eq(forms.ownerId, userId),
      archived === "all" ? undefined : archived === "true" ? isNotNull(forms.archivedAt) : isNull(forms.archivedAt),
      status ? eq(forms.status, status) : undefined,
      q ? ilike(forms.title, likeTerm(q)) : undefined
    )

    // How many responses each form has. A subquery, so the list itself needs no join or grouping.
    // "forms"."id" is written out because the list's own columns are not table-qualified in a single-table query, and
    // the subquery would otherwise read responses.id (which also exists).
    const responseCount = sql<number>`(select count(*)::int from ${responses} where ${responses.formId} = "forms"."id")`

    // The last row of the previous page. The id breaks ties, so two forms edited in the same second still page correctly.
    let after: SQL | undefined
    if (cursor) {
      if (sort === "name") after = sql`(lower(${forms.title}), ${forms.id}) > (lower(${String(cursor.v)}), ${cursor.id}::uuid)`
      else if (sort === "responses") after = sql`(${responseCount}, ${forms.id}) < (${Number(cursor.v)}, ${cursor.id}::uuid)`
      else {
        const at = new Date(String(cursor.v))
        after = Number.isNaN(at.getTime()) ? sql`false` : sql`(${forms.updatedAt}, ${forms.id}) < (${at}, ${cursor.id}::uuid)`
      }
    }

    const order =
      sort === "name"
        ? [asc(sql`lower(${forms.title})`), asc(forms.id)]
        : sort === "responses"
          ? [desc(responseCount), desc(forms.id)]
          : [desc(forms.updatedAt), desc(forms.id)]

    const rows = await db
      .select({ form: forms, responseCount })
      .from(forms)
      .where(and(filter, after))
      .orderBy(...order)
      // One extra row tells us whether there is another page, without a second query
      .limit(limit + 1)

    const page = rows.slice(0, limit)
    const last = page.at(-1)
    const nextCursor =
      rows.length > limit && last
        ? encodeCursor({
            s: sort,
            v: sort === "recent" ? last.form.updatedAt.toISOString() : sort === "name" ? last.form.title : last.responseCount,
            id: last.form.id,
          })
        : null

    const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(forms).where(filter)

    // The two tab counts. They ignore the search and status on purpose, so the tabs always show the real totals.
    const [counts] = await db
      .select({
        all: sql<number>`count(*) filter (where ${forms.archivedAt} is null)`.mapWith(Number),
        archived: sql<number>`count(*) filter (where ${forms.archivedAt} is not null)`.mapWith(Number),
      })
      .from(forms)
      .where(eq(forms.ownerId, userId))

    return { forms: page.map((r) => summary(r.form, r.responseCount)), total, nextCursor, counts: counts ?? { all: 0, archived: 0 } }
  })

  res.json(payload)
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

  await bump(cacheKeys.userVersion(req.user!.id))
  res.status(201).json({ form: summary(form!) })
})

// ---------- GET /forms/:id : one form with its document ----------

router.get("/:id", async (req, res) => {
  const userId = req.user!.id
  const id = String(req.params.id)
  if (!idSchema.safeParse(id).success) {
    res.status(404).json({ error: "Form not found" })
    return
  }
  const formVersion = await version(cacheKeys.formVersion(id))
  const payload = await cached(cacheKeys.form(userId, id, formVersion), TTL.form, async () => {
    let form = await findOwnForm(userId, id)
    if (!form) return null
    if (form.access === "private" && !form.accessCode) {
      const [fixed] = await db.update(forms).set({ accessCode: newAccessCode() }).where(eq(forms.id, form.id)).returning()
      if (fixed) form = fixed
    }
    return {
      form: summary(form),
      document: form.draft,
      version: form.version,
      design: form.design,
      publish: publishInfo(form),
      settings: settingsOf(form),
    }
  })
  if (!payload) {
    res.status(404).json({ error: "Form not found" })
    return
  }
  res.json(payload)
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
    await formChanged(saved.id, userId, saved.slug)
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
    useAI: z.boolean(),
    design: designSchema,
    settings: formSettingsSchema,
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
  const { useAI, settings, ...rest } = body.data
  const changes: Partial<typeof forms.$inferInsert> = { ...rest }
  if (useAI !== undefined) changes.useAi = useAI
  /* Saving a setting keeps the last published copy, so the form can show it has something to publish. */
  if (settings !== undefined) changes.settings = withPublishedSnapshot(form, { ...settingsOf(form), ...settings })
  if (body.data.access === "private" && (form.access !== "private" || !form.accessCode)) changes.accessCode = newAccessCode()
  if (body.data.access === "public") changes.accessCode = null
  const [updated] = await db.update(forms).set(changes).where(eq(forms.id, form.id)).returning()
  await formChanged(updated!.id, req.user!.id, updated!.slug)
  res.json({ form: summary(updated!), publish: publishInfo(updated!), settings: settingsOf(updated!) })
})

// ---------- POST /forms/:id/publish : make the saved form live ----------
// Body: { baseVersion, useAI }  the saved version the person is looking at, and whether AI features are on.
// 200 { form, publish }  live (the first time it also gets its link; later it is an update)
// 409 { document, version, updatedAt }  the form changed since, nothing was published
// Publishing keeps a frozen copy, so editing afterwards does not change the live form until it is published again.

// useAI is sent with every publish; if an old app leaves it out, the saved choice stays as it was
const publishSchema = z.object({ baseVersion: z.number().int().min(1), useAI: z.boolean().optional() })

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
    // Settings are saved separately from the document version, so take the newest copy now and make it the live one.
    const [latest] = await tx.select({ settings: forms.settings }).from(forms).where(eq(forms.id, form.id))
    const publishedSettings = settingsOf(latest ?? form)
    // The same saved version always has the same content, so a copy that already exists is the right one
    await tx.insert(formVersions).values({ formId: form.id, version: form.version, document: form.draft }).onConflictDoNothing()
    // Only if nobody saved in between; otherwise nothing changes and we answer with a conflict below
    const [row] = await tx
      .update(forms)
      .set({
        status: "published",
        publishedVersion: form.version,
        publishedAt: new Date(),
        filterFields,
        useAi: body.data.useAI ?? form.useAi,
        /* Merge, so a settings change saved while we were publishing is kept (and stays unpublished). */
        settings: sql`${forms.settings} || ${JSON.stringify({ published: publishedSettings })}::jsonb`,
      })
      .where(and(eq(forms.id, form.id), eq(forms.version, form.version)))
      .returning()
    return row
  })
  if (!updated) {
    const [latest] = await db.select().from(forms).where(eq(forms.id, form.id))
    res.status(409).json({ document: latest?.draft, version: latest?.version, updatedAt: latest?.updatedAt })
    return
  }
  await formChanged(updated.id, req.user!.id, updated.slug)
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
  await formChanged(updated!.id, req.user!.id, updated!.slug)
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
      /* A copy starts as a draft, so it has no published settings yet. */
      settings: settingsOf(form),
      brandKitId: form.brandKitId,
    })
    .returning()
  await bump(cacheKeys.userVersion(req.user!.id))
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
    await formChanged(updated!.id, req.user!.id, updated!.slug)
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
  await formChanged(form.id, req.user!.id, form.slug)
  res.status(204).end()
})

// ---------- GET /forms/:id/responses : what people submitted, newest first, one page at a time ----------
// ?limit= (1-200, default 50), ?cursor= (the nextCursor of the page before), ?q= (a word in any answer),
// ?filter= (the filter panel's filter, as JSON; see libs/responseFilter.ts).
// The filter, search and date range are applied in the database, so total and the pages always agree.
// A file answer comes with a link that stops working after an hour (the files are private).
// Answers { items, total, nextCursor, allTotal, columns, publishedAt, createdAt, filterFields }.

const responsesQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().max(400).optional(),
  q: z.string().trim().max(200).optional(),
  filter: z.string().max(5000).optional(),
})

// The pieces every responses read shares: the form's questions and the rows the filter and search keep.
async function responsesScope(form: Form, q: string | undefined, filterRaw: unknown) {
  const filter = parseResponseFilter(filterRaw)
  if (filter === null) return { ok: false as const }
  const filterFields = await formFilterFields(form)
  const columns = await responseColumns(form)
  const where = and(eq(responses.formId, form.id), responseSearchWhere(q ?? "", columns), filter ? responseFilterWhere(filter, filterFields) : undefined)
  return { ok: true as const, filterFields, columns, where }
}

router.get("/:id/responses", async (req, res) => {
  const userId = req.user!.id
  const formId = String(req.params.id)
  if (!idSchema.safeParse(formId).success) {
    res.status(404).json({ error: "Form not found" })
    return
  }
  const query = responsesQuery.safeParse(req.query)
  if (!query.success) {
    res.status(400).json({ error: "Invalid request", details: z.flattenError(query.error) })
    return
  }
  const { limit, q } = query.data
  if (parseResponseFilter(query.data.filter) === null) {
    res.status(400).json({ error: "Invalid filter" })
    return
  }

  const cursor = query.data.cursor ? decodeCursor(query.data.cursor, "responses") : null
  if (query.data.cursor && !cursor) {
    res.status(400).json({ error: "Invalid cursor" })
    return
  }

  const formVersion = await version(cacheKeys.formVersion(formId))
  const responsesVersion = await version(cacheKeys.responsesVersion(formId))
  const cacheKey = cacheKeys.responses(
    userId,
    formId,
    formVersion,
    responsesVersion,
    JSON.stringify([limit, query.data.cursor ?? "", q ?? "", query.data.filter ?? ""])
  )

  const payload = await cached(cacheKey, TTL.responses, async () => {
    const form = await findOwnForm(userId, formId)
    if (!form) return null
    const scope = await responsesScope(form, q, query.data.filter)
    if (!scope.ok) return null

    const after = cursor
      ? sql`(${responses.submittedAt}, ${responses.id}) < (${new Date(String(cursor.v))}, ${cursor.id}::uuid)`
      : undefined

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
      .where(and(scope.where, after))
      .orderBy(desc(responses.submittedAt), desc(responses.id))
      // One extra row tells us whether there is another page
      .limit(limit + 1)

    const page = rows.slice(0, limit)
    const last = page.at(-1)
    const nextCursor = rows.length > limit && last ? encodeCursor({ s: "responses", v: last.submittedAt.toISOString(), id: last.id }) : null

    const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(responses).where(scope.where)
    const [{ total: allTotal } = { total: 0 }] = await db.select({ total: count() }).from(responses).where(eq(responses.formId, form.id))

    // Links for the files, keyed by the file's id at the storage
    const links = new Map<string, string>()
    if (page.length > 0) {
      const stored = await db
        .select()
        .from(files)
        .where(inArray(files.responseId, page.map((r) => r.id)))
      if (stored.length > 0) {
        const platform = platformStorage()
        const own = stored.some((f) => !f.onPlatform) ? await ownStorage(form.ownerId) : null
        for (const f of stored) {
          const storage = f.onPlatform ? platform : own
          if (storage) links.set(f.providerRef, privateFileUrl(storage, f.filePath))
        }
      }
    }

    const items = page.map((r) => {
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

    return {
      items,
      total,
      allTotal,
      nextCursor,
      columns: scope.columns,
      publishedAt: form.publishedAt,
      createdAt: form.createdAt,
      filterFields: scope.filterFields,
    }
  })

  if (!payload) {
    res.status(404).json({ error: "Form not found" })
    return
  }
  res.json(payload)
})

// ---------- GET /forms/:id/responses/export.csv : every response, ignoring pages ----------
// Same ?q= and ?filter= as the table, so the file holds exactly what the table is showing. Streamed in batches so a
// form with many responses never has to fit in memory.

const EXPORT_BATCH = 1000

router.get("/:id/responses/export.csv", async (req, res) => {
  const form = await findOwnForm(req.user!.id, String(req.params.id))
  if (!form) {
    res.status(404).json({ error: "Form not found" })
    return
  }
  const query = z
    .object({ q: z.string().trim().max(200).optional(), filter: z.string().max(5000).optional() })
    .safeParse(req.query)
  if (!query.success) {
    res.status(400).json({ error: "Invalid request" })
    return
  }
  const scope = await responsesScope(form, query.data.q, query.data.filter)
  if (!scope.ok) {
    res.status(400).json({ error: "Invalid filter" })
    return
  }

  const name = (form.slug ?? form.id).replace(/[^a-z0-9_-]/gi, "-")
  res.setHeader("Content-Type", "text/csv; charset=utf-8")
  res.setHeader("Content-Disposition", `attachment; filename="${name}.csv"`)
  res.setHeader("Cache-Control", "no-store")

  // Waits when the browser is reading slower than we write, so a big export does not pile up in memory
  const write = (chunk: string) =>
    new Promise<void>((resolve, reject) => {
      if (res.write(chunk)) return resolve()
      const onDrain = () => {
        res.off("error", onError)
        resolve()
      }
      const onError = (error: Error) => {
        res.off("drain", onDrain)
        reject(error)
      }
      res.once("drain", onDrain)
      res.once("error", onError)
    })

  try {
    await write(`\uFEFF${csvLine(["Submitted", ...scope.columns.map((c) => c.label || "Untitled question")])}`)

    // The rows after the last batch. Typed on purpose: the loop below feeds it back in.
    const afterCursor = (at: { v: string; id: string } | null): SQL | undefined =>
      at ? sql`(${responses.submittedAt}, ${responses.id}) < (${new Date(at.v)}, ${at.id}::uuid)` : undefined

    let cursor: { v: string; id: string } | null = null
    for (;;) {
      const after = afterCursor(cursor)
      const rows = await db
        .select({ id: responses.id, answers: responses.answers, submittedAt: responses.submittedAt })
        .from(responses)
        .where(and(scope.where, after))
        .orderBy(desc(responses.submittedAt), desc(responses.id))
        .limit(EXPORT_BATCH)

      for (const row of rows) {
        await write(csvLine([row.submittedAt.toISOString(), ...scope.columns.map((c) => answerText(c, row.answers[c.id]))]))
      }
      if (rows.length < EXPORT_BATCH) break
      const last = rows[rows.length - 1]!
      cursor = { v: last.submittedAt.toISOString(), id: last.id }
    }
    res.end()
  } catch (error) {
    // The visitor closed the tab, or the database failed part way. Nothing more can be sent.
    console.error(error)
    res.end()
  }
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
  if (!query.success) {
    res.status(400).json({ error: "Invalid request" })
    return
  }
  const userId = req.user!.id
  const formId = String(req.params.id)
  if (!idSchema.safeParse(formId).success) {
    res.status(404).json({ error: "Form not found" })
    return
  }

  const formVersion = await version(cacheKeys.formVersion(formId))
  const responsesVersion = await version(cacheKeys.responsesVersion(formId))
  const cacheKey = cacheKeys.analytics(userId, formId, formVersion, responsesVersion, JSON.stringify([query.data.range, query.data.tz]))

  const payload = await cached(cacheKey, TTL.analytics, async () => {
    const form = await findOwnForm(userId, formId)
    if (!form) return null

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

    return buildAnalytics({ rows, blocks, range: query.data.range, tzOffsetMin: query.data.tz, now: Date.now(), publishedAt: form.publishedAt, total })
  })

  if (!payload) {
    res.status(404).json({ error: "Form not found" })
    return
  }
  res.json(payload)
})

// ---------- GET and PUT /forms/:id/responses/view : the search and filter this user last used on this form ----------
// So the Responses tab opens the way they left it, on any device. One row per user and form; it goes when either does.
// GET answers { query, filter } ({ query: "", filter: null } if nothing was saved).
// PUT body { query, filter } (filter null clears it). Answers 204.

const viewSchema = z.object({ query: z.string().trim().max(200), filter: responseFilterSchema.nullable() })

router.get("/:id/responses/view", async (req, res) => {
  const form = await findOwnForm(req.user!.id, String(req.params.id))
  if (!form) {
    res.status(404).json({ error: "Form not found" })
    return
  }
  const [row] = await db
    .select({ query: responseViews.query, filter: responseViews.filter })
    .from(responseViews)
    .where(and(eq(responseViews.userId, req.user!.id), eq(responseViews.formId, form.id)))
  res.set("Cache-Control", "no-store")
  res.json({ query: row?.query ?? "", filter: row?.filter ?? null })
})

router.put("/:id/responses/view", saveLimiter, async (req, res) => {
  const form = await findOwnForm(req.user!.id, String(req.params.id))
  if (!form) {
    res.status(404).json({ error: "Form not found" })
    return
  }
  const body = viewSchema.safeParse(req.body)
  if (!body.success) {
    res.status(400).json({ error: "Invalid request", details: z.flattenError(body.error) })
    return
  }
  await db
    .insert(responseViews)
    .values({ userId: req.user!.id, formId: form.id, query: body.data.query, filter: body.data.filter })
    .onConflictDoUpdate({ target: [responseViews.userId, responseViews.formId], set: { query: body.data.query, filter: body.data.filter } })
  res.status(204).end()
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
  await responsesChanged(form.id, form.ownerId)
  res.status(204).end()
})

export default router
