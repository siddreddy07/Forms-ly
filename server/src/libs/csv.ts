import type { Block } from "./answers.js"

// One answer as plain text, the way it appears in a spreadsheet cell. Same rules as the table in the browser
// (client components/responses/format.ts).
export function answerText(block: Block, value: unknown): string {
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
      return Array.isArray(value) ? (value as { name?: string }[]).map((f) => f.name ?? "").join(", ") : ""
    default:
      return String(value)
  }
}

export function csvEscape(value: string): string {
  // A leading = + - @ can run as a formula when the file is opened in a spreadsheet
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function csvLine(cells: string[]): string {
  return `${cells.map(csvEscape).join(",")}\r\n`
}
