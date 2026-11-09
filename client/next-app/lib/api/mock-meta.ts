import { parseForm, type FormDocument } from "@/lib/schema"

/* Stand-in for the backend's publish and access state, kept in this browser like mock-server.ts.
   Real API to follow:
     POST /forms/:id/publish   { version }  -> publishes that saved version
     DELETE /forms/:id/publish              -> unpublishes
     PATCH /forms/:id          { access }   -> "public" | "private" */
export type Access = "public" | "private"

export type FormMeta = {
  published: boolean
  publishedAt: string | null
  /* The saved version that is live. Newer saves stay private until published again. */
  publishedVersion: number | null
  access: Access
}

export const metaKey = (formId: string) => `mock-server:meta:${formId}`
const publishedKey = (formId: string) => `mock-server:published:${formId}`

const listeners = new Set<() => void>()
export function subscribeMeta(cb: () => void) {
  listeners.add(cb)
  window.addEventListener("storage", cb)
  return () => {
    listeners.delete(cb)
    window.removeEventListener("storage", cb)
  }
}
const notify = () => listeners.forEach((l) => l())

export function parseMeta(raw: string | null, fallbackPublished: boolean): FormMeta {
  const base: FormMeta = { published: fallbackPublished, publishedAt: null, publishedVersion: fallbackPublished ? 1 : null, access: "public" }
  if (!raw) return base
  try {
    return { ...base, ...(JSON.parse(raw) as Partial<FormMeta>) }
  } catch {
    return base
  }
}

function write(formId: string, meta: FormMeta) {
  try {
    window.localStorage.setItem(metaKey(formId), JSON.stringify(meta))
  } catch {
    /* storage unavailable: nothing to persist */
  }
  notify()
}

function current(formId: string, fallbackPublished: boolean) {
  try {
    return parseMeta(window.localStorage.getItem(metaKey(formId)), fallbackPublished)
  } catch {
    return parseMeta(null, fallbackPublished)
  }
}

/* Makes a saved copy of the form live. Later edits do not change it until published again. */
export function publishForm(formId: string, doc: FormDocument, version: number) {
  try {
    window.localStorage.setItem(publishedKey(formId), JSON.stringify(doc))
  } catch {
    /* ignore */
  }
  write(formId, { ...current(formId, false), published: true, publishedAt: new Date().toISOString(), publishedVersion: version })
}

export function unpublishForm(formId: string) {
  write(formId, { ...current(formId, false), published: false })
}

export function setAccess(formId: string, access: Access) {
  write(formId, { ...current(formId, false), access })
}

export function readPublishedDoc(formId: string): FormDocument | null {
  try {
    const raw = window.localStorage.getItem(publishedKey(formId))
    return raw ? parseForm(JSON.parse(raw)) : null
  } catch {
    return null
  }
}
