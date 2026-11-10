"use client"

import * as React from "react"
import { toast } from "sonner"

import { useBuilderStore } from "@/components/builder/builder-context"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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

/* Autosave to the server. Every save is a database write, so we save in bursts, not on every keystroke:
   - IDLE: save once you stop editing for 4 seconds.
   - MAX_WAIT: if you keep editing without a pause, still save at least every 30 seconds.
   - Nothing is sent when the content is the same as what the server already has, even if the editor rebuilt it.
   - Only one save runs at a time. Edits made while it runs are sent in the next one.
   - If a save fails (offline, server error), retry after 3s, 6s, 12s... up to 60s, with a little randomness. */
const AUTOSAVE_IDLE_MS = 4000
const AUTOSAVE_MAX_WAIT_MS = 30000
const RETRY_BASE_MS = 3000
const RETRY_MAX_MS = 60000
/* Browsers only let a request finish after the page closes if it is under about 64KB. */
const KEEPALIVE_MAX_BYTES = 60000

type SaveOptions = { silent?: boolean; keepalive?: boolean }
type SaveOutcome =
  | { ok: true; version: number; updatedAt: string; title?: string }
  | { ok: false; reason: "conflict"; server: ServerRecord }
  | { ok: false; reason: "retry"; waitSeconds: number | null }
  | { ok: false; reason: "rejected" }

