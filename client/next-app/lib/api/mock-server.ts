import { parseForm, type FormDocument } from "@/lib/schema"

/* Stand-in for the backend until the real API exists. It lives in this browser's storage so a saved
   form survives a reload, and it keeps a version number like the real server will.
   Contract the real API must follow:
     PUT /forms/:id { document, baseVersion } -> 200 { version, updatedAt }
                                              -> 409 { document, version }  when baseVersion is stale
   Dev switch: localStorage "mock-server:fail" = "1" makes every save fail like a lost connection. */
export type ServerRecord = { doc: FormDocument; version: number; updatedAt: string | null }

export type SaveResult =
  | { ok: true; version: number; updatedAt: string }
  | { ok: false; reason: "conflict"; server: ServerRecord }
  | { ok: false; reason: "network" }

const key = (formId: string) => `mock-server:form:${formId}`

export function readServerRecord(formId: string, fallback: FormDocument): ServerRecord {
  try {
    const raw = window.localStorage.getItem(key(formId))
    if (raw) {
      const p = JSON.parse(raw) as { doc: unknown; version: number; updatedAt: string }
      return { doc: parseForm(p.doc), version: p.version, updatedAt: p.updatedAt }
    }
  } catch {
    /* fall through to the built-in copy */
  }
  return { doc: fallback, version: 1, updatedAt: null }
}

export async function saveToServer(formId: string, doc: FormDocument, baseVersion: number, fallback: FormDocument): Promise<SaveResult> {
  await new Promise((r) => setTimeout(r, 700))
  if (window.localStorage.getItem("mock-server:fail") === "1") return { ok: false, reason: "network" }

  const current = readServerRecord(formId, fallback)
  if (current.version !== baseVersion) return { ok: false, reason: "conflict", server: current }

  const next = { doc, version: current.version + 1, updatedAt: new Date().toISOString() }
  try {
    window.localStorage.setItem(key(formId), JSON.stringify(next))
  } catch {
    return { ok: false, reason: "network" }
  }
  return { ok: true, version: next.version, updatedAt: next.updatedAt }
}
