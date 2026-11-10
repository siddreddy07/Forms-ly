"use client"

import { ClockIcon } from "lucide-react"

import { Highlighter } from "@/components/ui/highlighter"
import { closingLabel } from "@/lib/time"

/* The line below the public form's card and badge: when the form stops taking answers.
   The date part is highlighted, so it is easy to spot without reading the whole line. */
export function FormClosingNotice({ closesAt }: { closesAt: string }) {
  const label = closingLabel(closesAt)
  if (!label) return null

  return (
    <p className="mt-5 flex items-center justify-center gap-2 text-sm text-muted-foreground">
      <ClockIcon className="size-4 shrink-0" aria-hidden="true" />
      <span>
        Closes{" "}
        <Highlighter action="underline" color="#f59e0b" strokeWidth={2} padding={1}>
          {label}
        </Highlighter>
      </span>
    </p>
  )
}
