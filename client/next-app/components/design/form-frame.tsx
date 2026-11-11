"use client"

import { MadeWith } from "@/components/brand/made-with"
import { useFormDesign } from "@/components/design/use-form-design"
import type { FormDesign } from "@/lib/api/mock-design"
import { cn } from "@/lib/utils"

/* The white card the form sits in, with the "Made with" badge below.
   Used by the public page and both previews, so they always look the same. */
export function FormFrame({
  formId,
  design: given,
  title,
  inert,
  footer,
  className,
  children,
}: {
  /* Either the form's id (the design is read from this browser) or the design itself (the public page). */
  formId?: string
  design?: FormDesign | null
  /* Shown above the card when the form has no header of its own. */
  title?: string
  /* Makes the card read-only (used in the Design tab). */
  inert?: boolean
  /* Extra line below the card and the badge, such as when the form stops taking answers. */
  footer?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  const stored = useFormDesign(formId ?? "")
  const design = given !== undefined ? given : stored

  const showBadge = !design?.hideBadge

  return (
    <div className={cn("mx-auto w-full max-w-[var(--form-width,36rem)]", className)}>
      {title && <h1 className="mb-3 font-display text-xl leading-tight font-medium tracking-tight sm:text-2xl lg:mb-6 lg:text-4xl">{title}</h1>}
      <div inert={inert} className={cn("rounded-xl border bg-card p-3 sm:p-5 lg:p-8", inert && "select-none")}>
        {children}
      </div>
      {showBadge && (
        <div className="mt-3 flex justify-center lg:mt-5">
          <MadeWith />
        </div>
      )}
      {footer}
    </div>
  )
}
