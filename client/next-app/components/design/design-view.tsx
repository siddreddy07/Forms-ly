"use client"

import * as React from "react"
import { PaletteIcon } from "lucide-react"

import { useFormDesign } from "@/components/design/use-form-design"
import { FormFrame } from "@/components/design/form-frame"
import { SaveStatus } from "@/components/design/save-status"
import { AiPanel, BrandPanel, ColourPanel, FontPanel, ThanksPanel } from "@/components/design/panels"
import { FormRenderer } from "@/components/renderer/form-renderer"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer"
import { readPublishedDoc } from "@/lib/api/mock-meta"
import { getFormDocument } from "@/lib/api/mock-schemas"
import { readServerRecord } from "@/lib/api/mock-server"
import { designStyle, thankYouFor, type FormDesign } from "@/lib/api/mock-design"
import { useIsPro } from "@/lib/pro"
import { createEmptyForm } from "@/lib/schema"
import { cn } from "@/lib/utils"

const tabs = [
  { id: "colour", label: "Colour" },
  { id: "brand", label: "Brand" },
  { id: "font", label: "Font" },
  { id: "thanks", label: "Thanks" },
  { id: "ai", label: "AI" },
] as const
type TabId = (typeof tabs)[number]["id"]

/* The controls: a row of tabs, one panel at a time. Same in the side column and the phone drawer. */
function Controls({
  formId,
  design,
  compact,
  onTab,
  onClose,
}: {
  formId: string
  design: FormDesign
  compact?: boolean
  onTab: (tab: TabId) => void
  onClose?: () => void
}) {
  const [tab, setTab] = React.useState<TabId>("colour")
  const pick = (t: TabId) => {
    setTab(t)
    onTab(t)
  }

  return (
    <div className="mx-auto grid w-full max-w-md gap-3 lg:max-w-none">
      <div className="flex items-center gap-2">
        <div role="tablist" aria-label="Design options" className="grid flex-1 grid-cols-5 rounded-lg bg-muted p-0.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => pick(t.id)}
              className={cn(
                "h-8 rounded-md text-[13px] font-medium outline-none focus-visible:outline-2 focus-visible:outline-ring",
                tab === t.id ? "bg-background shadow-sm" : "text-muted-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        {onClose && (
          <Button size="sm" onClick={onClose}>
            Done
          </Button>
        )}
      </div>
      <div role="tabpanel" className={cn(compact && "max-h-[30svh] overflow-y-auto pb-1")}>
        {tab === "colour" && <ColourPanel formId={formId} design={design} />}
        {tab === "brand" && <BrandPanel formId={formId} design={design} />}
        {tab === "font" && <FontPanel formId={formId} design={design} />}
        {tab === "thanks" && <ThanksPanel formId={formId} design={design} />}
        {tab === "ai" && <AiPanel />}
      </div>
    </div>
  )
}

/* Switches the preview between the form and the thank-you page. */
function ViewToggle({ view, onChange }: { view: "form" | "thanks"; onChange: (v: "form" | "thanks") => void }) {
  return (
    <div role="radiogroup" aria-label="Preview" className="grid grid-cols-2 rounded-lg bg-muted p-0.5">
      {(["form", "thanks"] as const).map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={view === v}
          onClick={() => onChange(v)}
          className={cn(
            "h-7 rounded-md px-3 text-xs font-medium outline-none focus-visible:outline-2 focus-visible:outline-ring",
            view === v ? "bg-background shadow-sm" : "text-muted-foreground"
          )}
        >
          {v === "form" ? "Form" : "Thank-you"}
        </button>
      ))}
    </div>
  )
}

export function DesignView({ formId }: { formId: string }) {
  const design = useFormDesign(formId)
  const pro = useIsPro()
  const [open, setOpen] = React.useState(false)
  const [view, setView] = React.useState<"form" | "thanks">("form")
  const barRef = React.useRef<HTMLDivElement>(null)
  const doc = React.useMemo(
    () => (design ? (readPublishedDoc(formId) ?? readServerRecord(formId, getFormDocument(formId) ?? createEmptyForm()).doc) : null),
    [formId, design]
  )

  if (!design || !doc) return <div className="mx-auto h-64 max-w-6xl animate-pulse px-4 py-8" />

  /* Opening the Thanks tab shows the thank-you page in the preview; any other tab shows the form. */
  const onTab = (t: TabId) => setView(t === "thanks" ? "thanks" : "form")

  return (
    <div className="mx-auto w-full max-w-6xl lg:grid lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start lg:gap-6 lg:px-6 lg:py-8">
      <aside aria-label="Design options" className="hidden gap-5 lg:grid lg:sticky lg:top-6">
        <div>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-medium tracking-tight">Design</h2>
            <SaveStatus formId={formId} />
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">Make the form look like your own brand.</p>
        </div>
        <Controls formId={formId} design={design} onTab={onTab} />
      </aside>

      {/* Small screens: the form comes first, the controls open from a bar at the top. */}
      <div ref={barRef} className="sticky top-14 z-20 flex items-center justify-between gap-3 border-b bg-background/85 px-4 py-2 backdrop-blur-xl lg:hidden">
        <ViewToggle view={view} onChange={setView} />
        <SaveStatus formId={formId} className="ml-auto" />
        <Button size="sm" variant={open ? "secondary" : "outline"} onClick={() => setOpen((v) => !v)}>
          <PaletteIcon data-icon="inline-start" />
          {open ? "Hide options" : "Customize"}
        </Button>
      </div>

      <section aria-label="Preview" className={cn("min-w-0", open && "max-lg:pb-[48svh]")}>
        <div className="mb-2 hidden items-center justify-between lg:flex">
          <p className="text-xs font-medium text-muted-foreground">Preview</p>
          <ViewToggle view={view} onChange={setView} />
        </div>
        <div className="overflow-hidden bg-background max-lg:min-h-[calc(100svh-7.5rem)] lg:rounded-xl lg:border">
          <div
            className="bg-muted/40 px-3 py-6 transition-colors max-lg:min-h-[calc(100svh-7.5rem)] sm:px-6 sm:py-10 lg:max-h-[75svh] lg:overflow-y-auto"
            style={designStyle(design, pro)}
          >
            {/* Read-only: inert blocks typing, clicking and focus, so this is only a picture. */}
            <FormFrame formId={formId} inert>
              <FormRenderer form={doc} showEmptyBanner forceThankYou={view === "thanks"} thankYou={thankYouFor(design, pro, { redirect: false })} />
            </FormFrame>
          </div>
        </div>
      </section>

      {/* Not modal and no dimmed backdrop, so the form above stays visible. Swipe down or tap outside to close. */}
      <Drawer
        open={open}
        modal={false}
        showSwipeHandle
        swipeDirection="down"
        onOpenChange={(next, details) => {
          /* Tapping outside closes it, except on the top-bar buttons, which handle themselves. */
          const target = details.event?.target
          if (!next && target instanceof Node && barRef.current?.contains(target)) return
          setOpen(next)
        }}
      >
        <DrawerContent className="lg:hidden">
          <DrawerTitle className="sr-only">Design options</DrawerTitle>
          <DrawerDescription className="sr-only">Colours, brand, font, thank-you page and AI design.</DrawerDescription>
          <div className="px-4 pb-4 pt-1">
            <Controls formId={formId} design={design} compact onTab={onTab} onClose={() => setOpen(false)} />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
