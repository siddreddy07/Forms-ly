"use client"

import { useFormDesign } from "@/components/design/use-form-design"
import { designStyle } from "@/lib/api/mock-design"

/* The page behind a form. Applies the Design tab: background colour, plus the look
   (font, accent colour, corners, width) as CSS variables that everything inside picks up. */
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
  return (
    <Tag className={className} style={designStyle(design)}>
      {children}
    </Tag>
  )
}
