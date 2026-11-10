"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"

import { API_URL } from "@/lib/api/config"

export { API_URL }

/* The server answered, but not with success. `status` is the HTTP code (400, 404, 409...). */
export class ApiError extends Error {
  status: number
  body: unknown
  /* Seconds the server asked us to wait before trying again (sent with 429). */
  retryAfter: number | null
  constructor(status: number, body: unknown, retryAfter: number | null = null) {
    super(`Request failed with ${status}`)
    this.status = status
    this.body = body
    this.retryAfter = retryAfter
  }
}

/* Returns a function that calls our backend with the signed-in user's token.
   If the server can't be reached at all, fetch throws a TypeError (treat that as "offline"). */
export function useApi() {
  const { getToken } = useAuth()
  return React.useCallback(
    async <T = unknown>(path: string, options: { method?: string; body?: unknown; keepalive?: boolean } = {}): Promise<T> => {
      const token = await getToken()
      const res = await fetch(`${API_URL}${path}`, {
        method: options.method ?? "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        /* Lets a request finish even while the page is closing (the browser allows about 64KB). */
        keepalive: options.keepalive,
      })
      const text = await res.text()
      const data = text ? JSON.parse(text) : null
      if (!res.ok) {
        const wait = Number(res.headers.get("retry-after"))
        throw new ApiError(res.status, data, Number.isFinite(wait) && wait > 0 ? wait : null)
      }
      return data as T
    },
    [getToken]
  )
}
