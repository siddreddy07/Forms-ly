"use client"

import * as React from "react"

import { API_URL } from "@/lib/api/config"
import { useApi } from "@/lib/api/http"
import type { Answers, Block } from "@/lib/schema"

/* What the backend sends for responses (see server/src/routes/forms.routes.ts and public.routes.ts).
   File answers keep only name and size. */
export type StoredResponse = {
  id: string
  formId: string
  formVersion: number | null
  submittedAt: string
  durationMs: number | null
  device?: "phone" | "tablet" | "desktop" | null
  /* The questions as they were when this was submitted, so columns always match the answers. */
  fields?: Block[]
  answers: Answers
}

export type SubmitResult = { ok: true; id: string } | { ok: false; reason: "closed" | "code" | "busy" | "network" }

/* Sends one filled-in form. No sign-in: this is what a visitor's browser calls. */
export async function submitResponse(
  slug: string,
  input: { answers: Answers; durationMs: number | null; device: StoredResponse["device"]; code?: string }
): Promise<SubmitResult> {
  try {
    const res = await fetch(`${API_URL}/public/forms/${encodeURIComponent(slug)}/responses`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        answers: JSON.parse(JSON.stringify(input.answers)),
        durationMs: input.durationMs,
        device: input.device,
        code: input.code,
      }),
    })
    if (res.status === 201) return { ok: true, id: ((await res.json()) as { id: string }).id }
    if (res.status === 429) return { ok: false, reason: "busy" }
    if (res.status === 403) return { ok: false, reason: "code" }
    return { ok: false, reason: "closed" }
  } catch {
    return { ok: false, reason: "network" }
  }
}

export type ResponsesState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; items: StoredResponse[]; total: number; publishedAt: string | null; createdAt: string }

/* The signed-in owner's responses for one form, newest first, plus a way to delete one. */
export function useResponses(formId: string) {
  const api = useApi()
  const [state, setState] = React.useState<ResponsesState>({ status: "loading" })
  const [attempt, setAttempt] = React.useState(0)

  React.useEffect(() => {
    let cancelled = false
    api<{ items: StoredResponse[]; total: number; publishedAt: string | null; createdAt: string }>(`/forms/${formId}/responses`)
      .then((data) => {
        if (!cancelled) setState({ status: "ready", ...data })
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" })
      })
    return () => {
      cancelled = true
    }
  }, [api, formId, attempt])

  const retry = React.useCallback(() => {
    setState({ status: "loading" })
    setAttempt((n) => n + 1)
  }, [])

  /* Takes the row out straight away and puts it back if the server says no. */
  const remove = React.useCallback(
    async (id: string) => {
      let removed: StoredResponse | undefined
      setState((s) => {
        if (s.status !== "ready") return s
        removed = s.items.find((r) => r.id === id)
        return { ...s, items: s.items.filter((r) => r.id !== id), total: Math.max(0, s.total - 1) }
      })
      try {
        await api(`/forms/${formId}/responses/${id}`, { method: "DELETE" })
        return true
      } catch {
        setState((s) =>
          s.status === "ready" && removed
            ? { ...s, items: [...s.items, removed].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)), total: s.total + 1 }
            : s
        )
        return false
      }
    },
    [api, formId]
  )

  return { state, retry, remove }
}
