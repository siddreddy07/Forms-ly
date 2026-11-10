"use client"

import * as React from "react"

/* DEV ONLY stand-in for the real plan check (see lib/plans.ts in FrontendPlan.md).
   The Pro switch in the Design tab flips this in the browser so the locked and unlocked
   screens can be reviewed. Replace with the real subscription state from the backend. */
const KEY = "mock-server:dev-pro"

const listeners = new Set<() => void>()
function subscribe(cb: () => void) {
  listeners.add(cb)
  window.addEventListener("storage", cb)
  return () => {
    listeners.delete(cb)
    window.removeEventListener("storage", cb)
  }
}

export function setDevPro(on: boolean) {
  try {
    window.localStorage.setItem(KEY, on ? "1" : "0")
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

/* False on the server and until the browser has read the value. */
export function useIsPro(): boolean {
  return React.useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(KEY) === "1"
      } catch {
        return false
      }
    },
    () => false
  )
}
