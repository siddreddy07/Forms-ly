import { and, asc, desc, eq } from "drizzle-orm"

import { db } from "../config/db.js"
import { formVersions, forms, responses, type Form } from "../schema.js"
import { LAYOUT_BLOCKS, type Block } from "./answers.js"

// The fields a form's responses can be filtered by.
//
// The list is kept on the form (forms.filter_fields) and updated whenever a version is published, which is the only
// moment the questions responses can hold change. So asking for it never has to look through the responses.
//
// A form is edited many times, and every response keeps the questions as they were when it was sent. So the list is
// built from the form as it is now AND from every version that has responses: a question that was deleted later can
// still be filtered on, because old responses still hold its answers. The newest definition of a question wins, and
// the options of choice questions are merged, so an option that was renamed or removed still matches old answers.
//
// Only fields with a clear yes/no comparison are listed ("decidable"). Long free text is left out: a keyword in a
// paragraph is better found with the search box. This list is what the filter panel shows and what the AI is allowed
// to filter on (tools/filterTool.ts builds its schema from it).

export type FilterKind = "text" | "number" | "rating" | "date" | "time" | "choice" | "yes_no" | "file"

const KIND: Record<string, FilterKind> = {
  short_text: "text",
  email: "text",
  phone: "text",
  url: "text",
  number: "number",
  rating: "rating",
  scale: "rating",
  date: "date",
  time: "time",
  single_choice: "choice",
  dropdown: "choice",
  multiple_choice: "choice",
  yes_no: "yes_no",
  file_upload: "file",
}

export type FilterField = {
  id: string
  label: string
  type: string
  kind: FilterKind
  options: { id: string; label: string }[]
  scale: { min: number; max: number } | null
  // Is it still in the form that is live now? false: it was removed, but older responses have answers to it.
  current: boolean
}

export const filterKindOf = (type: string): FilterKind | null => (LAYOUT_BLOCKS.has(type) ? null : (KIND[type] ?? null))

// Folds one version's questions into the map of fields. The newest definition wins.
function foldBlocks(out: Map<string, FilterField>, blocks: Block[], currentIds: Set<string>) {
  for (const b of blocks) {
    if (!b || typeof b.id !== "string") continue
    const kind = filterKindOf(String(b.type))
    if (!kind) {
      // If a question changed into something that cannot be filtered, it stops being offered
      out.delete(b.id)
      continue
    }
    const before = out.get(b.id)
    const options = new Map((before?.options ?? []).map((o) => [o.id, o]))
    for (const o of b.options ?? []) options.set(o.id, { id: o.id, label: (o.label ?? before?.options.find((x) => x.id === o.id)?.label ?? "").slice(0, 80) })

    const min = b.scale?.min ?? 1
    const max = b.scale?.max ?? 5
    out.set(b.id, {
      id: b.id,
      label: (b.label || before?.label || "Untitled question").slice(0, 120),
      type: String(b.type),
      kind,
      options: [...options.values()],
      // The widest scale seen, so a rating from before the scale changed still fits
      scale: kind === "rating" ? { min: Math.min(min, before?.scale?.min ?? min), max: Math.max(max, before?.scale?.max ?? max) } : null,
      current: currentIds.has(b.id),
    })
  }
}

// A choice question with no options at all cannot be filtered
const usable = (out: Map<string, FilterField>) => [...out.values()].filter((f) => f.kind !== "choice" || f.options.length > 0)

// Builds the list from scratch: the questions of several versions, oldest first, then the live ones
export function mergeFilterFields(versions: Block[][], current: Block[]): FilterField[] {
  const out = new Map<string, FilterField>()
  const currentIds = new Set(current.map((b) => b.id))
  for (const blocks of [...versions, current]) foldBlocks(out, blocks, currentIds)
  return usable(out)
}

// Adds a newly published version to a list that already exists. Everything not in this version becomes "removed".
export function updateFilterFields(stored: FilterField[], live: Block[]): FilterField[] {
  const out = new Map(stored.map((f) => [f.id, { ...f, current: false }]))
  foldBlocks(out, live, new Set(live.map((b) => b.id)))
  return usable(out)
}

const blocksOf = (document: unknown): Block[] => {
  const steps = (document as { steps?: { blocks?: unknown[] }[] } | null)?.steps ?? []
  return steps.flatMap((s) => (Array.isArray(s.blocks) ? s.blocks : [])).filter((b): b is Block => !!b && typeof (b as { id?: unknown }).id === "string")
}

// Rebuilds the list from the stored responses: one row is read per form version, not one per response. Only used the
// first time for a form that was published before the list was kept, and by tests.
async function scanFilterFields(form: Form, live: Block[]): Promise<FilterField[]> {
  const perVersion = await db
    .selectDistinctOn([responses.formVersion], { version: responses.formVersion, fields: responses.fields })
    .from(responses)
    .where(eq(responses.formId, form.id))
    .orderBy(asc(responses.formVersion), desc(responses.submittedAt))
  return mergeFilterFields(
    perVersion.map((v) => (Array.isArray(v.fields) ? (v.fields as Block[]).filter((b) => !!b && typeof b.id === "string") : [])),
    live
  )
}

async function liveBlocks(form: Form): Promise<Block[]> {
  let document: unknown = form.draft
  if (form.publishedVersion !== null) {
    const [live] = await db
      .select({ document: formVersions.document })
      .from(formVersions)
      .where(and(eq(formVersions.formId, form.id), eq(formVersions.version, form.publishedVersion)))
    if (live) document = live.document
  }
  return blocksOf(document)
}

const isList = (v: unknown): v is FilterField[] => Array.isArray(v)

// Called when a version is published: the list to save with it. Starts from the saved list, or from the stored
// responses if this form was published before the list was kept.
export async function nextFilterFields(form: Form, publishedDocument: unknown): Promise<FilterField[]> {
  const live = blocksOf(publishedDocument)
  const stored = isList(form.filterFields) ? form.filterFields : await scanFilterFields(form, [])
  return updateFilterFields(stored, live)
}

// Every question a response can answer, for the Responses table headers and the CSV export: the questions of each
// version that has responses (newest first), then any question the form has now that they miss. Unlike the filter
// list, long text is included: it cannot be filtered on, but it is still a column.
export async function responseColumns(form: Form): Promise<Block[]> {
  const perVersion = await db
    .selectDistinctOn([responses.formVersion], { fields: responses.fields })
    .from(responses)
    .where(eq(responses.formId, form.id))
    .orderBy(desc(responses.formVersion), desc(responses.submittedAt))

  const out = new Map<string, Block>()
  const add = (block: Block) => {
    if (!block || typeof block.id !== "string" || LAYOUT_BLOCKS.has(String(block.type)) || out.has(block.id)) return
    out.set(block.id, block)
  }
  for (const row of perVersion) {
    for (const block of Array.isArray(row.fields) ? (row.fields as Block[]) : []) add(block)
  }
  for (const block of await liveBlocks(form)) add(block)
  return [...out.values()]
}

// The fields for one form. A plain lookup of the saved list. A form published before the list existed has it built
// once from its responses and saved. A form that was never published is worked out from its draft and not saved,
// because a draft changes all the time and nothing can be filtered yet.
export async function formFilterFields(form: Form): Promise<FilterField[]> {
  if (isList(form.filterFields)) return form.filterFields
  const live = await liveBlocks(form)
  const built = await scanFilterFields(form, live)
  if (form.publishedVersion !== null) {
    // Keep the form's "last edited" time as it was: this is not an edit
    await db.update(forms).set({ filterFields: built, updatedAt: form.updatedAt }).where(eq(forms.id, form.id))
  }
  return built
}
