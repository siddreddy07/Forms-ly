import * as React from "react"

/* False while the page renders on the server and during the first client render, then true. Anything with random ids
   (a sample form) waits for this, so the server and the browser never disagree about them. */
export function useMounted() {
  return React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
}
