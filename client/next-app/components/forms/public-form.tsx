"use client"

import * as React from "react"

import { FormRenderer } from "@/components/renderer/form-renderer"
import { thankYouFor, type FormDesign } from "@/lib/api/mock-design"
import { submitResponse } from "@/lib/api/responses"
import { type FormDocument } from "@/lib/schema"

const messages = {
  closed: "This form is not open any more.",
  code: "The code for this form is no longer valid. Reload the page and enter the new code.",
  busy: "Too many submissions. Wait a minute and try again.",
  network: "Couldn't send your answers. Check your connection and try again.",
} as const

const deviceNow = () => (window.innerWidth < 640 ? "phone" : window.innerWidth < 1024 ? "tablet" : "desktop")

/* The live form people fill in. It gets the published copy and its design from the server (see app/f/[slug]).
   Answers go to the backend, which checks them against the published copy before saving. */
export function PublicForm({ slug, doc, design, code }: { slug: string; doc: FormDocument; design: FormDesign; version: number; code?: string }) {
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
          durationMs: openedAt.current ? Date.now() - openedAt.current : null,
          device: deviceNow(),
          code,
        })
        if (!res.ok) throw new Error(messages[res.reason])
      }}
    />
  )
}
