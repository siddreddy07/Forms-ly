// Checks a submission against the form's questions. This is the server's copy of the rules in the browser
// (client lib/schema/logic.ts and answers.ts), because the browser can never be trusted: someone can send answers
// without using the form at all.
// Only questions that are visible for the answers given are checked and kept; the rest are dropped.

export type Block = {
  id: string
  type: string
  label?: string
  required?: boolean
  options?: { id: string }[]
  validation?: { minLength?: number; maxLength?: number; min?: number; max?: number; pattern?: string; maxFiles?: number }
  scale?: { min: number; max: number }
  logic?: { action: string; when: { match: string; conditions: Condition[] } }[]
}

type Condition = { blockId: string; operator: string; value?: string | number | boolean }

export const LAYOUT_BLOCKS = new Set(["heading", "paragraph", "divider", "image"])

export type FileRef = { fileId: string }

// ---------- Which questions are visible ----------

const isEmpty = (v: unknown) => v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)

function leaf(c: Condition, answers: Record<string, unknown>): boolean {
  const actual = answers[c.blockId]
  switch (c.operator) {
    case "is_empty":
      return isEmpty(actual)
    case "is_not_empty":
      return !isEmpty(actual)
    case "equals":
      return Array.isArray(actual) ? actual.length === 1 && actual[0] === c.value : actual === c.value
    case "not_equals":
      return Array.isArray(actual) ? !(actual.length === 1 && actual[0] === c.value) : actual !== c.value
    case "contains":
      return Array.isArray(actual)
        ? (actual as unknown[]).includes(c.value)
        : typeof actual === "string" && typeof c.value === "string" && actual.toLowerCase().includes(c.value.toLowerCase())
    case "greater_than":
      return typeof actual === "number" && typeof c.value === "number" && actual > c.value
    case "less_than":
      return typeof actual === "number" && typeof c.value === "number" && actual < c.value
    default:
      return false
  }
}

function visible(block: Block, answers: Record<string, unknown>): boolean {
  const rules = Array.isArray(block.logic) ? block.logic : []
  if (rules.length === 0) return true
  const matches = (r: (typeof rules)[number]) => {
    const results = (r.when?.conditions ?? []).map((c) => leaf(c, answers))
    return r.when?.match === "all" ? results.every(Boolean) : results.some(Boolean)
  }
  if (rules.some((r) => r.action === "hide" && matches(r))) return false
  const show = rules.filter((r) => r.action === "show")
  return show.length === 0 || show.some(matches)
}

// ---------- One answer ----------

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const PHONE = /^[+()\d\s.-]{6,20}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Returns the cleaned answer, or an error message
function check(block: Block, value: unknown): { value: unknown } | { error: string } {
  const v = block.validation ?? {}
  const ids = new Set((block.options ?? []).map((o) => o.id))

  switch (block.type) {
    case "short_text":
    case "long_text": {
      if (typeof value !== "string") return { error: "Enter text" }
      if (v.minLength && value.length < v.minLength) return { error: `At least ${v.minLength} characters` }
      if (value.length > Math.min(v.maxLength ?? 5000, 5000)) return { error: "Too long" }
      if (v.pattern) {
        try {
          if (!new RegExp(v.pattern).test(value)) return { error: "Does not match the expected format" }
        } catch {
          // A broken pattern is ignored rather than blocking every submission
        }
      }
      return { value }
    }
    case "email":
      return typeof value === "string" && value.length <= 320 && EMAIL.test(value) ? { value } : { error: "Enter a valid email address" }
    case "phone":
      return typeof value === "string" && PHONE.test(value) ? { value } : { error: "Enter a valid phone number" }
    case "url":
      try {
        const u = new URL(String(value))
        return (u.protocol === "http:" || u.protocol === "https:") && String(value).length <= 2000 ? { value: String(value) } : { error: "Enter a valid web address" }
      } catch {
        return { error: "Enter a valid web address" }
      }
    case "date":
      return typeof value === "string" && ISO_DATE.test(value) ? { value } : { error: "Pick a date" }
    case "time":
      return typeof value === "string" && TIME.test(value) ? { value } : { error: "Pick a time" }
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) return { error: "Enter a number" }
      if (v.min !== undefined && value < v.min) return { error: `At least ${v.min}` }
      if (v.max !== undefined && value > v.max) return { error: `At most ${v.max}` }
      return { value }
    case "single_choice":
    case "dropdown":
      return typeof value === "string" && ids.has(value) ? { value } : { error: "Pick one of the options" }
    case "multiple_choice":
      return Array.isArray(value) && value.length <= 100 && value.every((x) => typeof x === "string" && ids.has(x))
        ? { value: [...new Set(value as string[])] }
        : { error: "Pick from the options" }
    case "yes_no":
      return typeof value === "boolean" ? { value } : { error: "Choose yes or no" }
    case "rating":
    case "scale": {
      const min = block.scale?.min ?? 1
      const max = block.scale?.max ?? 5
      return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max ? { value } : { error: "Choose a value" }
    }
    case "file_upload": {
      const maxFiles = v.maxFiles ?? 1
      if (!Array.isArray(value) || value.length > maxFiles) return { error: `Upload at most ${maxFiles} file${maxFiles === 1 ? "" : "s"}` }
      const refs: FileRef[] = []
      for (const item of value) {
        const id = item && typeof item === "object" ? (item as { fileId?: unknown }).fileId : undefined
        if (typeof id !== "string" || id.length === 0 || id.length > 100) return { error: "Wait for the upload to finish" }
        refs.push({ fileId: id })
      }
      return { value: refs }
    }
    default:
      return { error: "Unknown question" }
  }
}

export type SubmissionCheck = { ok: true; answers: Record<string, unknown> } | { ok: false; errors: Record<string, string> }

export function checkSubmission(blocks: Block[], raw: Record<string, unknown>): SubmissionCheck {
  const errors: Record<string, string> = {}
  const answers: Record<string, unknown> = {}

  for (const block of blocks) {
    if (LAYOUT_BLOCKS.has(block.type) || !visible(block, raw)) continue
    const value = raw[block.id]
    if (isEmpty(value)) {
      if (block.required) errors[block.id] = "This field is required"
      continue
    }
    const result = check(block, value)
    if ("error" in result) errors[block.id] = result.error
    else answers[block.id] = result.value
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, answers }
}
