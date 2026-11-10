"use client"

import * as React from "react"
import { BanIcon, CheckIcon } from "lucide-react"

import { PendingLock, hold } from "@/components/ui/pending-lock"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  accentPresets,
  backgroundColors,
  backgroundOpacities,
  fonts,
  isWebUrl,
  radii,
  setAccent,
  setBackground,
  setFont,
  setHideBadge,
  setRadius,
  setThankYou,
  setWidth,
  widths,
  type BackgroundOpacity,
  type FormDesign,
} from "@/lib/api/mock-design"
import { brand } from "@/lib/brand"
import { cn } from "@/lib/utils"

type PanelProps = { formId: string; design: FormDesign }

/* ---------- small shared pieces ---------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-2.5">
      <h3 className="text-sm font-medium">{title}</h3>
      {children}
    </section>
  )
}

/* A label on the left and its control on the right, so a group of settings lines up as one tidy list. */
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[4.75rem_minmax(0,1fr)] items-center gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string
  value: T
  options: readonly { id: T; label: string }[]
  onChange: (v: T) => void
  disabled?: boolean
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("grid rounded-lg bg-muted p-0.5", disabled && "opacity-50")} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          disabled={disabled}
          onClick={() => onChange(o.id)}
          className={cn(
            "h-8 rounded-md text-sm font-medium outline-none focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed",
            value === o.id ? "bg-background shadow-sm" : "text-muted-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ---------- Colour: page background (free) ---------- */

export function ColourPanel({ formId, design }: PanelProps) {
  const opacityId = React.useId()
  const current = design.background
  const stop = current ? backgroundOpacities.indexOf(current.opacity) : backgroundOpacities.length - 1

  return (
    <div className="grid gap-4">
      <Section title="Page colour">
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
      </Section>

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

/* ---------- Brand: accent colour, corners, width, badge ---------- */

export function BrandPanel({ formId, design }: PanelProps) {
  const [badgePending, setBadgePending] = React.useState(false)

  return (
    <div className="grid gap-5">
      <Section title="Accent colour">
        <p className="-mt-1 text-xs text-muted-foreground">Buttons, progress bar and highlights.</p>
        <div role="radiogroup" aria-label="Accent colour" className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            role="radio"
            aria-checked={!design.accent}
            aria-label="Default accent"
           
            onClick={() => setAccent(formId, null)}
            className={cn(
              "flex size-8 items-center justify-center rounded-full border text-muted-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 sm:size-9",
              !design.accent ? "border-foreground ring-2 ring-foreground/20" : "hover:border-foreground/40"
            )}
          >
            <BanIcon className="size-4" />
          </button>
          {accentPresets.map((c) => {
            const active = design.accent?.toLowerCase() === c.hex
            return (
              <button
                key={c.hex}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={c.label}
                title={c.label}
               
                onClick={() => setAccent(formId, c.hex)}
                style={{ backgroundColor: c.hex }}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border border-transparent text-white outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 sm:size-9",
                  active && "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                )}
              >
                {active && <CheckIcon className="size-4 drop-shadow" />}
              </button>
            )
          })}
          <label className={"flex h-8 items-center gap-2 rounded-full border px-3 text-xs sm:h-9"}>
            Custom
            <input
              type="color"
              aria-label="Custom accent colour"
             
              value={design.accent ?? "#2563eb"}
              onChange={(e) => setAccent(formId, e.target.value)}
              className="size-5 cursor-pointer rounded border-0 bg-transparent p-0 disabled:cursor-not-allowed"
            />
          </label>
        </div>
      </Section>

      <Section title="Shape">
        <FieldRow label="Corners">
          <Segmented label="Corners" value={design.radius} options={radii} onChange={(r) => setRadius(formId, r)} />
        </FieldRow>
        <FieldRow label="Form width">
          <Segmented label="Form width" value={design.width} options={widths} onChange={(w) => setWidth(formId, w)} />
        </FieldRow>
      </Section>

      {/* A click locks the switch for a few seconds, then the change is saved. */}
      <PendingLock pending={badgePending} className="rounded-lg">
        <label className="flex items-center justify-between gap-3 rounded-lg text-sm">
          <span>Remove “Made with {brand.name}”</span>
          <Switch
            className="after:-inset-x-1"
            checked={design.hideBadge}
            onCheckedChange={async (on) => {
              setBadgePending(true)
              await hold()
              setHideBadge(formId, on)
              setBadgePending(false)
            }}
            aria-label="Remove the Made with badge"
          />
        </label>
      </PendingLock>

    </div>
  )
}

/* ---------- Font ---------- */

const sampleClass = { sans: "font-sans", serif: "font-serif", mono: "font-mono" } as const

export function FontPanel({ formId, design }: PanelProps) {
  return (
    <div className="grid gap-3">
      <Section title="Font">
        <div role="radiogroup" aria-label="Font" className="grid grid-cols-3 gap-2">
          {fonts.map((f) => {
            const active = design.font === f.id
            return (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={f.label}
               
                onClick={() => setFont(formId, f.id)}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 rounded-lg border px-2 py-2.5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  active ? "border-foreground bg-muted/50 ring-2 ring-foreground/20" : "hover:bg-muted/30"
                )}
              >
                <span className={cn("text-2xl leading-none", sampleClass[f.id])}>Aa</span>
                <span className="text-[11px] text-muted-foreground">{f.label}</span>
                {active && <CheckIcon className="absolute right-1.5 top-1.5 size-3" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      </Section>
    </div>
  )
}

/* ---------- Thank-you page ---------- */

export function ThanksPanel({ formId, design }: PanelProps) {
  const t = design.thankYou
  const urlBad = (v: string) => !!v && !isWebUrl(v)
  const id = React.useId()

  return (
    <div className="grid gap-3">
      <Section title="Thank-you page">
        <div className="grid gap-1.5">
          <label htmlFor={`${id}-title`} className="text-xs text-muted-foreground">Title</label>
          <Input id={`${id}-title`} maxLength={120} placeholder="Thank you" value={t.title} onChange={(e) => setThankYou(formId, { title: e.target.value })} className="h-9" />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor={`${id}-msg`} className="text-xs text-muted-foreground">Message</label>
          <Textarea id={`${id}-msg`} rows={3} maxLength={500} placeholder="Your response has been recorded." value={t.message} onChange={(e) => setThankYou(formId, { message: e.target.value })} className="rounded-lg text-sm" />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
          <div className="grid min-w-0 gap-1.5">
            <label htmlFor={`${id}-bl`} className="text-xs text-muted-foreground">Button label</label>
            <Input id={`${id}-bl`} maxLength={40} placeholder="Visit our site" value={t.buttonLabel} onChange={(e) => setThankYou(formId, { buttonLabel: e.target.value })} className="h-9" />
          </div>
          <div className="grid min-w-0 gap-1.5">
            <label htmlFor={`${id}-bu`} className="text-xs text-muted-foreground">Button link</label>
            <Input id={`${id}-bu`} type="url" inputMode="url" placeholder="https://" value={t.buttonUrl} aria-invalid={urlBad(t.buttonUrl)} onChange={(e) => setThankYou(formId, { buttonUrl: e.target.value })} className="h-9" />
          </div>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor={`${id}-ru`} className="text-xs text-muted-foreground">Or send people to your own page</label>
          <Input id={`${id}-ru`} type="url" inputMode="url" placeholder="https://your-site.com/thanks" value={t.redirectUrl} aria-invalid={urlBad(t.redirectUrl)} onChange={(e) => setThankYou(formId, { redirectUrl: e.target.value })} className="h-9" />
          {(urlBad(t.buttonUrl) || urlBad(t.redirectUrl)) && <p className="text-xs text-destructive">Links must start with https://</p>}
        </div>
      </Section>
    </div>
  )
}
