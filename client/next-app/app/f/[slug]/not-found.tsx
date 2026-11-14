import type { Metadata } from "next"

import { NotFoundScene } from "@/components/not-found/not-found-scene"

export const metadata: Metadata = { title: "Form not found" }

/* A form link nobody owns: mistyped, or the owner deleted the form. */
export default function FormNotFound() {
  return <NotFoundScene title="Form not found" text="The link may have a typo, or the owner deleted this form." />
}
