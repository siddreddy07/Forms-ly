import * as React from "react"

/* The address of this site (for example https://app.example.com). Empty while the page renders on the server. */
export function useOrigin() {
  return React.useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => ""
  )
}
