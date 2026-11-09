import type { Metadata } from "next"

import { Builder } from "@/components/builder/builder"
import { getFormDocument } from "@/lib/api/mock-schemas"
import { createEmptyForm } from "@/lib/schema"

export const metadata: Metadata = { title: "Build" }

export default async function BuildPage({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params
  /* Forms made in the dashboard are not stored yet, so they start blank. */
  const initial = getFormDocument(formId) ?? createEmptyForm()
  return <Builder formId={formId} initial={initial} />
}