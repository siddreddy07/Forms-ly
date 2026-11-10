import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { FormFrame } from "@/components/design/form-frame"
import { ThemedBackground } from "@/components/design/themed-background"
import { PublicForm } from "@/components/forms/public-form"
import { getFormDocument } from "@/lib/api/mock-schemas"
import { mockForms } from "@/lib/api/mock-forms"

export const metadata: Metadata = { title: "Form" }

/* Public form page. No account, no app shell. */
export default async function PublicFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ formId: string }>
  searchParams: Promise<{ preview?: string }>
}) {
  const { formId } = await params
  const { preview } = await searchParams
  const form = getFormDocument(formId)
  if (!form) notFound()
  const title = mockForms.find((f) => f.id === formId)?.title

  return (
    <ThemedBackground as="main" formId={formId} className="min-h-svh px-4 py-8 sm:py-16">
      <FormFrame formId={formId} title={title && !form.header?.title ? title : undefined}>
        <PublicForm formId={formId} sample={form} preview={!!preview} />
      </FormFrame>
    </ThemedBackground>
  )
}
