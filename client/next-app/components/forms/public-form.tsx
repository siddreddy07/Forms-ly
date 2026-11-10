"use client"

import * as React from "react"

import { FormRenderer } from "@/components/renderer/form-renderer"
import { thankYouFor, type FormDesign } from "@/lib/api/mock-design"
import { submitResponse } from "@/lib/api/mock-responses"
import { isAnswerBlock, type FormDocument } from "@/lib/schema"

/* The live form people fill in. It gets the published copy and its design from the server (see app/f/[slug]).
   Answers are still kept in this browser only: sending them to the backend comes with the Responses step. */
export function PublicForm({ slug, doc, design, version }: { slug: string; doc: FormDocument; design: FormDesign; version: number }) {
  const openedAt = React.useRef<number | null>(null)
  React.useEffect(() => {
    openedAt.current = Date.now()
  }, [])

  return (
    <FormRenderer
      form={doc}
      thankYou={thankYouFor(design, { redirect: true })}
      onSubmit={async (answers) => {
        const res = await submitResponse(slug, {
          answers,
          fields: doc.steps.flatMap((st) => st.blocks).filter((b) => isAnswerBlock(b.type)),
          formVersion: version,
          durationMs: openedAt.current ? Date.now() - openedAt.current : null,
        })
        if (!res.ok) throw new Error("Couldn't save your answers. Please try again.")
      }}
    />
  )
}
