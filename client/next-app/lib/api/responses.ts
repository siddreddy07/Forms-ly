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

export type SubmitResult = { ok: true; id: string } | { ok: false; reason: "closed" | "code" | "busy" | "network" | "invalid"; message?: string }

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
    if (res.status === 422) {
      const body = (await res.json().catch(() => null)) as { error?: string; errors?: Record<string, string> } | null
      return { ok: false, reason: "invalid", message: body?.errors ? Object.values(body.errors)[0] : body?.error }
    }
    return { ok: false, reason: "closed" }
  } catch {
    return { ok: false, reason: "network" }
  }
}

/* Sends one file straight to the storage with a permission the server signs for this form.
   Resolves with the upload's id, or an error message to show. */
export async function uploadFile(slug: string, file: File, code?: string): Promise<{ ok: true; fileId: string } | { ok: false; message: string }> {
  try {
    const authRes = await fetch(`${API_URL}/public/forms/${encodeURIComponent(slug)}/uploads`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    })
    if (!authRes.ok) {
      const body = (await authRes.json().catch(() => null)) as { error?: string } | null
      return { ok: false, message: body?.error ?? "Uploads aren't available right now." }
    }
    const auth = (await authRes.json()) as {
      uploadUrl: string
      publicKey: string
      token: string
      expire: number
      signature: string
      folder: string
      isPrivateFile: boolean
    }
    const form = new FormData()
    form.set("file", file)
    form.set("fileName", file.name)
    form.set("publicKey", auth.publicKey)
    form.set("signature", auth.signature)
    form.set("expire", String(auth.expire))
    form.set("token", auth.token)
    form.set("folder", auth.folder)
    form.set("isPrivateFile", String(auth.isPrivateFile))
    form.set("useUniqueFileName", "true")
    const up = await fetch(auth.uploadUrl, { method: "POST", body: form })
    if (!up.ok) return { ok: false, message: "The upload didn't go through. Try again." }
    const { fileId } = (await up.json()) as { fileId?: string }
    return fileId ? { ok: true, fileId } : { ok: false, message: "The upload didn't go through. Try again." }
  } catch {
    return { ok: false, message: "Couldn't upload. Check your connection and try again." }
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
