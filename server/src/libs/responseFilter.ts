import { and, eq, or, sql, type SQL } from "drizzle-orm"
import { z } from "zod"

import type { Block } from "./answers.js"
import type { FilterField, FilterKind } from "./filterFields.js"
import { responses } from "../schema.js"

// The filter for the Responses table, applied in the database so pages and counts always agree.
//
// The shape is the same one the filter panel builds in the browser (client lib/responses/filter.ts) and the one the AI
// tool fills in (tools/filterTool.ts). Keep the three in step.
//
// Answers live in one jsonb column (`answers`, keyed by question id). The comparisons below read them with jsonb
// operators, so a filter narrows the rows before anything is sent to the browser.

export const filterOps = ["contains", "is", "is_not", "any_of", "gt", "lt", "between", "empty", "not_empty"] as const
export type FilterOp = (typeof filterOps)[number]

export const conditionSchema = z.object({
  questionId: z.string().max(100),
  op: z.enum(filterOps),
  values: z.array(z.union([z.string().max(500), z.number(), z.boolean()])).max(20),
})

export const responseFilterSchema = z.object({
  match: z.enum(["all", "any"]),
  dateRange: z.enum(["7", "30", "90"]).nullable(),
  device: z.enum(["phone", "tablet", "desktop"]).nullable(),
  conditions: z.array(conditionSchema).max(10),
})

export type ResponseFilter = z.infer<typeof responseFilterSchema>
export type FilterCondition = z.infer<typeof conditionSchema>

// The comparisons that make sense for each kind of question, the same list the panel offers.
const OPS: Record<FilterKind, readonly FilterOp[]> = {
  text: ["contains", "is", "is_not", "empty", "not_empty"],
  number: ["is", "gt", "lt", "between", "empty"],
  rating: ["is", "gt", "lt", "between", "empty"],
  date: ["is", "gt", "lt", "empty"],
  time: ["is", "gt", "lt", "empty"],
  choice: ["any_of", "empty"],
  yes_no: ["is"],
  file: ["not_empty", "empty"],
}

// undefined: no filter was sent. null: the filter is malformed (the route answers 400).
export function parseResponseFilter(raw: unknown): ResponseFilter | null | undefined {
  if (raw === undefined || raw === "") return undefined
  if (typeof raw !== "string" || raw.length > 5000) return null
  try {
    const parsed = responseFilterSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

const likeTerm = (value: string) => `%${value.replace(/[\\%_]/g, (m) => `\\${m}`)}%`

// One answer, as jsonb, and as plain text (null for arrays and objects)
const answer = (id: string) => sql`(${responses.answers} -> ${id})`
const answerText = (id: string) => sql`(${responses.answers} ->> ${id})`
const answerType = (id: string) => sql`jsonb_typeof(${responses.answers} -> ${id})`

// Not answered: missing, null, empty text, or an empty list
const blank = (id: string) =>
  sql`(${answer(id)} is null or ${answer(id)} = 'null'::jsonb or ${answerText(id)} = '' or (${answerType(id)} = 'array' and jsonb_array_length(${answer(id)}) = 0))`

function conditionWhere(condition: FilterCondition, fields: Map<string, FilterField>): SQL {
  const field = fields.get(condition.questionId)
  // A condition on a question the form never had matches nothing, instead of everything
  if (!field) return sql`false`
  // A comparison that does not fit the question matches nothing either
  if (!OPS[field.kind]?.includes(condition.op)) return sql`false`

  const id = field.id
  const values = condition.values
  const first = values[0]

  switch (condition.op) {
    case "empty":
      return blank(id)
    case "not_empty":
      return sql`not ${blank(id)}`
    case "contains":
      return sql`lower(${answerText(id)}) like ${likeTerm(String(first ?? ""))}`
    case "is":
      return sql`lower(${answerText(id)}) = lower(${String(first ?? "")})`
    case "is_not":
      // An unanswered question counts as "is not" (same as the panel)
      return sql`(${blank(id)} or lower(${answerText(id)}) <> lower(${String(first ?? "")}))`
    case "any_of": {
      const list = sql.join(
        values.map((v) => sql`${String(v)}`),
        sql`, `
      )
      // A multiple choice answer is a list; a single choice answer is one value
      return sql`((${answerType(id)} = 'array' and exists (select 1 from jsonb_array_elements_text(${answer(id)}) as e where e in (${list}))) or (${answerType(id)} <> 'array' and ${answerText(id)} in (${list})))`
    }
    case "gt":
      return sql`((case when ${answerType(id)} = 'number' then (${answerText(id)})::numeric end) > ${Number(first)} or (${answerType(id)} = 'string' and ${answerText(id)} > ${String(first ?? "")}))`
    case "lt":
      return sql`((case when ${answerType(id)} = 'number' then (${answerText(id)})::numeric end) < ${Number(first)} or (${answerType(id)} = 'string' and ${answerText(id)} < ${String(first ?? "")}))`
    case "between": {
      if (values.length !== 2) return sql`false`
      return sql`((case when ${answerType(id)} = 'number' then (${answerText(id)})::numeric end) between ${Number(values[0])} and ${Number(values[1])})`
    }
  }
}

// The date range and device always apply; the answer conditions follow "match".
export function responseFilterWhere(filter: ResponseFilter, fields: FilterField[]): SQL | undefined {
  const byId = new Map(fields.map((f) => [f.id, f]))
  const conditions = filter.conditions.map((c) => conditionWhere(c, byId))
  const parts: SQL[] = []
  if (filter.dateRange) parts.push(sql`${responses.submittedAt} >= ${new Date(Date.now() - Number(filter.dateRange) * 86_400_000)}`)
  if (filter.device) parts.push(eq(responses.device, filter.device))
  if (conditions.length > 0) parts.push(filter.match === "all" ? and(...conditions)! : or(...conditions)!)
  return parts.length > 0 ? and(...parts) : undefined
}

// The search box: a word or phrase in any answer, or the label of a choice option (stored answers keep option ids).
export function responseSearchWhere(q: string, columns: Block[]): SQL | undefined {
  const term = q.trim()
  if (!term) return undefined
  const like = likeTerm(term)
  const lower = term.toLowerCase()
  const parts: SQL[] = []

  for (const column of columns) {
    if (column.type === "multiple_choice" || column.type === "file_upload") {
      // Lists of option ids, or of files (the name is inside each item)
      parts.push(sql`exists (select 1 from jsonb_array_elements_text(${answer(column.id)}) as e where lower(e) like ${like})`)
    } else {
      parts.push(sql`lower(${answerText(column.id)}) like ${like}`)
    }
    if (column.type === "single_choice" || column.type === "dropdown" || column.type === "multiple_choice") {
      for (const option of column.options ?? []) {
        if (!(option.label ?? "").toLowerCase().includes(lower)) continue
        parts.push(sql`(${answer(column.id)} ? ${option.id}::text or ${answerText(column.id)} = ${option.id})`)
      }
    }
  }

  return parts.length > 0 ? or(...parts) : undefined
}
