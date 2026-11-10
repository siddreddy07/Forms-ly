"use client"

import { PencilIcon } from "lucide-react"

import { ThemedBackground } from "@/components/design/themed-background"
import { useBuilder } from "@/components/builder/builder-context"
import { FormRenderer } from "@/components/renderer/form-renderer"
import { Button } from "@/components/ui/button"

/* The real form, built from what is on screen right now (saved or not). Nothing is submitted anywhere. */
export function PreviewPane({ formId, onExit }: { formId: string; onExit: () => void }) {
  const doc = useBuilder((s) => s.doc)
  return (
    <div className="min-w-0">
      <div className="sticky top-14 z-20 flex items-center gap-2 border-b bg-background/85 px-3 py-2 backdrop-blur-xl lg:top-0">
        <Button variant="outline" size="sm" onClick={onExit}>
          <PencilIcon data-icon="inline-start" />
          Back to editing
        </Button>
        <p className="min-w-0 truncate text-xs text-muted-foreground max-sm:sr-only">Preview. Answers are not saved or sent.</p>
      </div>
      <ThemedBackground formId={formId} className="min-h-[calc(100svh-7.5rem)] bg-muted/40 px-3 py-6 pb-28 sm:px-6 sm:py-10 lg:h-[calc(100svh-9.75rem)] lg:overflow-y-auto lg:pb-10">
        <div className="mx-auto w-full max-w-xl rounded-xl border bg-card p-5 sm:p-8">
          <FormRenderer form={doc} allowAnother showEmptyBanner />
        </div>
      </ThemedBackground>
    </div>
  )
}
