"use client"

import * as React from "react"
import Link from "next/link"

import { TabLoading } from "@/components/skeletons/tab-skeletons"
import { Button } from "@/components/ui/button"
import { ApiError, useApi } from "@/lib/api/http"
import type { FormWithDocument, PublishInfo, PublishResponse } from "@/lib/api/forms"
import { flushDesign, hydrateDesign, setDesignSaver, type DesignSaveResult } from "@/lib/api/mock-design"
import { cacheServerRecord } from "@/lib/api/mock-server"
import type { FormSummary } from "@/lib/api/types"
import { parseForm, type FormDocument } from "@/lib/schema"

type Loaded = { form: FormSummary; doc: FormDocument; version: number; updatedAt: string; publishInfo: PublishInfo }

/* How a publish attempt ended, so the page can say the right thing. */
export type PublishResult = { ok: true } | { ok: false; reason: "conflict" | "archived" | "failed" }

type Actions = {
  /* Call after a successful save so the other tabs and the title show the newest copy. */
  commit: (next: { doc: FormDocument; version: number; updatedAt: string; title?: string }) => void
  /* Call after a rename so the header and the other tabs show the new name. */
  setTitle: (title: string) => void
  /* Makes the saved version `baseVersion` live (the first time it also creates the link). */
  publish: (baseVersion: number) => Promise<PublishResult>
  /* Takes it offline. The link stays reserved for this form. */
  unpublish: () => Promise<boolean>
  /* Public or private. Shows the change at once and puts it back if the server says no. */
  setAccess: (access: "public" | "private") => Promise<boolean>
}

type State = Actions & {
  /* Null until the form has arrived from the backend. */
  loaded: Loaded | null
  error: "missing" | "failed" | null
  retry: () => void
}

const Ctx = React.createContext<State | null>(null)

/* For the header: the page chrome shows straight away, and only the name waits for the backend. */
export function useFormState() {
  const v = React.useContext(Ctx)
  if (!v) throw new Error("useFormState must be used inside FormGate")
  return v
}

/* For everything inside <FormContent>, which only renders once the form has loaded. */
export function useFormGate(): Loaded & Actions {
  const { loaded, commit, setTitle, publish, unpublish, setAccess } = useFormState()
  if (!loaded) throw new Error("useFormGate was used before the form loaded")
  return React.useMemo(() => ({ ...loaded, commit, setTitle, publish, unpublish, setAccess }), [loaded, commit, setTitle, publish, unpublish, setAccess])
}

/* Loads the form from the backend once for the whole form workspace (Build, Design, Share...).
   It never hides the page: the header, tabs and menus are plain UI and show immediately. */
