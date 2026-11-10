"use client"

import { useFormDesign } from "@/components/design/use-form-design"
import { brand } from "@/lib/brand"
import { isWebUrl, logoSizes } from "@/lib/api/mock-design"
import { useIsPro } from "@/lib/pro"
import { cn } from "@/lib/utils"

/* The white card the form sits in, with the Pro logo above it and the "Made with" badge below.
   Used by the public page and both previews, so they always look the same. */
export function FormFrame({
  formId,
  title,
  inert,
  className,
  children,
}: {
  formId: string
  /* Shown above the card when the form has no header of its own. */
  title?: string
  /* Makes the card read-only (used in the Design tab). */
  inert?: boolean
  className?: string
  children: React.ReactNode
}) {
  const design = useFormDesign(formId)
  const pro = useIsPro()

  const logo = pro && design?.logo && isWebUrl(design.logo.url) ? design.logo : null
  const showBadge = !(pro && design?.hideBadge)
  const logoHeight = logo ? logoSizes.find((s) => s.id === logo.size)?.height : undefined

  return (
    <div className={cn("mx-auto w-full max-w-[var(--form-width,36rem)]", className)}>
      {logo && (
        <div className={cn("mb-5 flex", logo.align === "center" ? "justify-center" : "justify-start")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo.url} alt="" style={{ height: logoHeight }} className="w-auto max-w-full object-contain" />
        </div>
      )}
      {title && <h1 className="mb-6 font-display text-3xl font-medium tracking-tight sm:text-4xl">{title}</h1>}
      <div inert={inert} className={cn("rounded-xl border bg-card p-5 sm:p-8", inert && "select-none")}>
        {children}
      </div>
      {showBadge && <p className="mt-4 text-center text-xs text-muted-foreground">Made with {brand.name}</p>}
    </div>
  )
}
