"use client"

import * as React from "react"
import { BanIcon, CheckIcon, LockIcon, SparklesIcon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  accentPresets,
  backgroundColors,
  backgroundOpacities,
  fonts,
  isWebUrl,
  logoSizes,
  radii,
  setAccent,
  setBackground,
  setFont,
  setHideBadge,
  setLogo,
  setRadius,
  setThankYou,
  setWidth,
  widths,
  type BackgroundOpacity,
  type FormDesign,
} from "@/lib/api/mock-design"
import { brand } from "@/lib/brand"
import { setDevPro, useIsPro } from "@/lib/pro"
import { cn } from "@/lib/utils"

type PanelProps = { formId: string; design: FormDesign }

/* ---------- small shared pieces ---------- */

function ProBadge() {
  return (
    <Badge variant="secondary" className="gap-1">
      <SparklesIcon className="size-3" aria-hidden="true" /> Pro
    </Badge>
  )
}

/* Shown on a Pro panel while the account is not Pro. */
function UpgradeHint() {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed bg-muted/40 px-3 py-2.5">
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <LockIcon className="size-3.5 shrink-0" aria-hidden="true" /> Included in Pro.
      </p>
      <Button size="sm" onClick={() => toast.message("Plans are coming soon.")}>
        Upgrade
      </Button>
    </div>
  )
}

function Section({ title, pro, children }: { title: string; pro?: boolean; children: React.ReactNode }) {
  return (
    <section className="grid gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{title}</h3>
        {pro && <ProBadge />}
      </div>
      {children}
    </section>
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
  const pro = useIsPro()
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

      {process.env.NODE_ENV !== "production" && (
        <label className="flex items-center justify-between gap-3 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
          <span>Dev only: pretend this account is on Pro</span>
          <Switch size="sm" checked={pro} onCheckedChange={setDevPro} aria-label="Dev only: Pro on or off" />
        </label>
      )}
    </div>
  )
}

/* ---------- Brand: accent colour, logo, corners, width, badge (Pro) ---------- */

