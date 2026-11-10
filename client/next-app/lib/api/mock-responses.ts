import type { Answers, Block } from "@/lib/schema"

/* Stand-in for the backend's responses store, kept in this browser like mock-server.ts.
   Real API to follow:
     POST   /forms/:id/responses      { answers, formVersion, durationMs } -> 201 { id }
     GET    /forms/:id/responses      -> { items: StoredResponse[] }
     DELETE /forms/:id/responses/:rid
   File answers keep only name and size here. Real uploads go through the backend later. */
export type StoredResponse = {
  id: string
  formId: string
  formVersion: number | null
  submittedAt: string
  durationMs: number | null
  /* The questions as they were when this was submitted, so columns always match the answers. */
  fields?: Block[]
  answers: Answers
}

const key = (formId: string) => `mock-server:responses:${formId}`

const listeners = new Set<() => void>()
export function subscribeResponses(cb: () => void) {
  listeners.add(cb)
  window.addEventListener("storage", cb)
  return () => {
    listeners.delete(cb)
    window.removeEventListener("storage", cb)
  }
}
const notify = () => listeners.forEach((l) => l())

export const responsesKey = key

export function parseResponses(raw: string | null): StoredResponse[] {
  if (!raw) return []
  try {
    const list = JSON.parse(raw) as StoredResponse[]
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function read(formId: string): StoredResponse[] {
  try {
    return parseResponses(window.localStorage.getItem(key(formId)))
  } catch {
    return []
  }
}

export type SubmitResult = { ok: true; id: string } | { ok: false; reason: "storage" }

export async function submitResponse(
  formId: string,
  input: { answers: Answers; fields: Block[]; formVersion: number | null; durationMs: number | null }
): Promise<SubmitResult> {
  await new Promise((r) => setTimeout(r, 400))
  const entry: StoredResponse = {
    id: crypto.randomUUID(),
    formId,
    formVersion: input.formVersion,
    submittedAt: new Date().toISOString(),
    durationMs: input.durationMs,
    fields: input.fields,
    /* Files cannot live in the browser store; keep what the table needs. */
    answers: JSON.parse(JSON.stringify(input.answers)) as Answers,
  }
  try {
    window.localStorage.setItem(key(formId), JSON.stringify([entry, ...read(formId)]))
  } catch {
    return { ok: false, reason: "storage" }
  }
  notify()
  return { ok: true, id: entry.id }
}

export function deleteResponse(formId: string, id: string) {
  try {
    window.localStorage.setItem(key(formId), JSON.stringify(read(formId).filter((r) => r.id !== id)))
  } catch {
    /* ignore */
  }
  notify()
}
