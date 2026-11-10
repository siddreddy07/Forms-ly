import { LAYOUT_BLOCKS, type Block } from "./answers.js"

// Numbers about a form's responses, and nothing else. No answer text, names, emails or file names ever leave here:
// a question that holds free text is only counted ("12 of 14 answered"), never quoted.

const DAY = 86_400_000

export type Range = "7" | "30" | "all"

export type Row = {
  answers: Record<string, unknown>
  durationMs: number | null
  submittedAt: Date
  device: string | null
}

export type QuestionStats =
  | { id: string; label: string; kind: "choice"; answered: number; bars: { label: string; count: number }[] }
  | { id: string; label: string; kind: "rating"; answered: number; average: number; bars: { label: string; count: number }[] }
  | { id: string; label: string; kind: "number"; answered: number; average: number; min: number; max: number }
  | { id: string; label: string; kind: "other"; answered: number }

const blank = (v: unknown) => v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)

function questionStats(block: Block, rows: Row[]): QuestionStats {
  const base = { id: block.id, label: (block.label ?? "").slice(0, 120) }
  const values = rows.map((r) => r.answers[block.id]).filter((v) => !blank(v))
  const answered = values.length
  const optionLabel = (id: string) => (block.options as { id: string; label?: string }[] | undefined)?.find((o) => o.id === id)?.label ?? id

  switch (block.type) {
    case "single_choice":
    case "dropdown":
    case "multiple_choice":
    case "yes_no": {
      const counts = new Map<string, number>()
      if (block.type === "yes_no") {
        counts.set("Yes", 0)
        counts.set("No", 0)
      } else for (const o of (block.options as { id: string; label?: string }[] | undefined) ?? []) counts.set(o.label ?? o.id, 0)
      for (const v of values) {
        const labels = block.type === "yes_no" ? [v === true ? "Yes" : "No"] : Array.isArray(v) ? (v as string[]).map(optionLabel) : [optionLabel(String(v))]
        for (const l of labels) counts.set(l, (counts.get(l) ?? 0) + 1)
      }
      return { ...base, kind: "choice", answered, bars: [...counts].map(([label, count]) => ({ label: label.slice(0, 60), count })) }
    }
    case "rating":
    case "scale": {
      const min = block.scale?.min ?? 1
      const max = block.scale?.max ?? 5
      const bars = Array.from({ length: max - min + 1 }, (_, i) => ({ label: String(min + i), count: 0 }))
      let sum = 0
      for (const v of values) {
        const n = Number(v)
        sum += n
        const bar = bars[n - min]
        if (bar) bar.count++
      }
      return { ...base, kind: "rating", answered, average: answered ? sum / answered : 0, bars }
    }
    case "number": {
      const nums = values.map(Number).filter(Number.isFinite)
      return {
        ...base,
        kind: "number",
        answered,
        average: nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0,
        min: nums.length ? Math.min(...nums) : 0,
        max: nums.length ? Math.max(...nums) : 0,
      }
    }
    default:
      return { ...base, kind: "other", answered }
  }
}

export function buildAnalytics(input: {
  rows: Row[]
  blocks: Block[]
  range: Range
  // Minutes behind UTC, as the browser reports it (JS getTimezoneOffset), so days start at the viewer's midnight
  tzOffsetMin: number
  now: number
  publishedAt: Date | null
  total: number
}) {
  const { rows, range, tzOffsetMin, now } = input
  const dayKey = (ms: number) => new Date(ms - tzOffsetMin * 60_000).toISOString().slice(0, 10)

  const inRange = range === "all" ? rows : rows.filter((r) => r.submittedAt.getTime() >= now - Number(range) * DAY)

  const times = inRange.map((r) => r.submittedAt.getTime())
  const spanDays =
    range === "all" ? Math.min(90, Math.max(7, Math.ceil((now - Math.min(now, ...times)) / DAY) + 1)) : Number(range)
  const counts = new Map<string, number>()
  for (const t of times) counts.set(dayKey(t), (counts.get(dayKey(t)) ?? 0) + 1)
  const series = Array.from({ length: spanDays }, (_, i) => {
    const date = dayKey(now - (spanDays - 1 - i) * DAY)
    return { date, count: counts.get(date) ?? 0 }
  })

  const durations = inRange.map((r) => r.durationMs).filter((d): d is number => typeof d === "number")

  const devices = { phone: 0, tablet: 0, desktop: 0 }
  for (const r of inRange) if (r.device === "phone" || r.device === "tablet" || r.device === "desktop") devices[r.device]++

  // Days live: from the day it was published, or its first answer if it has no publish date
  const oldest = rows.length ? Math.min(...rows.map((r) => r.submittedAt.getTime())) : now
  const since = input.publishedAt ? input.publishedAt.getTime() : oldest
  const daysActive = Math.max(1, Math.ceil((now - since) / DAY))

  return {
    total: input.total,
    inRange: inRange.length,
    since: new Date(since).toISOString(),
    daysActive,
    avgDurationMs: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
    series,
    devices,
    questions: input.blocks.filter((b) => !LAYOUT_BLOCKS.has(b.type)).map((b) => questionStats(b, inRange)),
  }
}
