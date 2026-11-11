import { z } from "zod"

import type { FilterField } from "@/lib/api/responses"
import type { Block } from "@/lib/schema"

/* A filter for the Responses table. People build it with the filter panel today; later the AI assistant will fill in
   the same shape from a sentence (server/src/tools/filterTool.ts has the matching schema, keep the two in step).
   The server applies it (server/src/libs/responseFilter.ts), to the responses in the database. */

export const filterOps = ["contains", "is", "is_not", "any_of", "gt", "lt", "between", "empty", "not_empty"] as const
export type FilterOp = (typeof filterOps)[number]

export const conditionSchema = z.object({
  questionId: z.string(),
  op: z.enum(filterOps),
  values: z.array(z.union([z.string(), z.number(), z.boolean()])).max(20),
})

export const responseFilterSchema = z.object({
  match: z.enum(["all", "any"]),
  dateRange: z.enum(["7", "30", "90"]).nullable(),
  device: z.enum(["phone", "tablet", "desktop"]).nullable(),
  conditions: z.array(conditionSchema).max(10),
})

export type FilterCondition = z.infer<typeof conditionSchema>
export type ResponseFilter = z.infer<typeof responseFilterSchema>

/* A field as the question it was, so the panel and the matching can treat it like any other column. A removed field is
   marked in its name. */
export function fieldToBlock(f: FilterField): Block {
  return {
    id: f.id,
    type: f.type as Block["type"],
    label: f.current ? f.label : `${f.label} (removed)`,
    required: false,
    options: f.options,
    scale: f.scale ? { min: f.scale.min, max: f.scale.max } : undefined,
    layout: { colSpan: 12 },
  }
}

export const emptyFilter: ResponseFilter = { match: "all", dateRange: null, device: null, conditions: [] }

/* How many things are narrowing the table. A condition with nothing filled in yet does not count. */
export function activeCount(filter: ResponseFilter): number {
  return (filter.dateRange ? 1 : 0) + (filter.device ? 1 : 0) + filter.conditions.filter(isComplete).length
}

const NO_VALUE: FilterOp[] = ["empty", "not_empty"]

export function isComplete(c: FilterCondition): boolean {
  if (NO_VALUE.includes(c.op)) return true
  if (c.op === "between") return c.values.length === 2 && c.values.every((v) => v !== "" && v !== undefined)
  if (c.op === "any_of") return c.values.length > 0
  return c.values.length > 0 && c.values[0] !== ""
}

/* The ways to compare an answer, depending on the kind of question. */
export function opsFor(block: Block): { op: FilterOp; label: string }[] {
  switch (block.type) {
    case "single_choice":
    case "dropdown":
    case "multiple_choice":
      return [
        { op: "any_of", label: "is any of" },
        { op: "empty", label: "is not answered" },
      ]
    case "yes_no":
      return [{ op: "is", label: "is" }]
    case "number":
    case "rating":
    case "scale":
      return [
        { op: "is", label: "is" },
        { op: "gt", label: "is more than" },
        { op: "lt", label: "is less than" },
        { op: "between", label: "is between" },
        { op: "empty", label: "is not answered" },
      ]
    case "date":
    case "time":
      return [
        { op: "is", label: "is" },
        { op: "gt", label: "is after" },
        { op: "lt", label: "is before" },
        { op: "empty", label: "is not answered" },
      ]
    case "file_upload":
      return [
        { op: "not_empty", label: "has a file" },
        { op: "empty", label: "has no file" },
      ]
    default:
      return [
        { op: "contains", label: "contains" },
        { op: "is", label: "is exactly" },
        { op: "is_not", label: "is not" },
        { op: "not_empty", label: "is answered" },
        { op: "empty", label: "is not answered" },
      ]
  }
}

/* The filter as text for the page address, and back. Anything missing, broken or edited by hand gives an empty filter. */
export function filterToParam(filter: ResponseFilter): string {
  const clean = { ...filter, conditions: filter.conditions.filter(isComplete) }
  return activeCount(clean) === 0 ? "" : JSON.stringify(clean)
}

export function filterFromParam(text: string): ResponseFilter {
  if (!text) return emptyFilter
  try {
    const parsed = responseFilterSchema.safeParse(JSON.parse(text))
    return parsed.success ? parsed.data : emptyFilter
  } catch {
    return emptyFilter
  }
}
