"use client"

import * as React from "react"
import { toast } from "sonner"

import { useBuilderStore } from "@/components/builder/builder-context"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { publishForm } from "@/lib/api/mock-meta"
import { useFormGate } from "@/components/workspace/form-gate"
import { ApiError, useApi } from "@/lib/api/http"
import type { ConflictResponse, SaveResponse } from "@/lib/api/forms"
import { clearDraft, readDraft, summarizeChanges, writeDraft, type Draft } from "@/lib/builder/draft"
import { timeAgo } from "@/lib/time"
import { parseForm, type FormDocument } from "@/lib/schema"

/* What the server has: a document, its version and when it was saved. */
type ServerRecord = { doc: FormDocument; version: number; updatedAt: string | null }

/* dirty: edited, local backup pending. drafted: backed up on this device, not on the server. */
export type SaveStatus = "saved" | "dirty" | "drafted" | "saving" | "error"

type Persistence = {
  status: SaveStatus
  /* ISO time of the last successful save, if any. */
  savedAt: string | null
  /* True when the browser refused to keep a local backup. */
  backupFailed: boolean
  save: () => void
  /* Saves any changes, then makes that saved copy live. */
  publish: () => void
  publishing: boolean
  /* The saved version this page is based on. */
  version: number
  formId: string
}

const Ctx = React.createContext<Persistence | null>(null)

export function useSave() {
  const v = React.useContext(Ctx)
  if (!v) throw new Error("useSave must be used inside PersistenceProvider")
  return v
}

const DEBOUNCE_MS = 800
const MAX_WAIT_MS = 5000

const sameDoc = (a: FormDocument, b: FormDocument) => JSON.stringify(a) === JSON.stringify(b)

/* Keeps a local backup while you edit, and sends the whole form to the backend on Save.
   The editor always works from memory; the backup is only read once, when the builder opens. */
