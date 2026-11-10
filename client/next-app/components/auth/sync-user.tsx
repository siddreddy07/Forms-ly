"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

/* Once someone is signed in, tell our backend. It creates their user row the first time. */
export function SyncUser() {
  const { isSignedIn, userId, getToken } = useAuth()
  const doneFor = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!isSignedIn || !userId || doneFor.current === userId) return
    doneFor.current = userId
    ;(async () => {
      try {
        const token = await getToken()
        const res = await fetch(`${API_URL}/me`, { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) throw new Error(String(res.status))
      } catch (error) {
        doneFor.current = null // try again on the next page load
        console.error("Could not reach the backend:", error)
      }
    })()
  }, [isSignedIn, userId, getToken])

  return null
}
