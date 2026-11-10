"use client"

import * as React from "react"
import { BanIcon, CheckIcon, PaletteIcon } from "lucide-react"

import { useFormDesign } from "@/components/design/use-form-design"
import { ProDesign } from "@/components/design/pro-design"
import { FormRenderer } from "@/components/renderer/form-renderer"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer"
import { Switch } from "@/components/ui/switch"
import { readPublishedDoc } from "@/lib/api/mock-meta"
import { getFormDocument } from "@/lib/api/mock-schemas"
import { readServerRecord } from "@/lib/api/mock-server"
import {
  backgroundColors,
  backgroundCss,
  backgroundOpacities,
  fontVars,
  setBackground,
  type BackgroundOpacity,
  type FormDesign,
} from "@/lib/api/mock-design"
import { setDevPro, useIsPro } from "@/lib/pro"
import { createEmptyForm } from "@/lib/schema"
import { cn } from "@/lib/utils"

function DevProSwitch() {
  const pro = useIsPro()
  if (process.env.NODE_ENV === "production") return null
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
      <span>Dev only: pretend this account is on Pro</span>
      <Switch size="sm" checked={pro} onCheckedChange={setDevPro} aria-label="Dev only: Pro on or off" />
    </label>
  )
}

/* Background colour and opacity. */
function ColourSection({ formId, design }: { formId: string; design: FormDesign }) {
  const opacityId = React.useId()
  const current = design.background
  const stop = current ? backgroundOpacities.indexOf(current.opacity) : backgroundOpacities.length - 1

  return (
    <div className="grid gap-4">
      <div className="grid gap-2.5">
        <h3 className="text-sm font-medium">Colour</h3>
        <div role="radiogroup" aria-label="Background colour" className="flex flex-wrap gap-2.5">
          <button
            type="button"
            role="radio"
            aria-checked={!current}
            aria-label="No colour"
            onClick={() => setBackground(formId, null)}
            className={cn(
              "flex size-8 items-center justify-center rounded-full border text-muted-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:size-9",
              !current ? "border-foreground ring-2 ring-foreground/20" : "hover:border-foreground/40"
            )}
          >
            <BanIcon className="size-4" />
          </button>
          {backgroundColors.map((c) => {
            const active = current?.color === c.id
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={c.label}
                title={c.label}
                onClick={() => setBackground(formId, { color: c.id, opacity: current?.opacity ?? 100 })}
                style={{ backgroundColor: `rgb(${c.rgb})` }}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border border-transparent text-white outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:size-9",
                  active && "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                )}
              >
                {active && <CheckIcon className="size-4 drop-shadow" />}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <label htmlFor={opacityId} className="text-sm font-medium">
            Opacity
          </label>
          <span className="text-sm tabular-nums text-muted-foreground">{current ? `${current.opacity}%` : "Pick a colour first"}</span>
        </div>
        <input
          id={opacityId}
          type="range"
          min={0}
          max={backgroundOpacities.length - 1}
          step={1}
          value={stop}
          disabled={!current}
          aria-valuetext={current ? `${current.opacity} percent` : undefined}
          onChange={(e) => current && setBackground(formId, { color: current.color, opacity: backgroundOpacities[Number(e.target.value)] as BackgroundOpacity })}
          className="h-2 w-full cursor-pointer accent-foreground disabled:cursor-not-allowed disabled:opacity-40"
        />
        <div className="flex justify-between text-xs text-muted-foreground" aria-hidden="true">
          {backgroundOpacities.map((o) => (
            <span key={o}>{o}%</span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* Large screens: everything in the side column. */
function Controls({ formId, design }: { formId: string; design: FormDesign }) {
  return (
    <div className="grid gap-6">
      <DevProSwitch />
      <ColourSection formId={formId} design={design} />
      <ProDesign formId={formId} font={design.font} />
    </div>
  )
}

const tabs = [
  { id: "colour", label: "Colour" },
  { id: "font", label: "Font" },
  { id: "ai", label: "AI" },
] as const

/* Small screens: one short section at a time, so the drawer stays low and the form stays visible. */
function DrawerControls({ formId, design, onClose }: { formId: string; design: FormDesign; onClose: () => void }) {
  const [tab, setTab] = React.useState<(typeof tabs)[number]["id"]>("colour")
  return (
    <div className="mx-auto grid w-full max-w-md gap-3">
      <div className="flex items-center gap-2">
        <div role="tablist" aria-label="Design options" className="grid flex-1 grid-cols-3 rounded-lg bg-muted p-0.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "h-8 rounded-md text-sm font-medium outline-none focus-visible:outline-2 focus-visible:outline-ring",
                tab === t.id ? "bg-background shadow-sm" : "text-muted-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={onClose}>
          Done
        </Button>
      </div>
      <div role="tabpanel" className="max-h-[24svh] overflow-y-auto pb-1">
        {tab === "colour" && (
          <div className="grid gap-3">
            <ColourSection formId={formId} design={design} />
            <DevProSwitch />
          </div>
        )}
        {tab === "font" && <ProDesign formId={formId} font={design.font} only="font" />}
        {tab === "ai" && <ProDesign formId={formId} font={design.font} only="ai" />}
      </div>
    </div>
  )
}

export function DesignView({ formId }: { formId: string }) {
  const design = useFormDesign(formId)
  const pro = useIsPro()
  const [open, setOpen] = React.useState(false)
  const barRef = React.useRef<HTMLDivElement>(null)
  const doc = React.useMemo(
    () => (design ? (readPublishedDoc(formId) ?? readServerRecord(formId, getFormDocument(formId) ?? createEmptyForm()).doc) : null),
    [formId, design]
  )

  if (!design || !doc) return <div className="mx-auto h-64 max-w-6xl animate-pulse px-4 py-8" />

  return (
    <div className="mx-auto w-full max-w-6xl lg:grid lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start lg:gap-6 lg:px-6 lg:py-8">
      <aside aria-label="Design options" className="hidden gap-6 lg:grid lg:sticky lg:top-6">
        <div>
          <h2 className="font-display text-2xl font-medium tracking-tight">Design</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Choose a background colour for the page behind your form.</p>
        </div>
        <Controls formId={formId} design={design} />
      </aside>

      {/* Small screens: the form comes first, the controls open from a bar at the top. */}
      <div ref={barRef} className="sticky top-14 z-20 flex items-center justify-between gap-3 border-b bg-background/85 px-4 py-2 backdrop-blur-xl lg:hidden">
        <p className="text-sm font-medium">Design</p>
        <Button size="sm" variant={open ? "secondary" : "outline"} onClick={() => setOpen((v) => !v)}>
          <PaletteIcon data-icon="inline-start" />
          {open ? "Hide options" : "Customize"}
        </Button>
      </div>

      <section aria-label="Preview" className={cn("min-w-0 lg:pt-0", open && "max-lg:pb-[40svh]")}>
        <p className="mb-2 hidden text-xs font-medium text-muted-foreground lg:block">Preview</p>
        <div className="overflow-hidden bg-background max-lg:min-h-[calc(100svh-7.5rem)] lg:rounded-xl lg:border">
          <div
            className="bg-muted/40 px-3 py-6 transition-colors max-lg:min-h-[calc(100svh-7.5rem)] sm:px-6 sm:py-10 lg:max-h-[75svh] lg:overflow-y-auto"
            style={{ backgroundColor: backgroundCss(design), ...(pro ? fontVars(design.font) : undefined) }}
          >
            {/* Read-only: inert blocks typing, clicking and focus, so this is only a picture of the form. */}
            <div inert className="mx-auto w-full max-w-xl select-none rounded-xl border bg-card p-5 sm:p-8">
              <FormRenderer form={doc} showEmptyBanner />
            </div>
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
          /* Tapping outside closes it, except on the top-bar button, which toggles it itself. */
          const target = details.event?.target
          if (!next && target instanceof Node && barRef.current?.contains(target)) return
          setOpen(next)
        }}
      >
        <DrawerContent className="lg:hidden">
          <DrawerTitle className="sr-only">Design options</DrawerTitle>
          <DrawerDescription className="sr-only">Background colour, opacity, font and AI design.</DrawerDescription>
          <div className="px-4 pb-4 pt-1">
            <DrawerControls formId={formId} design={design} onClose={() => setOpen(false)} />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
