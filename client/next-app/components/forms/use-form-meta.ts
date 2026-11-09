"use client"

import * as React from "react"

import { metaKey, parseMeta, subscribeMeta, type FormMeta } from "@/lib/api/mock-meta"
import { mockForms } from "@/lib/api/mock-forms"

/* Publish and access state of a form. Null until the page is in the browser, so nothing flashes wrong. */
export function useFormMeta(formId: string): FormMeta | null {
  const raw = React.useSyncExternalStore(
    subscribeMeta,
    () => {
      try {
        return window.localStorage.getItem(metaKey(formId)) ?? ""
      } catch {
        return ""
      }
    },
    () => null
  )
  return React.useMemo(() => {
    if (raw === null) return null
    const fallback = mockForms.find((f) => f.id === formId)?.status === "published"
    return parseMeta(raw || null, fallback)
  }, [raw, formId])
}

export function useOrigin() {
  return React.useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => ""
  )
}
