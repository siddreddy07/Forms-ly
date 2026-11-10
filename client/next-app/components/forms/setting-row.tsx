import * as React from "react"

import { cn } from "@/lib/utils"

/* One setting inside the Settings card. A short title, one line of help, and the control.
   inline: the control sits beside the title on tablets and desktops (a switch, a small picker).
   Otherwise the control goes under the title, full width, for anything that needs room (a form, a status). */
export function SettingRow({
  title,
  hint,
  inline,
  children,
  className,
}: {
  title: string
  hint?: React.ReactNode
  inline?: boolean
  children?: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("grid gap-2.5 p-4", inline && "sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6", className)}>
      <div className="grid gap-0.5">
        <h3 className="text-sm font-medium">{title}</h3>
        {hint && <p className="text-xs text-muted-foreground sm:text-[0.8rem]">{hint}</p>}
      </div>
      {children}
    </section>
  )
}
