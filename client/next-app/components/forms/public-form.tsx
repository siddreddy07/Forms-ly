"use client"

import * as React from "react"

import { useFormMeta } from "@/components/forms/use-form-meta"
import { FormRenderer } from "@/components/renderer/form-renderer"
import { readPublishedDoc } from "@/lib/api/mock-meta"
import { submitResponse } from "@/lib/api/mock-responses"
import { readServerRecord } from "@/lib/api/mock-server"
import { isAnswerBlock, type FormDocument } from "@/lib/schema"

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
  const openedAt = React.useRef<number | null>(null)
  React.useEffect(() => {
    openedAt.current = Date.now()
  }, [])
  if (!meta) return <div className="h-48 animate-pulse rounded-lg bg-muted/40" />

  if (preview) {
    return (
      <>
        <p className="mb-4 rounded-lg border bg-muted/40 p-2.5 text-center text-sm">Preview. Only you can see this.</p>
        <FormRenderer form={readServerRecord(formId, sample).doc} allowAnother showEmptyBanner />
      </>
    )
  }
  if (!meta.published) return <Notice title="This form isn't open yet" text="Check back later." />
  if (meta.access === "private") return <Notice title="This form is private" text="Ask the owner for access." />
  const liveDoc = readPublishedDoc(formId) ?? sample
  return (
    <FormRenderer
      form={liveDoc}
      onSubmit={async (answers) => {
        const res = await submitResponse(formId, { answers, fields: liveDoc.steps.flatMap((st) => st.blocks).filter((b) => isAnswerBlock(b.type)), formVersion: meta.publishedVersion, durationMs: openedAt.current ? Date.now() - openedAt.current : null })
        if (!res.ok) throw new Error("Couldn't save your answers. Please try again.")
      }}
    />
  )
}
