"use client"

import type { ReactElement } from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/* Tooltip for builder controls: a name, a one-line explanation and the shortcut.
   Touch screens never show it, so every control keeps its own aria-label. */
export function Hint({
  title,
  description,
  shortcut,
  side = "bottom",
  children,
}: {
  title: string
  description?: string
  shortcut?: string
  side?: "top" | "bottom" | "left" | "right"
  children: ReactElement
}) {
  return (
    <Tooltip>
      <TooltipTrigger delay={350} closeDelay={0} render={children} />
      <TooltipContent side={side} className="max-w-56 flex-col items-start gap-0.5 py-2">
        <span className="flex w-full items-center justify-between gap-3 font-medium">
          {title}
          {shortcut && <kbd className="rounded bg-background/20 px-1.5 py-0.5 font-mono text-[10px]">{shortcut}</kbd>}
        </span>
        {description && <span className="opacity-70">{description}</span>}
      </TooltipContent>
    </Tooltip>
  )
}
