import type { Metadata } from "next"

import { PreviewView } from "@/components/forms/preview-view"

export const metadata: Metadata = { title: "Preview" }

/* The owner's private preview of their latest saved form. Needs sign-in (see proxy.ts). */
export default async function PreviewPage({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params
  return <PreviewView formId={formId} />
}
