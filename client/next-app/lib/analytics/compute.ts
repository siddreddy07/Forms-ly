import type { StoredResponse } from "@/lib/api/mock-responses"
import type { Block } from "@/lib/schema"

/* Pure functions: responses in, numbers out. The real backend will return the same shapes. */

export type Range = "7" | "30" | "all"
const DAY = 86_400_000

export function inRange(responses: StoredResponse[], range: Range, now: number) {
  if (range === "all") return responses
  const from = now - Number(range) * DAY
  return responses.filter((r) => new Date(r.submittedAt).getTime() >= from)
}

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

/* One point per day, including days with no responses. */
export function perDay(responses: StoredResponse[], range: Range, now: number): { date: string; label: string; count: number }[] {
  const times = responses.map((r) => new Date(r.submittedAt).getTime())
  const spanDays = range === "all" ? Math.min(90, Math.max(7, Math.ceil((now - Math.min(now, ...times)) / DAY) + 1)) : Number(range)
  const counts = new Map<string, number>()
  for (const t of times) counts.set(dayKey(new Date(t)), (counts.get(dayKey(new Date(t))) ?? 0) + 1)
  const out = []
  for (let i = spanDays - 1; i >= 0; i--) {
    const d = new Date(now - i * DAY)
    const key = dayKey(d)
    out.push({ date: key, label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), count: counts.get(key) ?? 0 })
  }
  return out
}

export function averageDurationMs(responses: StoredResponse[]) {
  const d = responses.map((r) => r.durationMs).filter((x): x is number => typeof x === "number")
  return d.length ? d.reduce((a, b) => a + b, 0) / d.length : null
}

export function formatDuration(ms: number | null) {
  if (ms === null) return "-"
  const s = Math.round(ms / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`
}

export type QuestionSummary =
  | { kind: "choice"; block: Block; answered: number; bars: { label: string; count: number }[] }
  | { kind: "rating"; block: Block; answered: number; average: number; bars: { label: string; count: number }[] }
  | { kind: "number"; block: Block; answered: number; average: number; min: number; max: number }
  | { kind: "text"; block: Block; answered: number; recent: string[] }
  | { kind: "other"; block: Block; answered: number }

export function summarize(block: Block, responses: StoredResponse[]): QuestionSummary {
  const values = responses.map((r) => r.answers[block.id]).filter((v) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0))
  const answered = values.length
  const optionLabel = (id: string) => block.options?.find((o) => o.id === id)?.label ?? id

  switch (block.type) {
    case "single_choice":
    case "dropdown":
    case "multiple_choice":
    case "yes_no": {
      const counts = new Map<string, number>()
      if (block.type === "yes_no") {
        counts.set("Yes", 0)
        counts.set("No", 0)
      } else for (const o of block.options ?? []) counts.set(o.label, 0)
      for (const v of values) {
        const labels = block.type === "yes_no" ? [v === true ? "Yes" : "No"] : Array.isArray(v) ? (v as string[]).map(optionLabel) : [optionLabel(String(v))]
        for (const l of labels) counts.set(l, (counts.get(l) ?? 0) + 1)
      }
      return { kind: "choice", block, answered, bars: [...counts].map(([label, count]) => ({ label, count })) }
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
      return { kind: "rating", block, answered, average: answered ? sum / answered : 0, bars }
    }
    case "number": {
      const nums = values.map(Number).filter((n) => !Number.isNaN(n))
      return {
        kind: "number",
        block,
        answered,
        average: nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0,
        min: nums.length ? Math.min(...nums) : 0,
        max: nums.length ? Math.max(...nums) : 0,
      }
    }
    case "short_text":
    case "long_text":
    case "email":
    case "phone":
    case "url":
      return { kind: "text", block, answered, recent: values.slice(0, 4).map(String) }
    default:
      return { kind: "other", block, answered }
  }
}