export function PersistenceProvider({ formId, initial, children }: { formId: string; initial: FormDocument; children: React.ReactNode }) {
  const store = useBuilderStore()
  const api = useApi()
  const gate = useFormGate()
  const [status, setStatus] = React.useState<SaveStatus>("saved")
  const [savedAt, setSavedAt] = React.useState<string | null>(null)
  const [backupFailed, setBackupFailed] = React.useState(false)
  const [restore, setRestore] = React.useState<{ draft: Draft; newerOnServer: boolean; changes: string[] } | null>(null)
  const [conflict, setConflict] = React.useState<ServerRecord | null>(null)
  const [version, setVersion] = React.useState(1)
  const [publishing, setPublishing] = React.useState(false)

  const baseVersion = React.useRef(1)
  const savedDoc = React.useRef<FormDocument>(initial)
  const ready = React.useRef(false)
  const restoring = React.useRef(false)
  const saving = React.useRef(false)
  const publishingRef = React.useRef(false)
  const statusRef = React.useRef<SaveStatus>("saved")
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const maxTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveRef = React.useRef<() => void>(() => {})

  const setStatusBoth = React.useCallback((s: SaveStatus) => {
    statusRef.current = s
    setStatus(s)
  }, [])

  /* Replace what is on screen, e.g. after restoring a backup or loading the latest copy. */
  const loadDoc = React.useCallback(
    (doc: FormDocument) => {
      store.getState().loadDocument(doc)
      store.temporal.getState().clear()
    },
    [store]
  )

  const flush = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    if (maxTimer.current) clearTimeout(maxTimer.current)
    timer.current = null
    maxTimer.current = null
    if (!ready.current || restoring.current) return
    const doc = store.getState().doc
    const ok = writeDraft(formId, { doc, baseVersion: baseVersion.current, savedAt: new Date().toISOString(), dirty: doc !== savedDoc.current })
    setBackupFailed(!ok)
    if (ok && doc !== savedDoc.current && statusRef.current === "dirty") setStatusBoth("drafted")
  }, [store, formId, setStatusBoth])

  const schedule = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(flush, DEBOUNCE_MS)
    if (!maxTimer.current) maxTimer.current = setTimeout(flush, MAX_WAIT_MS)
  }, [flush])

  /* On open: pick up the latest saved copy, then offer any unsaved backup. */
  React.useEffect(() => {
    /* Browser storage can only be read after mount, so state is set here on purpose. */
    /* eslint-disable react-hooks/set-state-in-effect */
    const server: ServerRecord = { doc: gate.doc, version: gate.version, updatedAt: gate.updatedAt }
    baseVersion.current = server.version
    setVersion(server.version)
    savedDoc.current = store.getState().doc
    setSavedAt(server.updatedAt)

    const draft = readDraft(formId)
    if (draft?.dirty && !sameDoc(draft.doc, savedDoc.current)) {
      restoring.current = true
      setRestore({ draft, newerOnServer: draft.baseVersion !== server.version, changes: summarizeChanges(savedDoc.current, draft.doc) })
    }
    ready.current = true
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Any change to the form: mark it and schedule a local backup. */
  React.useEffect(() => {
    const unsubscribe = store.subscribe((state, prev) => {
      if (state.doc === prev.doc || !ready.current) return
      if (statusRef.current !== "saving") setStatusBoth(state.doc === savedDoc.current ? "saved" : "dirty")
      if (!restoring.current) schedule()
    })
    const onHide = () => {
      if (document.visibilityState === "hidden") flush()
    }
    document.addEventListener("visibilitychange", onHide)
    window.addEventListener("pagehide", flush)
    return () => {
      unsubscribe()
      document.removeEventListener("visibilitychange", onHide)
      window.removeEventListener("pagehide", flush)
      flush()
    }
  }, [store, schedule, flush, setStatusBoth])

  const save = React.useCallback(async (): Promise<boolean> => {
    if (saving.current) return false
    const doc = store.getState().doc
    if (doc === savedDoc.current && statusRef.current !== "error") return true
    saving.current = true
    setStatusBoth("saving")
    let res: { ok: true; version: number; updatedAt: string; title?: string } | { ok: false; reason: "conflict"; server: ServerRecord } | { ok: false; reason: "network" }
    try {
      const saved = await api<SaveResponse>(`/forms/${formId}`, { method: "PUT", body: { document: doc, baseVersion: baseVersion.current } })
      res = { ok: true, ...saved }
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        const latest = e.body as ConflictResponse
        res = { ok: false, reason: "conflict", server: { doc: parseForm(latest.document), version: latest.version, updatedAt: latest.updatedAt } }
      } else {
        res = { ok: false, reason: "network" }
      }
    }
    saving.current = false

    if (res.ok) {
      baseVersion.current = res.version
      setVersion(res.version)
      savedDoc.current = doc
      setSavedAt(res.updatedAt)
      gate.commit({ doc, version: res.version, updatedAt: res.updatedAt, title: res.title })
      setStatusBoth(store.getState().doc === doc ? "saved" : "dirty")
      flush()
      toast.success("Saved")
      return true
    } else if (res.reason === "conflict") {
      setStatusBoth("error")
      setConflict(res.server)
      return false
    } else {
      setStatusBoth("error")
      toast.error("Couldn't save. Check your connection and try again. Your changes are still here.", { action: { label: "Retry", onClick: () => saveRef.current() } })
    }
    return false
  }, [store, formId, api, gate, flush, setStatusBoth])

  React.useEffect(() => {
    saveRef.current = () => void save()
  }, [save])

  const publish = React.useCallback(async () => {
    if (publishingRef.current) return
    publishingRef.current = true
    setPublishing(true)
    const ok = await save()
    if (ok) {
      publishForm(formId, savedDoc.current, baseVersion.current)
      toast.success("Published. Your form is live.")
    }
    publishingRef.current = false
    setPublishing(false)
  }, [save, formId])

  /* The workspace header's Publish button asks the builder to do it, so unsaved work is saved first. */
  React.useEffect(() => {
    const onRequest = () => void publish()
    window.addEventListener("builder:publish", onRequest)
    return () => window.removeEventListener("builder:publish", onRequest)
  }, [publish])

  /* Ctrl or Cmd + S, and a warning before leaving with unsaved work. */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault()
        void save()
      }
    }
    const onUnload = (e: BeforeUnloadEvent) => {
      if (statusRef.current !== "saved" && statusRef.current !== "drafted") e.preventDefault()
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("beforeunload", onUnload)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("beforeunload", onUnload)
    }
  }, [save])

  function keepBackup() {
    if (!restore) return
    loadDoc(restore.draft.doc)
    restoring.current = false
    setRestore(null)
    setStatusBoth("dirty")
    flush()
  }

  function discardBackup() {
    clearDraft(formId)
    restoring.current = false
    setRestore(null)
  }

  function takeLatest() {
    if (!conflict) return
    loadDoc(conflict.doc)
    baseVersion.current = conflict.version
    setVersion(conflict.version)
    savedDoc.current = store.getState().doc
    setSavedAt(conflict.updatedAt)
    setStatusBoth("saved")
    setConflict(null)
    flush()
  }

  function overwrite() {
    if (!conflict) return
    baseVersion.current = conflict.version
    setConflict(null)
    void save()
  }

  const value = React.useMemo(
    () => ({ status, savedAt, backupFailed, save: () => void save(), publish: () => void publish(), publishing, version, formId }),
    [status, savedAt, backupFailed, save, publish, publishing, version, formId]
  )

  return (
    <Ctx.Provider value={value}>
      {children}

      <Dialog open={!!restore} onOpenChange={() => {}}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>You have changes that weren&apos;t saved</DialogTitle>
            <DialogDescription>
              You made these changes {restore ? timeAgo(restore.draft.savedAt) : ""} but didn&apos;t click Save. Do you want to bring them back?
              {restore?.newerOnServer ? " Note: the form was updated after that, and your changes will replace the newer version when you save." : ""}
            </DialogDescription>
          </DialogHeader>
          <ul className="mx-4 mb-2 grid gap-1 rounded-lg border bg-muted/40 p-3 text-sm sm:mx-6">
            {restore?.changes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <DialogFooter className="flex-row justify-end gap-2">
            <Button variant="outline" onClick={discardBackup}>
              Discard changes
            </Button>
            <Button onClick={keepBackup}>Restore changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!conflict} onOpenChange={(o) => !o && setConflict(null)}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>This form was updated elsewhere</DialogTitle>
            <DialogDescription>
              A newer version was saved after you opened this page, maybe by a teammate or in another tab. You can load that version, or replace it with yours.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setConflict(null)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={takeLatest}>
              Load their version
            </Button>
            <Button onClick={overwrite}>Replace with mine</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  )
}
