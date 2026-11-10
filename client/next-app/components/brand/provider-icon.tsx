"use client"

import * as React from "react"

import type { AiProviderId } from "@/lib/api/ai"
import { aiProviderIcons } from "@/lib/icons"
import { cn } from "@/lib/utils"

/* An AI company's logo. Size it with a size class (default size-5). The SVG ids inside Gemini's logo are made
   unique for each copy on the page, so showing it twice (in a menu and on a button) never breaks the other one. */
export function ProviderIcon({ id, className }: { id: AiProviderId; className?: string }) {
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "")
  const markup = React.useMemo(() => aiProviderIcons[id].replace(/SVG[A-Za-z0-9]+/g, (m) => m + uid), [id, uid])
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex shrink-0 items-center justify-center [&>svg]:size-full", className ?? "size-5")}
      // The markup is fixed text from lib/icons.ts, not user input
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  )
}
