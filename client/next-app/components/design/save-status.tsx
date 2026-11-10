"use client"

import * as React from "react"
import { AlertCircleIcon } from "lucide-react"
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle"
import { Check } from "@/components/animate-ui/icons/check"

import { getSaveState, subscribeSaveState } from "@/lib/api/mock-design"
import { cn } from "@/lib/utils"

/* "Saving", "Saved at 3:42 PM" or an error, so people know their design changes are kept.
   On small screens only the icon shows; the words are still read out to screen readers. */
export function SaveStatus({ formId, className }: { formId: string; className?: string }) {
  const state = React.useSyncExternalStore(
    subscribeSaveState,
    () => getSaveState(formId),
    () => getSaveState(formId)
  )

  const time = state.savedAt ? new Date(state.savedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : null
  const label =
    state.status === "saving"
      ? "Saving..."
      : state.status === "error"
        ? "Couldn't save. We'll keep trying."
        : state.status === "saved"
          ? `Saved${time ? ` at ${time}` : ""}`
          : "Changes save automatically"

  return (
    <p role="status" aria-live="polite" className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", state.status === "error" && "text-destructive", className)}>
      {state.status === "saving" && <LoaderCircle animate size={14} className="size-3.5 shrink-0" aria-hidden="true" />}
      {state.status === "saved" && <Check animate size={14} className="size-3.5 shrink-0" aria-hidden="true" />}
      {state.status === "error" && <AlertCircleIcon className="size-3.5 shrink-0" aria-hidden="true" />}
      <span className="max-sm:sr-only">{label}</span>
    </p>
  )
}
