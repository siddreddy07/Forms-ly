"use client"

import * as React from "react"

import { useApi } from "@/lib/api/http"

export type Range = "7" | "30" | "all"

/* What GET /forms/:id/analytics answers: numbers only (see server/src/libs/analytics.ts). */
export type Question =
  | { id: string; label: string; kind: "choice"; answered: number; bars: { label: string; count: number }[] }
  | { id: string; label: string; kind: "rating"; answered: number; average: number; bars: { label: string; count: number }[] }
  | { id: string; label: string; kind: "number"; answered: number; average: number; min: number; max: number }
  | { id: string; label: string; kind: "other"; answered: number }

export type Analytics = {
  total: number
  inRange: number
  since: string
  daysActive: number
  avgDurationMs: number | null
  series: { date: string; count: number }[]
  devices: { phone: number; tablet: number; desktop: number }
  questions: Question[]
}

export type AnalyticsState = { status: "loading" } | { status: "error" } | { status: "ready"; data: Analytics }

/* Loads the numbers for one form. Changing the range keeps the old numbers on screen until the new ones arrive. */
export function useAnalytics(formId: string, range: Range) {
  const api = useApi()
  const [state, setState] = React.useState<AnalyticsState>({ status: "loading" })
  const [attempt, setAttempt] = React.useState(0)

  React.useEffect(() => {
    let cancelled = false
    api<Analytics>(`/forms/${formId}/analytics?range=${range}&tz=${new Date().getTimezoneOffset()}`)
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data })
      })
      .catch(() => {
        if (!cancelled) setState((s) => (s.status === "ready" ? s : { status: "error" }))
      })
    return () => {
      cancelled = true
    }
  }, [api, formId, range, attempt])

  const retry = React.useCallback(() => {
    setState({ status: "loading" })
    setAttempt((n) => n + 1)
  }, [])

  return { state, retry }
}

export function formatDuration(ms: number | null) {
  if (ms === null) return "-"
  const s = Math.round(ms / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`
}
