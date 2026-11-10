"use client"

import { useFormDesign } from "@/components/design/use-form-design"
import { designStyle, type FormDesign } from "@/lib/api/mock-design"

/* The page behind a form. Applies the Design tab: background colour, plus the look
   (font, accent colour, corners, width) as CSS variables that everything inside picks up. */
export function ThemedBackground({
  formId,
  design: given,
  className,
  as: Tag = "div",
  children,
}: {
  /* Either the form's id (the design is read from this browser) or the design itself (the public page). */
  formId?: string
  design?: FormDesign | null
  className?: string
  as?: "div" | "main"
  children: React.ReactNode
}) {
  const stored = useFormDesign(formId ?? "")
  const design = given !== undefined ? given : stored
  return (
    <Tag className={className} style={designStyle(design)}>
      {children}
    </Tag>
  )
}