export function FormGate({ formId, children }: { formId: string; children: React.ReactNode }) {
  const api = useApi()
  const [loaded, setLoaded] = React.useState<Loaded | null>(null)
  const [error, setError] = React.useState<State["error"]>(null)
  const [attempt, setAttempt] = React.useState(0)

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await api<FormWithDocument>(`/forms/${formId}`)
        if (cancelled) return
        const doc = parseForm(data.document)
        cacheServerRecord(formId, doc, data.version, data.form.updatedAt)
        hydrateDesign(formId, data.design)
        /* Publish state used to be kept in this browser. It lives on the server now, so drop the old copies. */
        try {
          window.localStorage.removeItem(`mock-server:meta:${formId}`)
          window.localStorage.removeItem(`mock-server:published:${formId}`)
        } catch {
          /* storage unavailable: nothing to remove */
        }
        setLoaded({ form: data.form, doc, version: data.version, updatedAt: data.form.updatedAt, publishInfo: data.publish })
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError && e.status === 404 ? "missing" : "failed")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api, formId, attempt])

  /* The Design tab saves its changes through here. It sends them a moment after the last change (see mock-design.ts). */
  React.useEffect(() => {
    setDesignSaver(async (id, design, keepalive): Promise<DesignSaveResult> => {
      try {
        await api(`/forms/${id}`, { method: "PATCH", body: { design }, keepalive })
        return { ok: true }
      } catch (e) {
        if (e instanceof ApiError) {
          /* Too many requests or a server problem: try again later. Other errors will not fix themselves. */
          if (e.status === 429 || e.status >= 500 || e.status === 408) return { ok: false, retry: true, waitSeconds: e.retryAfter }
          return { ok: false, retry: false }
        }
        return { ok: false, retry: true, waitSeconds: null }
      }
    })
    /* The tab is hidden or closing: send any waiting changes now. */
    const onHide = () => {
      if (document.visibilityState === "hidden") flushDesign(formId)
    }
    const onPageHide = () => flushDesign(formId)
    document.addEventListener("visibilitychange", onHide)
    window.addEventListener("pagehide", onPageHide)
    return () => {
      document.removeEventListener("visibilitychange", onHide)
      window.removeEventListener("pagehide", onPageHide)
      flushDesign(formId)
      setDesignSaver(null)
    }
  }, [api, formId])

  const commit = React.useCallback<Actions["commit"]>(
    (next) => {
      cacheServerRecord(formId, next.doc, next.version, next.updatedAt)
      setLoaded((prev) =>
        prev
          ? {
              ...prev,
              doc: next.doc,
              version: next.version,
              updatedAt: next.updatedAt,
              form: { ...prev.form, title: next.title ?? prev.form.title },
              /* Saving after publishing means the live copy is now behind. */
              publishInfo: { ...prev.publishInfo, hasChanges: prev.publishInfo.published && prev.publishInfo.publishedVersion !== next.version },
            }
          : prev
      )
      window.dispatchEvent(new Event("form:saved"))
    },
    [formId]
  )

  const setTitle = React.useCallback((title: string) => {
    setLoaded((prev) => (prev ? { ...prev, form: { ...prev.form, title } } : prev))
  }, [])

  const publish = React.useCallback<Actions["publish"]>(
    async (baseVersion) => {
      try {
        const res = await api<PublishResponse>(`/forms/${formId}/publish`, { method: "POST", body: { baseVersion } })
        setLoaded((prev) => (prev ? { ...prev, form: { ...prev.form, ...res.form }, publishInfo: res.publish } : prev))
        return { ok: true }
      } catch (e) {
        /* 409 either means "restore it first" (the body has a message) or "the form changed since". */
        if (e instanceof ApiError && e.status === 409) {
          return { ok: false, reason: (e.body as { error?: string } | null)?.error ? "archived" : "conflict" }
        }
        return { ok: false, reason: "failed" }
      }
    },
    [api, formId]
  )

  const unpublish = React.useCallback<Actions["unpublish"]>(async () => {
    try {
      const res = await api<PublishResponse>(`/forms/${formId}/unpublish`, { method: "POST" })
      setLoaded((prev) => (prev ? { ...prev, form: { ...prev.form, ...res.form }, publishInfo: res.publish } : prev))
      return true
    } catch {
      return false
    }
  }, [api, formId])

  const loadedRef = React.useRef(loaded)
  React.useEffect(() => {
    loadedRef.current = loaded
  }, [loaded])

  const setAccess = React.useCallback<Actions["setAccess"]>(
    async (access) => {
      const before = loadedRef.current?.form.access ?? "public"
      setLoaded((prev) => (prev ? { ...prev, form: { ...prev.form, access } } : prev))
      try {
        await api(`/forms/${formId}`, { method: "PATCH", body: { access } })
        return true
      } catch {
        setLoaded((prev) => (prev ? { ...prev, form: { ...prev.form, access: before } } : prev))
        return false
      }
    },
    [api, formId]
  )

  const retry = React.useCallback(() => {
    setError(null)
    setAttempt((n) => n + 1)
  }, [])

  const value = React.useMemo(
    () => ({ loaded, error, retry, commit, setTitle, publish, unpublish, setAccess }),
    [loaded, error, retry, commit, setTitle, publish, unpublish, setAccess]
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/* The page's main area. While the form loads it shows a skeleton of that area only, and never renders the
   tabs before they have their data. */
export function FormContent({ children }: { children: React.ReactNode }) {
  const { loaded, error, retry } = useFormState()

  if (loaded) return <>{children}</>

  if (error) {
    return (
      <div className="mx-auto grid max-w-sm gap-3 px-4 py-24 text-center">
        <h2 className="font-display text-2xl font-medium tracking-tight">{error === "missing" ? "Form not found" : "Couldn't load this form"}</h2>
        <p className="text-sm text-muted-foreground">
          {error === "missing" ? "It may have been deleted, or it belongs to another account." : "Check your connection and try again."}
        </p>
        <div className="flex justify-center gap-2">
          <Link href="/dashboard" className="inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium">
            Back to your forms
          </Link>
          {error === "failed" && <Button onClick={retry}>Try again</Button>}
        </div>
      </div>
    )
  }

  return <TabLoading />
}
