import type { StoredResponse } from "@/lib/api/responses"
import { isAnswerBlock, type Answers, type Block } from "@/lib/schema"

/* Made-up responses so the Analytics tab has something to show before the backend exists.
   Seeded, so the same form always gets the same numbers. */
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const NAMES = ["Maya Patel", "Liam Chen", "Sofia Rossi", "Noah Williams", "Aisha Khan", "Lucas Meyer", "Emma Dubois", "Ethan Park", "Zara Ahmed", "Oliver Smith"]
const SENTENCES = [
  "Two years behind the counter at a busy bakery.",
  "Worked weekends at a student cafe while studying.",
  "Mostly front of house, some barista training.",
  "Kitchen prep and closing duties for a small restaurant.",
  "Ran the till and handled online orders.",
  "Happy to learn, available to start next month.",
]

const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7)

export function demoResponses(formId: string, blocks: Block[], now: number, count = 140): StoredResponse[] {
  const rand = rng(hash(formId))
  const pick = <T,>(list: T[]): T => list[Math.floor(rand() ** 1.6 * list.length)]
  const questions = blocks.filter((b) => isAnswerBlock(b.type))
  const out: StoredResponse[] = []

  for (let i = 0; i < count; i++) {
    /* More recent days get more responses, with a weekday bump. */
    const daysAgo = Math.floor(rand() ** 1.8 * 45)
    const when = new Date(now - daysAgo * 86_400_000 - Math.floor(rand() * 86_400_000))
    const answers: Answers = {}
    for (const b of questions) {
      if (!b.required && rand() < 0.22) continue
      switch (b.type) {
        case "single_choice":
        case "dropdown":
          if (b.options?.length) answers[b.id] = pick(b.options).id
          break
        case "multiple_choice":
          if (b.options?.length) answers[b.id] = [...new Set([pick(b.options).id, pick(b.options).id])]
          break
        case "yes_no":
          answers[b.id] = rand() < 0.62
          break
        case "rating":
        case "scale": {
          const min = b.scale?.min ?? 1
          const max = b.scale?.max ?? 5
          answers[b.id] = Math.min(max, Math.max(min, Math.round(max - rand() ** 1.5 * (max - min))))
          break
        }
        case "number":
          answers[b.id] = Math.round(rand() * 40 + 5)
          break
        case "email":
          answers[b.id] = `${pick(NAMES).split(" ")[0].toLowerCase()}${Math.floor(rand() * 90 + 10)}@example.com`
          break
        case "phone":
          answers[b.id] = `+1 555 01${Math.floor(rand() * 90 + 10)}`
          break
        case "url":
          answers[b.id] = "https://example.com"
          break
        case "short_text":
          answers[b.id] = pick(NAMES)
          break
        case "long_text":
          answers[b.id] = pick(SENTENCES)
          break
        case "date":
          answers[b.id] = when.toISOString().slice(0, 10)
          break
        case "time":
          answers[b.id] = "09:30"
          break
        case "file_upload":
          answers[b.id] = [{ name: "cv.pdf", size: 120_000, url: "" }]
          break
      }
    }
    out.push({
      id: `demo-${i}`,
      formId,
      formVersion: 1,
      submittedAt: when.toISOString(),
      durationMs: Math.round((35 + rand() ** 1.4 * 260) * 1000),
      fields: questions,
      answers,
    })
  }
  return out.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
}
