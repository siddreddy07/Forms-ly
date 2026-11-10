"use client"

import * as React from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { ApiError, useApi } from "@/lib/api/http"
import type { FormWithDocument } from "@/lib/api/forms"
import { cacheServerRecord } from "@/lib/api/mock-server"
import type { FormSummary } from "@/lib/api/types"
import { parseForm, type FormDocument } from "@/lib/schema"

type Loaded = { form: FormSummary; doc: FormDocument; version: number; updatedAt: string }

type Gate = Loaded & {
  /* Call after a successful save so the other tabs and the title show the newest copy. */
  /* Call after a rename so the header and the other tabs show the new name. */
  setTitle: (title: string) => void
  commit: (next: { doc: FormDocument; version: number; updatedAt: string; title?: string }) => void
}

const Ctx = React.createContext<Gate | null>(null)

export function useFormGate() {
  const v = React.useContext(Ctx)
  if (!v) throw new Error("useFormGate must be used inside FormGate")
  return v
}

/* Loads the form from the backend once for the whole form workspace (Build, Design, Share...).
   Tabs render only after it has loaded, so none of them ever starts from a blank form by mistake. */
export function FormGate({ formId, children }: { formId: string; children: React.ReactNode }) {
  const api = useApi()
  const [loaded, setLoaded] = React.useState<Loaded | null>(null)
  const [error, setError] = React.useState<"missing" | "failed" | null>(null)
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

  const commit = React.useCallback<Gate["commit"]>(
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

  const value = React.useMemo(() => (loaded ? { ...loaded, commit, setTitle } : null), [loaded, commit, setTitle])

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
          {error === "failed" && (
            <Button
              onClick={() => {
                setError(null)
                setAttempt((n) => n + 1)
              }}
            >
              Try again
            </Button>
          )}
        </div>
      </div>
    )
  }
  if (!value) return <div className="mx-auto h-64 max-w-6xl animate-pulse px-4 py-8" />
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