const sameDoc = (a: FormDocument, b: FormDocument) => JSON.stringify(a) === JSON.stringify(b)
/* Compares what is in the editor with what the server has, by content (the editor sometimes rebuilds the same form). */
const isChanged = (doc: FormDocument, saved: FormDocument) => doc !== saved && !sameDoc(doc, saved)

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
  const inflight = React.useRef<Promise<boolean> | null>(null)
  const autoTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoMaxTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const failures = React.useRef(0)
  /* Autosave stays off while a conflict is waiting for an answer, or after the server rejected the form. */
  const paused = React.useRef(false)
  const publishingRef = React.useRef(false)
  const statusRef = React.useRef<SaveStatus>("saved")
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const maxTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveRef = React.useRef<(options?: SaveOptions) => Promise<boolean>>(async () => false)

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
    const ok = writeDraft(formId, { doc, baseVersion: baseVersion.current, savedAt: new Date().toISOString(), dirty: isChanged(doc, savedDoc.current) })
    setBackupFailed(!ok)
    if (ok && isChanged(doc, savedDoc.current) && statusRef.current === "dirty") setStatusBoth("drafted")
  }, [store, formId, setStatusBoth])

  const schedule = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(flush, DEBOUNCE_MS)
    if (!maxTimer.current) maxTimer.current = setTimeout(flush, MAX_WAIT_MS)
  }, [flush])

  const clearAutosave = React.useCallback(() => {
    if (autoTimer.current) clearTimeout(autoTimer.current)
    if (autoMaxTimer.current) clearTimeout(autoMaxTimer.current)
    if (retryTimer.current) clearTimeout(retryTimer.current)
    autoTimer.current = autoMaxTimer.current = retryTimer.current = null
  }, [])

  const autosaveNow = React.useCallback(() => {
    clearAutosave()
    if (!ready.current || restoring.current || paused.current) return
    if (!isChanged(store.getState().doc, savedDoc.current)) {
      /* The editor rebuilt the same content: there is nothing to send, so it counts as saved. */
      if (statusRef.current === "dirty" || statusRef.current === "drafted") setStatusBoth("saved")
      return
    }
    /* Offline: the local backup keeps the work safe, and we try again when the connection returns. */
    if (typeof navigator !== "undefined" && navigator.onLine === false) return
    void saveRef.current({ silent: true })
  }, [clearAutosave, store, setStatusBoth])

  /* Called on every edit: wait for a pause, but never longer than the max wait. */
  const scheduleAutosave = React.useCallback(() => {
    if (!ready.current || restoring.current || paused.current) return
    if (retryTimer.current) clearTimeout(retryTimer.current)
    retryTimer.current = null
    if (autoTimer.current) clearTimeout(autoTimer.current)
    autoTimer.current = setTimeout(autosaveNow, AUTOSAVE_IDLE_MS)
    if (!autoMaxTimer.current) autoMaxTimer.current = setTimeout(autosaveNow, AUTOSAVE_MAX_WAIT_MS)
  }, [autosaveNow])

  /* The page is being hidden or closed: send what we have right now. */
  const autosaveBeforeLeaving = React.useCallback(() => {
    clearAutosave()
    if (!ready.current || restoring.current || paused.current) return
    const doc = store.getState().doc
    if (!isChanged(doc, savedDoc.current)) return
    void saveRef.current({ silent: true, keepalive: JSON.stringify(doc).length < KEEPALIVE_MAX_BYTES })
  }, [clearAutosave, store])

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
      scheduleAutosave()
    })
    const onHide = () => {
      if (document.visibilityState === "hidden") {
        flush()
        autosaveBeforeLeaving()
      }
    }
    const onPageHide = () => {
      flush()
      autosaveBeforeLeaving()
    }
    /* Back online: save whatever piled up while offline. */
    const onOnline = () => autosaveNow()
    document.addEventListener("visibilitychange", onHide)
    window.addEventListener("pagehide", onPageHide)
    window.addEventListener("online", onOnline)
    return () => {
      unsubscribe()
      document.removeEventListener("visibilitychange", onHide)
      window.removeEventListener("pagehide", onPageHide)
      window.removeEventListener("online", onOnline)
      flush()
      /* Leaving the builder (for example to the Design tab): save what is left. */
      autosaveBeforeLeaving()
    }
  }, [store, schedule, flush, setStatusBoth, scheduleAutosave, autosaveBeforeLeaving, autosaveNow])

  /* One request to the server. Call save() instead, which makes sure only one runs at a time. */
  const send = React.useCallback(
    async (doc: FormDocument, keepalive: boolean): Promise<SaveOutcome> => {
      try {
        const saved = await api<SaveResponse>(`/forms/${formId}`, { method: "PUT", body: { document: doc, baseVersion: baseVersion.current }, keepalive })
        return { ok: true, ...saved }
      } catch (e) {
        if (e instanceof ApiError) {
          if (e.status === 409) {
            const latest = e.body as ConflictResponse
            return { ok: false, reason: "conflict", server: { doc: parseForm(latest.document), version: latest.version, updatedAt: latest.updatedAt } }
          }
          /* Too many saves, or a server problem: worth trying again later. Other errors (bad form, no access) won't fix themselves. */
          if (e.status === 429 || e.status >= 500 || e.status === 408) return { ok: false, reason: "retry", waitSeconds: e.retryAfter }
          return { ok: false, reason: "rejected" }
        }
        return { ok: false, reason: "retry", waitSeconds: null }
      }
    },
    [api, formId]
  )

  const doSave = React.useCallback(
    async ({ silent = false, keepalive = false }: SaveOptions): Promise<boolean> => {
      const doc = store.getState().doc
      if (!isChanged(doc, savedDoc.current) && statusRef.current !== "error") {
        /* Same content as the server has: nothing to send. */
        savedDoc.current = doc
        if (statusRef.current !== "saved") setStatusBoth("saved")
        return true
      }
      setStatusBoth("saving")
      const res = await send(doc, keepalive)

      if (res.ok) {
        failures.current = 0
        baseVersion.current = res.version
        setVersion(res.version)
        savedDoc.current = doc
        setSavedAt(res.updatedAt)
        gate.commit({ doc, version: res.version, updatedAt: res.updatedAt, title: res.title })
        const editedMeanwhile = store.getState().doc !== doc
        setStatusBoth(editedMeanwhile ? "dirty" : "saved")
        flush()
        if (!silent) toast.success("Saved")
        /* Edits made while this save ran go out in the next one. */
        if (editedMeanwhile) scheduleAutosave()
        return true
      }

      setStatusBoth("error")
      if (res.reason === "conflict") {
        paused.current = true
        setConflict(res.server)
      } else if (res.reason === "rejected") {
        paused.current = true
        toast.error("This form couldn't be saved. Your changes are still here; try Save again.", { action: { label: "Retry", onClick: () => void saveRef.current() } })
      } else {
        /* Try again with growing gaps (3s, 6s, 12s... up to 60s) plus a little randomness, or when the server says. */
        failures.current += 1
        const backoff = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** (failures.current - 1))
        const wait = res.waitSeconds ? res.waitSeconds * 1000 : backoff + Math.random() * 1000
        if (retryTimer.current) clearTimeout(retryTimer.current)
        retryTimer.current = setTimeout(autosaveNow, wait)
        /* Say it once, not on every retry. */
        if (!silent || failures.current === 1) {
          toast.error("Couldn't save. We'll keep trying. Your changes are still here.", { action: { label: "Retry now", onClick: () => void saveRef.current() } })
        }
      }
      return false
    },
    [store, send, gate, flush, scheduleAutosave, autosaveNow, setStatusBoth]
  )

  /* Saves the form. If a save is already running, waits for it first, so two never run together. */
  const save = React.useCallback(
    async (options: SaveOptions = {}): Promise<boolean> => {
      /* Clicking Save (or publishing) always tries again, even after a failure. */
      if (!options.silent) paused.current = false
      while (inflight.current) await inflight.current
      const run = doSave(options)
      inflight.current = run
      try {
        return await run
      } finally {
        if (inflight.current === run) inflight.current = null
      }
    },
    [doSave]
  )

  React.useEffect(() => {
    saveRef.current = (options) => save(options)
  }, [save])

  const publish = React.useCallback(async () => {
    if (publishingRef.current) return
    publishingRef.current = true
    setPublishing(true)
    const wasLive = gate.publishInfo.published
    const ok = await save()
    if (ok) {
      const result = await gate.publish(baseVersion.current)
      if (result.ok) toast.success(wasLive ? "Updated. Your changes are live." : "Published. Your form is live.")
      else if (result.reason === "archived") toast.error("Restore this form before publishing it.")
      else if (result.reason === "conflict") toast.error("This form changed somewhere else. Reload the page and try again.")
      else toast.error("Couldn't publish. Check your connection and try again.")
    }
    publishingRef.current = false
    setPublishing(false)
  }, [save, gate])

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
    scheduleAutosave()
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
    paused.current = false
    failures.current = 0
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
