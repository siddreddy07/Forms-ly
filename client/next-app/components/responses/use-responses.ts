"use client"

import * as React from "react"

import { parseResponses, responsesKey, subscribeResponses, type StoredResponse } from "@/lib/api/mock-responses"

/* Null until the page is in the browser. Newest first. */
export function useResponses(formId: string): StoredResponse[] | null {
  const raw = React.useSyncExternalStore(
    subscribeResponses,
    () => {
      try {
        return window.localStorage.getItem(responsesKey(formId)) ?? ""
      } catch {
        return ""
      }
    },
    () => null
  )
  return React.useMemo(() => (raw === null ? null : parseResponses(raw || null)), [raw])
}
