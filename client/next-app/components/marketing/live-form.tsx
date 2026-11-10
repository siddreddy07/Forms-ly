"use client"

import * as React from "react"

import { FormFrame } from "@/components/design/form-frame"
import { FormRenderer } from "@/components/renderer/form-renderer"
import { designStyle, defaultDesign, type FormDesign } from "@/lib/api/mock-design"
import type { FormDocument } from "@/lib/schema"
import { useMounted } from "@/lib/use-mounted"

/* The real form renderer, the same one the public page and the builder preview use, with the real design options
   applied. Nothing typed into it is sent anywhere. */
export function LiveForm({ make, design = defaultDesign }: { make: () => FormDocument; design?: FormDesign }) {
  const mounted = useMounted()
  const doc = React.useMemo(() => (mounted ? make() : null), [mounted, make])

  if (!doc) return <div aria-hidden="true" className="mx-auto h-[28rem] w-full max-w-xl animate-pulse rounded-xl bg-muted/50" />
  return (
    <div style={designStyle(design)} className="bg-transparent">
      <FormFrame design={{ ...design, hideBadge: true }}>
        <FormRenderer form={doc} allowAnother onSubmit={() => {}} />
      </FormFrame>
    </div>
  )
}
