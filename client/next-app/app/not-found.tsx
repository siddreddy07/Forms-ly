import type { Metadata } from "next"

import { NotFoundScene } from "@/components/not-found/not-found-scene"

export const metadata: Metadata = { title: "Page not found" }

/* Any address that doesn't exist. */
export default function NotFound() {
  return <NotFoundScene title="Page not found" text="Check the address for typos, or head back home." />
}
