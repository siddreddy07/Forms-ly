"use client"

import { PaletteIcon } from "lucide-react"

import { DesignPanelFixture, FormCanvasFixture } from "@/components/skeletons/fixtures"
import { Skeleton } from "@/components/skeletons/skeleton"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const tabs = ["Colour", "Brand", "Font", "Thanks"]

/* The Design tab while it loads. Its heading, tabs and buttons are the real, always-the-same UI; only the
   controls and the form preview wait for data. Keep the layout in step with design-view.tsx. */
export function DesignLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl lg:grid lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start lg:gap-6 lg:px-6 lg:py-8">
      <aside aria-label="Design options" className="hidden gap-5 lg:grid lg:sticky lg:top-6">
        <div>
          <h2 className="font-display text-2xl font-medium tracking-tight">Design</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Make the form look like your own brand.</p>
        </div>
        <div className="grid gap-3">
          <div className="grid grid-cols-4 rounded-lg bg-muted p-0.5" aria-hidden="true">
            {tabs.map((t, i) => (
              <span
                key={t}
                className={cn(
                  "flex h-8 items-center justify-center rounded-md text-[13px] font-medium",
                  i === 0 ? "bg-background shadow-sm" : "text-muted-foreground"
                )}
              >
                {t}
              </span>
            ))}
          </div>
          <Skeleton name="design-panel" loading fixture={<DesignPanelFixture />}>
            <DesignPanelFixture />
          </Skeleton>
        </div>
      </aside>

      <div className="sticky top-14 z-20 flex items-center justify-between gap-3 border-b bg-background/85 px-4 py-2 backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-2 rounded-lg bg-muted p-0.5" aria-hidden="true">
          <span className="flex h-7 items-center rounded-md bg-background px-3 text-xs font-medium shadow-sm">Form</span>
          <span className="flex h-7 items-center rounded-md px-3 text-xs font-medium text-muted-foreground">Thank-you</span>
        </div>
        <Button size="sm" variant="outline" disabled>
          <PaletteIcon data-icon="inline-start" />
          Customize
        </Button>
      </div>

      <section aria-label="Preview" className="min-w-0">
        <div className="mb-2 hidden items-center justify-between lg:flex">
          <p className="text-xs font-medium text-muted-foreground">Preview</p>
        </div>
        <div className="overflow-hidden bg-background lg:rounded-xl lg:border">
          <Skeleton name="form-canvas" loading fixture={<FormCanvasFixture />}>
            <FormCanvasFixture />
          </Skeleton>
        </div>
      </section>
    </div>
  )
}