export function BrandPanel({ formId, design }: PanelProps) {
  const pro = useIsPro()
  const logo = design.logo
  const logoUrlBad = !!logo?.url && !isWebUrl(logo.url)

  return (
    <div className="grid gap-5">
      <Section title="Accent colour" pro>
        <p className="-mt-1 text-xs text-muted-foreground">Buttons, progress bar and highlights.</p>
        <div role="radiogroup" aria-label="Accent colour" className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            role="radio"
            aria-checked={!design.accent}
            aria-label="Default accent"
            disabled={!pro}
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
                disabled={!pro}
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
          <label className={cn("flex h-8 items-center gap-2 rounded-full border px-3 text-xs sm:h-9", !pro && "opacity-50")}>
            Custom
            <input
              type="color"
              aria-label="Custom accent colour"
              disabled={!pro}
              value={design.accent ?? "#2563eb"}
              onChange={(e) => setAccent(formId, e.target.value)}
              className="size-5 cursor-pointer rounded border-0 bg-transparent p-0 disabled:cursor-not-allowed"
            />
          </label>
        </div>
      </Section>

      <Section title="Logo" pro>
        <Input
          type="url"
          inputMode="url"
          aria-label="Logo image address"
          placeholder="https://your-site.com/logo.png"
          disabled={!pro}
          value={logo?.url ?? ""}
          onChange={(e) => {
            const url = e.target.value
            if (!url && !logo) return
            setLogo(formId, url ? { url, size: logo?.size ?? "md", align: logo?.align ?? "left" } : null)
          }}
          aria-invalid={logoUrlBad}
          className="h-9"
        />
        {logoUrlBad && <p className="-mt-1 text-xs text-destructive">Use a full web address starting with https://</p>}
        <div className="grid grid-cols-2 gap-2">
          <Segmented
            label="Logo size"
            value={logo?.size ?? "md"}
            options={logoSizes}
            disabled={!pro || !logo}
            onChange={(size) => logo && setLogo(formId, { ...logo, size })}
          />
          <Segmented
            label="Logo position"
            value={logo?.align ?? "left"}
            options={[
              { id: "left", label: "Left" },
              { id: "center", label: "Centre" },
            ]}
            disabled={!pro || !logo}
            onChange={(align) => logo && setLogo(formId, { ...logo, align })}
          />
        </div>
      </Section>

      <Section title="Corners" pro>
        <Segmented label="Corners" value={design.radius} options={radii} disabled={!pro} onChange={(r) => setRadius(formId, r)} />
      </Section>

      <Section title="Form width" pro>
        <Segmented label="Form width" value={design.width} options={widths} disabled={!pro} onChange={(w) => setWidth(formId, w)} />
      </Section>

      <label className={cn("flex items-center justify-between gap-3 text-sm", !pro && "opacity-50")}>
        <span>
          Remove “Made with {brand.name}”<span className="ml-2 align-middle"><ProBadge /></span>
        </span>
        <Switch checked={pro && design.hideBadge} disabled={!pro} onCheckedChange={(on) => setHideBadge(formId, on)} aria-label="Remove the Made with badge" />
      </label>

      {!pro && <UpgradeHint />}
    </div>
  )
}

/* ---------- Font (Pro) ---------- */

const sampleClass = { sans: "font-sans", serif: "font-serif", mono: "font-mono" } as const

export function FontPanel({ formId, design }: PanelProps) {
  const pro = useIsPro()
  return (
    <div className="grid gap-3">
      <Section title="Font" pro>
        <div role="radiogroup" aria-label="Font" className="grid grid-cols-3 gap-2">
          {fonts.map((f) => {
            const active = pro && design.font === f.id
            return (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={f.label}
                disabled={!pro}
                onClick={() => setFont(formId, f.id)}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 rounded-lg border px-2 py-2.5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  active ? "border-foreground bg-muted/50 ring-2 ring-foreground/20" : "enabled:hover:bg-muted/30",
                  !pro && "cursor-not-allowed opacity-60"
                )}
              >
                <span className={cn("text-2xl leading-none", sampleClass[f.id])}>Aa</span>
                <span className="text-[11px] text-muted-foreground">{f.label}</span>
                {!pro && <LockIcon className="absolute right-1.5 top-1.5 size-3 text-muted-foreground" aria-hidden="true" />}
                {active && <CheckIcon className="absolute right-1.5 top-1.5 size-3" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      </Section>
      {!pro && <UpgradeHint />}
    </div>
  )
}

/* ---------- Thank-you page (Pro) ---------- */

export function ThanksPanel({ formId, design }: PanelProps) {
  const pro = useIsPro()
  const t = design.thankYou
  const urlBad = (v: string) => !!v && !isWebUrl(v)
  const id = React.useId()

  return (
    <div className="grid gap-3">
      <Section title="Thank-you page" pro>
        <div className="grid gap-1.5">
          <label htmlFor={`${id}-title`} className="text-xs text-muted-foreground">Title</label>
          <Input id={`${id}-title`} disabled={!pro} maxLength={120} placeholder="Thank you" value={t.title} onChange={(e) => setThankYou(formId, { title: e.target.value })} className="h-9" />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor={`${id}-msg`} className="text-xs text-muted-foreground">Message</label>
          <Textarea id={`${id}-msg`} disabled={!pro} rows={3} maxLength={500} placeholder="Your response has been recorded." value={t.message} onChange={(e) => setThankYou(formId, { message: e.target.value })} className="rounded-lg text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1.5">
            <label htmlFor={`${id}-bl`} className="text-xs text-muted-foreground">Button label</label>
            <Input id={`${id}-bl`} disabled={!pro} maxLength={40} placeholder="Visit our site" value={t.buttonLabel} onChange={(e) => setThankYou(formId, { buttonLabel: e.target.value })} className="h-9" />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor={`${id}-bu`} className="text-xs text-muted-foreground">Button link</label>
            <Input id={`${id}-bu`} type="url" inputMode="url" disabled={!pro} placeholder="https://" value={t.buttonUrl} aria-invalid={urlBad(t.buttonUrl)} onChange={(e) => setThankYou(formId, { buttonUrl: e.target.value })} className="h-9" />
          </div>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor={`${id}-ru`} className="text-xs text-muted-foreground">Or send people to your own page</label>
          <Input id={`${id}-ru`} type="url" inputMode="url" disabled={!pro} placeholder="https://your-site.com/thanks" value={t.redirectUrl} aria-invalid={urlBad(t.redirectUrl)} onChange={(e) => setThankYou(formId, { redirectUrl: e.target.value })} className="h-9" />
          {(urlBad(t.buttonUrl) || urlBad(t.redirectUrl)) && <p className="text-xs text-destructive">Links must start with https://</p>}
        </div>
      </Section>
      {!pro && <UpgradeHint />}
    </div>
  )
}

/* ---------- AI (Pro, UI only) ---------- */

export function AiPanel() {
  const pro = useIsPro()
  const [prompt, setPrompt] = React.useState("")
  return (
    <div className="grid gap-3">
      <Section title="Design with AI" pro>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={!pro}
          rows={3}
          aria-label="Describe the look you want"
          placeholder="Describe the look you want, like “calm and friendly for a yoga studio”"
          className="rounded-lg text-sm"
        />
        <Button disabled={!pro || !prompt.trim()} onClick={() => toast.message("AI design is coming soon.")} className="w-fit">
          <SparklesIcon /> Generate design
        </Button>
      </Section>
      {!pro && <UpgradeHint />}
    </div>
  )
}
