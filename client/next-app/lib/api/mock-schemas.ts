import { createCafeApplication, createClientIntake, createWebsiteFeedback, type FormDocument } from "@/lib/schema"

/* The sample builders make random ids, and the server and the browser each run them once, so the two
   would disagree. Rewrite every id to a fixed one so saved answers always line up with their question. */
function stableIds(doc: FormDocument, prefix: string): FormDocument {
  const ids = new Set<string>()
  const collect = (v: unknown, key?: string) => {
    if (Array.isArray(v)) v.forEach((x) => collect(x))
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) collect(x, k)
    else if (typeof v === "string" && key === "id") ids.add(v)
  }
  collect(doc)
  const map = new Map([...ids].map((id, i) => [id, `${prefix}_${i + 1}`]))
  const rewrite = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(rewrite)
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, rewrite(x)]))
    return typeof v === "string" && map.has(v) ? map.get(v) : v
  }
  return rewrite(doc) as FormDocument
}

/* MOCK: stands in for loading a stored form. */
const documents: Record<string, FormDocument> = {
  f_01: stableIds(createCafeApplication(), "f01"),
  f_02: stableIds(createClientIntake(), "f02"),
  f_03: stableIds(createWebsiteFeedback(), "f03"),
}

export function getFormDocument(id: string): FormDocument | undefined {
  return documents[id]
}