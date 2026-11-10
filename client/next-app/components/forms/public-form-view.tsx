"use client"

import * as React from "react"

import { FormFrame } from "@/components/design/form-frame"
import { ThemedBackground } from "@/components/design/themed-background"
import { PublicForm } from "@/components/forms/public-form"
import type { PublicFormResponse } from "@/lib/api/forms"
import { parseDesign } from "@/lib/api/mock-design"
import { parseForm } from "@/lib/schema"

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <div className="py-10 text-center">
      <h2 className="font-display text-2xl font-medium">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

/* The public page for one form link. The server has already looked the link up, so this only draws the answer. */
export function PublicFormView({ slug, data }: { slug: string; data: PublicFormResponse }) {
  const live = data.state === "live" ? data : null
  const doc = React.useMemo(() => (live ? parseForm(live.document) : null), [live])
  const design = React.useMemo(() => parseDesign(live ? JSON.stringify(live.design ?? {}) : null), [live])

  return (
    <ThemedBackground as="main" design={design} className="min-h-svh px-4 py-8 sm:py-16">
      <FormFrame design={design} title={live && doc && !doc.header?.title ? live.title : undefined}>
        {live && doc ? (
          <PublicForm slug={slug} doc={doc} design={design} version={live.version} />
        ) : data.state === "private" ? (
          <Notice title="This form is private" text="Ask the owner for access." />
        ) : (
          <Notice title="This form isn't open yet" text="Check back later." />
        )}
      </FormFrame>
    </ThemedBackground>
  )
}
