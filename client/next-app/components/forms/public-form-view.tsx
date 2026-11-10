"use client"

import * as React from "react"

import { FormFrame } from "@/components/design/form-frame"
import { ThemedBackground } from "@/components/design/themed-background"
import { ClosedScene } from "@/components/not-found/closed-scene"
import { PrivateGate } from "@/components/forms/private-gate"
import { PublicForm } from "@/components/forms/public-form"
import type { PublicFormResponse } from "@/lib/api/forms"
import { parseDesign } from "@/lib/api/mock-design"
import { parseForm } from "@/lib/schema"

/* The public page for one form link. The server has already looked the link up, so this only draws the answer. */
export function PublicFormView({ slug, data: first }: { slug: string; data: PublicFormResponse }) {
  /* A private form turns into the live form once the right code is put in. */
  const [data, setData] = React.useState(first)
  const live = data.state === "live" ? data : null
  const doc = React.useMemo(() => (live ? parseForm(live.document) : null), [live])
  const design = React.useMemo(() => parseDesign(live ? JSON.stringify(live.design ?? {}) : null), [live])

  if (!live) {
    return data.state === "private" ? (
      <ClosedScene variant="private">
        <PrivateGate slug={slug} onOpen={setData} />
      </ClosedScene>
    ) : (
      <ClosedScene variant="unpublished" />
    )
  }

  return (
    <ThemedBackground as="main" design={design} className="min-h-svh px-4 py-8 sm:py-16">
      <FormFrame design={design} title={doc && !doc.header?.title ? live.title : undefined}>
        {doc && <PublicForm slug={slug} doc={doc} design={design} version={live.version} />}
      </FormFrame>
    </ThemedBackground>
  )
}
