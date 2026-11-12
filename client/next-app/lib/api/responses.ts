"use client"

import * as React from "react"

import { API_URL } from "@/lib/api/config"
import { useApi } from "@/lib/api/http"
import type { ResponseFilter } from "@/lib/responses/filter"
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

/* A field the table can be filtered by. The server builds the list from the form as it is now and from every older
   version that has responses, and leaves out questions that cannot be compared (such as long paragraphs). */
export type FilterField = {
  id: string
  label: string
  type: string
  kind: "text" | "number" | "rating" | "date" | "time" | "choice" | "yes_no" | "file"
  options: { id: string; label: string }[]
  scale: { min: number; max: number } | null
  /* false: removed from the form, but older responses still answer it. */
  current: boolean
}

export type ResponsesState =
  | { status: "loading" }
  | { status: "error" }
  | {
      status: "ready"
      items: StoredResponse[]
      /* How many responses match the search and filter, across all pages. */
      total: number
      /* Every response for the form, whatever the search and filter. */
      allTotal: number
      nextCursor: string | null
      /* The questions as columns, built by the server from every version that has responses. */
      columns: Block[]
      publishedAt: string | null
      createdAt: string
      filterFields: FilterField[]
    }

type ResponsesPage = Omit<Extract<ResponsesState, { status: "ready" }>, "status">

/* How many responses to ask for at a time. "Load more" fetches the next batch. */
const PAGE_SIZE = 50

/* The signed-in owner's responses for one form, newest first, plus a way to delete one.
   The search and filter run on the server, so `total` and the pages always agree. */
export function useResponses(formId: string, query: { q: string; filter: ResponseFilter }) {
  const api = useApi()
  const [state, setState] = React.useState<ResponsesState>({ status: "loading" })
  const [attempt, setAttempt] = React.useState(0)
  const [loadingMore, setLoadingMore] = React.useState(false)
  /* The filter is an object, so compare it by its contents, not by identity. */
  const filterKey = JSON.stringify(query.filter)

  const pagePath = React.useCallback(
    (cursor?: string | null) => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), filter: filterKey })
      if (query.q) params.set("q", query.q)
      if (cursor) params.set("cursor", cursor)
      return `/forms/${formId}/responses?${params.toString()}`
    },
    [formId, query.q, filterKey]
  )

  React.useEffect(() => {
    let cancelled = false
    api<ResponsesPage>(pagePath())
      .then((data) => {
        if (!cancelled) setState({ status: "ready", ...data })
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" })
      })
    return () => {
      cancelled = true
    }
  }, [api, pagePath, attempt])

  const retry = React.useCallback(() => {
    setState({ status: "loading" })
    setAttempt((n) => n + 1)
  }, [])

  /* Adds the next page. Returns false so the caller can show a message. */
  const loadMore = React.useCallback(async () => {
    if (state.status !== "ready" || !state.nextCursor || loadingMore) return false
    setLoadingMore(true)
    try {
      const data = await api<ResponsesPage>(pagePath(state.nextCursor))
      setState((s) => {
        if (s.status !== "ready") return s
        const seen = new Set(s.items.map((r) => r.id))
        return { ...s, ...data, items: [...s.items, ...data.items.filter((r) => !seen.has(r.id))] }
      })
      return true
    } catch {
      return false
    } finally {
      setLoadingMore(false)
    }
  }, [api, pagePath, state, loadingMore])

  /* Takes the row out straight away and puts it back if the server says no. */
  const remove = React.useCallback(
    async (id: string) => {
      let removed: StoredResponse | undefined
      setState((s) => {
        if (s.status !== "ready") return s
        removed = s.items.find((r) => r.id === id)
        return {
          ...s,
          items: s.items.filter((r) => r.id !== id),
          total: Math.max(0, s.total - 1),
          allTotal: Math.max(0, s.allTotal - 1),
        }
      })
      try {
        await api(`/forms/${formId}/responses/${id}`, { method: "DELETE" })
        return true
      } catch {
        setState((s) =>
          s.status === "ready" && removed
            ? {
                ...s,
                items: [...s.items, removed].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
                total: s.total + 1,
                allTotal: s.allTotal + 1,
              }
            : s
        )
        return false
      }
    },
    [api, formId]
  )

  return { state, retry, remove, loadMore, loadingMore }
}

/* Downloads the XLSX spreadsheet the server builds. Same search and filter as the table, but every page of it.
   Uses fetch directly (not useApi) because the answer is a file, not JSON. */
export async function exportResponsesXlsx(
  token: string | null,
  formId: string,
  query: { q: string; filter: ResponseFilter }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const params = new URLSearchParams({ filter: JSON.stringify(query.filter) })
  if (query.q) params.set("q", query.q)
  try {
    const res = await fetch(`${API_URL}/forms/${formId}/responses/export.xlsx?${params.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) return { ok: false, message: "Couldn't build the spreadsheet. Try again." }
    const blob = await res.blob()
    const disposition = res.headers.get("content-disposition") ?? ""
    /* The server names the file after the form's title; add today's date (the user's own day), e.g. My Form-2026-11-11.xlsx */
    const star = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1]
    const plain = /filename="?([^";]+)"?/.exec(disposition)?.[1]
    const base = (star ? decodeURIComponent(star) : (plain ?? "responses")).replace(/\.xlsx$/i, "")
    const now = new Date()
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
    const name = `${base}-${day}.xlsx`
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
    return { ok: true }
  } catch {
    return { ok: false, message: "Couldn't download the spreadsheet. Check your connection and try again." }
  }
}
