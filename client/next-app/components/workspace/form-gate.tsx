"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { FormCanvasFixture } from "@/components/skeletons/fixtures"
import { TabSkeleton } from "@/components/skeletons/loading"
import { Skeleton } from "@/components/skeletons/skeleton"
import { Button } from "@/components/ui/button"
import { ApiError, useApi } from "@/lib/api/http"
import type { FormWithDocument } from "@/lib/api/forms"
import { cacheServerRecord } from "@/lib/api/mock-server"
import type { FormSummary } from "@/lib/api/types"
import { parseForm, type FormDocument } from "@/lib/schema"

type Loaded = { form: FormSummary; doc: FormDocument; version: number; updatedAt: string }

type Actions = {
  /* Call after a successful save so the other tabs and the title show the newest copy. */
  commit: (next: { doc: FormDocument; version: number; updatedAt: string; title?: string }) => void
  /* Call after a rename so the header and the other tabs show the new name. */
  setTitle: (title: string) => void
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
  const { loaded, commit, setTitle } = useFormState()
  if (!loaded) throw new Error("useFormGate was used before the form loaded")
  return React.useMemo(() => ({ ...loaded, commit, setTitle }), [loaded, commit, setTitle])
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
        setLoaded({ form: data.form, doc, version: data.version, updatedAt: data.form.updatedAt })
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError && e.status === 404 ? "missing" : "failed")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api, formId, attempt])

  const commit = React.useCallback<Actions["commit"]>(
    (next) => {
      cacheServerRecord(formId, next.doc, next.version, next.updatedAt)
      setLoaded((prev) =>
        prev ? { ...prev, doc: next.doc, version: next.version, updatedAt: next.updatedAt, form: { ...prev.form, title: next.title ?? prev.form.title } } : prev
      )
      window.dispatchEvent(new Event("form:saved"))
    },
    [formId]
  )

  const setTitle = React.useCallback((title: string) => {
    setLoaded((prev) => (prev ? { ...prev, form: { ...prev.form, title } } : prev))
  }, [])

  const retry = React.useCallback(() => {
    setError(null)
    setAttempt((n) => n + 1)
  }, [])

  const value = React.useMemo(() => ({ loaded, error, retry, commit, setTitle }), [loaded, error, retry, commit, setTitle])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/* The page's main area. While the form loads it shows a skeleton of that area only, and never renders the
   tabs before they have their data. */
export function FormContent({ children }: { children: React.ReactNode }) {
  const { loaded, error, retry } = useFormState()
  const pathname = usePathname()

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

  /* Build and Design show the form on the page; the other tabs show a general content skeleton. */
  const showsForm = /\/(build|design)$/.test(pathname)
  return showsForm ? (
    <Skeleton name="form-canvas" loading fixture={<FormCanvasFixture />}>
      <FormCanvasFixture />
    </Skeleton>
  ) : (
    <TabSkeleton />
  )
}
