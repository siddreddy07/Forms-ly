"use client"

import * as React from "react"

import { designKey, parseDesign, subscribeDesign, type FormDesign } from "@/lib/api/mock-design"

/* Null until the page is in the browser, so nothing flashes the wrong colour. */
export function useFormDesign(formId: string): FormDesign | null {
  const raw = React.useSyncExternalStore(
    subscribeDesign,
    () => {
      try {
        return window.localStorage.getItem(designKey(formId)) ?? ""
      } catch {
        return ""
      }
    },
    () => null
  )
  return React.useMemo(() => (raw === null ? null : parseDesign(raw || null)), [raw])
}
