import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { FormRenderer } from "@/components/renderer/form-renderer"
import { getFormDocument } from "@/lib/api/mock-schemas"
import { mockForms } from "@/lib/api/mock-forms"

export const metadata: Metadata = { title: "Form preview" }

/* Public form page. No account, no app shell. */
export default async function PublicFormPage({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params
  const form = getFormDocument(formId)
  if (!form) notFound()
  const title = mockForms.find((f) => f.id === formId)?.title

  return (
    <main className="min-h-svh px-4 py-8 sm:py-16">
      <div className="mx-auto w-full max-w-xl">
        {title && <h1 className="mb-6 font-display text-3xl font-medium tracking-tight sm:text-4xl">{title}</h1>}
        <div className="rounded-xl border bg-card p-5 sm:p-8">
          <FormRenderer form={form} allowAnother />
        </div>
      </div>
    </main>
  )
}