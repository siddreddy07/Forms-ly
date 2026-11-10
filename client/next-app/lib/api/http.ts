"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

/* The server answered, but not with success. `status` is the HTTP code (400, 404, 409...). */
export class ApiError extends Error {
  status: number
  body: unknown
  constructor(status: number, body: unknown) {
    super(`Request failed with ${status}`)
    this.status = status
    this.body = body
  }
}

/* Returns a function that calls our backend with the signed-in user's token.
   If the server can't be reached at all, fetch throws a TypeError (treat that as "offline"). */
export function useApi() {
  const { getToken } = useAuth()
  return React.useCallback(
    async <T = unknown>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> => {
      const token = await getToken()
      const res = await fetch(`${API_URL}${path}`, {
        method: options.method ?? "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      })
      const text = await res.text()
      const data = text ? JSON.parse(text) : null
      if (!res.ok) throw new ApiError(res.status, data)
      return data as T
    },
    [getToken]
  )
}
