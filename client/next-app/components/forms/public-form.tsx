"use client"

import { useFormMeta } from "@/components/forms/use-form-meta"
import { FormRenderer } from "@/components/renderer/form-renderer"
import { readPublishedDoc } from "@/lib/api/mock-meta"
import { readServerRecord } from "@/lib/api/mock-server"
import type { FormDocument } from "@/lib/schema"

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <div className="py-10 text-center">
      <h2 className="font-display text-2xl font-medium">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

export function PublicForm({ formId, sample, preview }: { formId: string; sample: FormDocument; preview: boolean }) {
  const meta = useFormMeta(formId)
  if (!meta) return <div className="h-48 animate-pulse rounded-lg bg-muted/40" />

  if (preview) {
    return (
      <>
        <p className="mb-4 rounded-lg border bg-muted/40 p-2.5 text-center text-sm">Preview. Only you can see this.</p>
        <FormRenderer form={readServerRecord(formId, sample).doc} allowAnother />
      </>
    )
  }
  if (!meta.published) return <Notice title="This form isn't open yet" text="Check back later." />
  if (meta.access === "private") return <Notice title="This form is private" text="Ask the owner for access." />
  return <FormRenderer form={readPublishedDoc(formId) ?? sample} allowAnother />
}
