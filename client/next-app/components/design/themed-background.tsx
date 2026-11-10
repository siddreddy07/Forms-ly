"use client"

import { useFormDesign } from "@/components/design/use-form-design"
import { backgroundCss, fontVars } from "@/lib/api/mock-design"
import { useIsPro } from "@/lib/pro"

/* The page behind a form, tinted by the Design tab. Only the background; the form card stays as it is. */
export function ThemedBackground({
  formId,
  className,
  as: Tag = "div",
  children,
}: {
  formId: string
  className?: string
  as?: "div" | "main"
  children: React.ReactNode
}) {
  const design = useFormDesign(formId)
  const pro = useIsPro()
  return (
    <Tag className={className} style={{ backgroundColor: design ? backgroundCss(design) : undefined, ...(design && pro ? fontVars(design.font) : undefined) }}>
      {children}
    </Tag>
  )
}
