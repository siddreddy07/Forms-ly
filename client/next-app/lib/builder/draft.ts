import { parseForm, type FormDocument } from "@/lib/schema"

/* Local backup of the form being edited. The editor itself never reads from here after it opens:
   this only protects against a refresh, a crash or a lost connection. */
export type Draft = {
  doc: FormDocument
  /* The server version this draft started from. */
  baseVersion: number
  savedAt: string
  /* false once the same content has been saved to the backend. */
  dirty: boolean
}

const key = (formId: string) => `forms:draft:${formId}`

export function readDraft(formId: string): Draft | null {
  try {
    const raw = window.localStorage.getItem(key(formId))
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<Draft>
    return {
      doc: parseForm(p.doc),
      baseVersion: Number(p.baseVersion) || 1,
      savedAt: String(p.savedAt ?? ""),
      dirty: !!p.dirty,
    }
  } catch {
    /* Unreadable or from an incompatible version: treat as no draft. */
    return null
  }
}

/* Returns false when the browser refused the write (storage full or blocked). */
export function writeDraft(formId: string, draft: Draft): boolean {
  try {
    window.localStorage.setItem(key(formId), JSON.stringify(draft))
    return true
  } catch {
    return false
  }
}

export function clearDraft(formId: string) {
  try {
    window.localStorage.removeItem(key(formId))
  } catch {
    /* nothing to do */
  }
}

/* Plain-language list of what differs, for the restore prompt. */
export function summarizeChanges(saved: FormDocument, draft: FormDocument): string[] {
  const blocks = (d: FormDocument) => new Map(d.steps.flatMap((s) => s.blocks).map((b) => [b.id, JSON.stringify(b)]))
  const a = blocks(saved)
  const b = blocks(draft)
  let added = 0
  let edited = 0
  for (const [id, json] of b) {
    if (!a.has(id)) added++
    else if (a.get(id) !== json) edited++
  }
  const removed = [...a.keys()].filter((id) => !b.has(id)).length
  const n = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`

  const out: string[] = []
  if (added) out.push(`${n(added, "block")} added`)
  if (edited) out.push(`${n(edited, "block")} edited`)
  if (removed) out.push(`${n(removed, "block")} removed`)
  if (JSON.stringify(saved.header) !== JSON.stringify(draft.header)) out.push("Form header changed")
  if (saved.steps.length !== draft.steps.length) out.push(`Pages: ${saved.steps.length} to ${draft.steps.length}`)
  /* Anything else is a reorder or a page title, heading or paragraph change. */
  if (!out.length) out.push("Order, page text or other small edits")
  return out
}
