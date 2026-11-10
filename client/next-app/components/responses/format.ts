import type { AnswerValue, Block } from "@/lib/schema"

/* One answer as plain text, the way it appears in a spreadsheet cell. */
export function answerText(block: Block, value: AnswerValue): string {
  if (value === undefined || value === null || value === "") return ""
  const label = (id: string) => block.options?.find((o) => o.id === id)?.label ?? id
  switch (block.type) {
    case "single_choice":
    case "dropdown":
      return label(String(value))
    case "multiple_choice":
      return Array.isArray(value) ? (value as string[]).map(label).join(", ") : ""
    case "yes_no":
      return value === true ? "Yes" : value === false ? "No" : ""
    case "file_upload":
      return Array.isArray(value) ? (value as { name: string }[]).map((f) => f.name).join(", ") : ""
    default:
      return String(value)
  }
}

export function csvEscape(s: string) {
  /* Leading = + - @ can run as a formula when opened in a spreadsheet. */
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}
