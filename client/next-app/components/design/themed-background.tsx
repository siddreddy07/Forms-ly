"use client"

import { useFormDesign } from "@/components/design/use-form-design"
import { designStyle } from "@/lib/api/mock-design"
import { useIsPro } from "@/lib/pro"

/* The page behind a form. Applies the Design tab: background colour for everyone, and the Pro look
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
  const pro = useIsPro()
  return (
    <Tag className={className} style={designStyle(design, pro)}>
      {children}
    </Tag>
  )
}
