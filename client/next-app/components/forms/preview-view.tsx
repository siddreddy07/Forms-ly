"use client"

import * as React from "react"
import Link from "next/link"

import { FormFrame } from "@/components/design/form-frame"
import { ThemedBackground } from "@/components/design/themed-background"
import { FormRenderer } from "@/components/renderer/form-renderer"
import { PublicFormSkeleton } from "@/components/skeletons/loading"
import { ApiError, useApi } from "@/lib/api/http"
import type { FormWithDocument } from "@/lib/api/forms"
import { parseDesign, thankYouFor } from "@/lib/api/mock-design"
import { parseForm } from "@/lib/schema"

/* What the owner sees when they press Preview: their latest saved form in its design, as visitors would see it.
   Nothing here is sent anywhere. */
export function PreviewView({ formId }: { formId: string }) {
  const api = useApi()
  const [data, setData] = React.useState<FormWithDocument | null>(null)
  const [error, setError] = React.useState<"missing" | "failed" | null>(null)

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await api<FormWithDocument>(`/forms/${formId}`)
        if (!cancelled) setData(res)
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError && e.status === 404 ? "missing" : "failed")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api, formId])

  const doc = React.useMemo(() => (data ? parseForm(data.document) : null), [data])
  const design = React.useMemo(() => parseDesign(data ? JSON.stringify(data.design ?? {}) : null), [data])

  if (error) {
    return (
      <main className="mx-auto grid min-h-svh max-w-sm content-center gap-3 px-4 text-center">
        <h1 className="font-display text-2xl font-medium">{error === "missing" ? "Form not found" : "We couldn't load the preview"}</h1>
        <p className="text-sm text-muted-foreground">
          {error === "missing" ? "It may have been deleted, or it belongs to another account." : "Check your connection and try again."}
        </p>
        <Link href="/dashboard" className="mx-auto inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium">
          Back to your forms
        </Link>
      </main>
    )
  }
  if (!data || !doc) return <PublicFormSkeleton />

  return (
    <ThemedBackground as="main" design={design} className="min-h-svh px-2 py-3 sm:px-5 sm:py-6 lg:px-4 lg:py-12">
      <FormFrame design={design} title={!doc.header?.title ? data.form.title : undefined}>
        <p className="mb-4 rounded-lg border bg-muted/40 p-2.5 text-center text-sm">Preview. Only you can see this.</p>
        <FormRenderer form={doc} allowAnother showEmptyBanner thankYou={thankYouFor(design, { redirect: false })} />
      </FormFrame>
    </ThemedBackground>
  )
}
