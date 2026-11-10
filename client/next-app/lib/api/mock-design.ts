import type { CSSProperties } from "react"

/* Stand-in for the backend's form design, kept in this browser like mock-meta.ts.
   Real API to follow: PATCH /forms/:id { design }
   Free: page background colour. Pro: everything else (accent colour, logo, font, corners, width,
   thank-you page, badge). The Pro parts are only applied when the account is Pro. */

export const backgroundColors = [
  { id: "red", label: "Red", rgb: "239 68 68" },
  { id: "orange", label: "Orange", rgb: "249 115 22" },
  { id: "yellow", label: "Yellow", rgb: "234 179 8" },
  { id: "green", label: "Green", rgb: "34 197 94" },
  { id: "blue", label: "Blue", rgb: "59 130 246" },
  { id: "indigo", label: "Indigo", rgb: "99 102 241" },
  { id: "violet", label: "Violet", rgb: "168 85 247" },
] as const

export const backgroundOpacities = [30, 60, 100] as const

export type BackgroundColorId = (typeof backgroundColors)[number]["id"]
export type BackgroundOpacity = (typeof backgroundOpacities)[number]

/* Fonts */
export const fonts = [
  { id: "sans", label: "Modern", family: null },
  { id: "serif", label: "Classic", family: 'Georgia, "Times New Roman", serif' },
  { id: "mono", label: "Technical", family: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" },
] as const
export type FontId = (typeof fonts)[number]["id"]

/* Accent colour: buttons, progress bar, focus ring. null keeps the default. */
export const accentPresets = [
  { label: "Blue", hex: "#2563eb" },
  { label: "Teal", hex: "#0d9488" },
  { label: "Green", hex: "#16a34a" },
  { label: "Orange", hex: "#ea580c" },
  { label: "Red", hex: "#dc2626" },
  { label: "Pink", hex: "#db2777" },
  { label: "Purple", hex: "#7c3aed" },
] as const

/* Corners and form width */
export const radii = [
  { id: "sm", label: "Square", value: "0.25rem" },
  { id: "md", label: "Rounded", value: null },
  { id: "lg", label: "Round", value: "1rem" },
] as const
export type RadiusId = (typeof radii)[number]["id"]

export const widths = [
  { id: "narrow", label: "Narrow", value: "30rem" },
  { id: "normal", label: "Normal", value: "36rem" },
  { id: "wide", label: "Wide", value: "48rem" },
] as const
export type WidthId = (typeof widths)[number]["id"]

export const logoSizes = [
  { id: "sm", label: "Small", height: "2rem" },
  { id: "md", label: "Medium", height: "3rem" },
  { id: "lg", label: "Large", height: "4.5rem" },
] as const
export type LogoSizeId = (typeof logoSizes)[number]["id"]
export type LogoAlign = "left" | "center"

export type Logo = { url: string; size: LogoSizeId; align: LogoAlign }

/* What people see after they submit. Empty strings mean "use the default". */
export type ThankYou = { title: string; message: string; buttonLabel: string; buttonUrl: string; redirectUrl: string }

export type FormDesign = {
  /* Free: the page behind the form. The form card itself is never tinted. */
  background: { color: BackgroundColorId; opacity: BackgroundOpacity } | null
  /* Pro from here on */
  font: FontId
  accent: string | null
  logo: Logo | null
  radius: RadiusId
  width: WidthId
  thankYou: ThankYou
  hideBadge: boolean
}

export const defaultThankYou: ThankYou = { title: "", message: "", buttonLabel: "", buttonUrl: "", redirectUrl: "" }

export const defaultDesign: FormDesign = {
  background: null,
  font: "sans",
  accent: null,
  logo: null,
  radius: "md",
  width: "normal",
  thankYou: defaultThankYou,
  hideBadge: false,
}

export const designKey = (formId: string) => `mock-server:design:${formId}`

export function backgroundCss(design: FormDesign): string | undefined {
  const b = design.background
  if (!b) return undefined
  const c = backgroundColors.find((x) => x.id === b.color)
  return c ? `rgb(${c.rgb} / ${b.opacity}%)` : undefined
}

/* Only web addresses are allowed in links and images. */
export const isWebUrl = (value: string) => /^https?:\/\/\S+$/i.test(value.trim())

const isHex = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v)

/* Black or white text, whichever reads better on this colour. */
function readableOn(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return (r! * 299 + g! * 587 + b! * 114) / 1000 > 150 ? "#111111" : "#ffffff"
}

/* The CSS for a form's page: background, plus the Pro look when the account is Pro.
   Everything is set as CSS variables, so the form's own styles pick it up. */
export function designStyle(design: FormDesign | null, pro: boolean): CSSProperties {
  if (!design) return {}
  const style: Record<string, string> = {}

  const bg = backgroundCss(design)
  if (bg) style.backgroundColor = bg

  if (pro) {
    const family = fonts.find((f) => f.id === design.font)?.family
    if (family) Object.assign(style, { "--font-sans": family, "--font-display": family, fontFamily: family })

    if (design.accent) {
      Object.assign(style, { "--primary": design.accent, "--primary-foreground": readableOn(design.accent), "--ring": design.accent })
    }

    const radius = radii.find((r) => r.id === design.radius)?.value
    if (radius) style["--radius"] = radius

    const width = widths.find((w) => w.id === design.width)?.value
    if (width) style["--form-width"] = width
  }
  return style as CSSProperties
}

/* The thank-you screen, with defaults filled in. Pro only; free accounts always get the default. */
export function thankYouFor(design: FormDesign | null, pro: boolean, options: { redirect: boolean }) {
  const t = pro && design ? design.thankYou : defaultThankYou
  return {
    title: t.title.trim() || "Thank you",
    message: t.message.trim() || "Your response has been recorded.",
    button: t.buttonLabel.trim() && isWebUrl(t.buttonUrl) ? { label: t.buttonLabel.trim(), url: t.buttonUrl.trim() } : undefined,
    redirectUrl: options.redirect && isWebUrl(t.redirectUrl) ? t.redirectUrl.trim() : undefined,
  }
}

const listeners = new Set<() => void>()
export function subscribeDesign(cb: () => void) {
  listeners.add(cb)
  window.addEventListener("storage", cb)
  return () => {
    listeners.delete(cb)
    window.removeEventListener("storage", cb)
  }
}

const text = (v: unknown, max = 500) => (typeof v === "string" ? v.slice(0, max) : "")

/* Reads saved design and fixes anything missing or invalid, so old saves keep working. */
export function parseDesign(raw: string | null): FormDesign {
  if (!raw) return defaultDesign
  try {
    const d = JSON.parse(raw) as Partial<FormDesign>
    const b = d.background
    const bgOk = b && backgroundColors.some((c) => c.id === b.color) && (backgroundOpacities as readonly number[]).includes(b.opacity)
    const logo = d.logo
    const t = (d.thankYou ?? {}) as Partial<ThankYou>
    return {
      background: bgOk ? b! : null,
      font: fonts.some((f) => f.id === d.font) ? d.font! : "sans",
      accent: isHex(d.accent) ? d.accent : null,
      logo:
        logo && typeof logo.url === "string"
          ? {
              url: logo.url,
              size: logoSizes.some((s) => s.id === logo.size) ? logo.size : "md",
              align: logo.align === "center" ? "center" : "left",
            }
          : null,
      radius: radii.some((r) => r.id === d.radius) ? d.radius! : "md",
      width: widths.some((w) => w.id === d.width) ? d.width! : "normal",
      thankYou: {
        title: text(t.title, 120),
        message: text(t.message, 500),
        buttonLabel: text(t.buttonLabel, 40),
        buttonUrl: text(t.buttonUrl, 500),
        redirectUrl: text(t.redirectUrl, 500),
      },
      hideBadge: d.hideBadge === true,
    }
  } catch {
    return defaultDesign
  }
}

/* Save status, so the Design tab can show "Saving" and "Saved". The mock saves instantly; the short
   "saving" pause stands in for the network call the real backend will make (debounced PATCH). */
export type SaveState = { status: "idle" | "saving" | "saved" | "error"; savedAt: number | null }
const idle: SaveState = { status: "idle", savedAt: null }
const saveStates = new Map<string, SaveState>()
const saveListeners = new Set<() => void>()
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>()

export const subscribeSaveState = (cb: () => void) => {
  saveListeners.add(cb)
  return () => {
    saveListeners.delete(cb)
  }
}
export const getSaveState = (formId: string): SaveState => saveStates.get(formId) ?? idle

function setSaveState(formId: string, state: SaveState) {
  saveStates.set(formId, state)
  saveListeners.forEach((l) => l())
}

function update(formId: string, patch: Partial<FormDesign>) {
  try {
    const now = parseDesign(window.localStorage.getItem(designKey(formId)))
    window.localStorage.setItem(designKey(formId), JSON.stringify({ ...now, ...patch }))
  } catch {
    /* storage unavailable or full */
    setSaveState(formId, { status: "error", savedAt: getSaveState(formId).savedAt })
    listeners.forEach((l) => l())
    return
  }
  listeners.forEach((l) => l())

  setSaveState(formId, { status: "saving", savedAt: getSaveState(formId).savedAt })
  clearTimeout(saveTimers.get(formId))
  saveTimers.set(
    formId,
    setTimeout(() => setSaveState(formId, { status: "saved", savedAt: Date.now() }), 500)
  )
}

export const setBackground = (formId: string, background: FormDesign["background"]) => update(formId, { background })
export const setFont = (formId: string, font: FontId) => update(formId, { font })
export const setAccent = (formId: string, accent: string | null) => update(formId, { accent })
export const setLogo = (formId: string, logo: Logo | null) => update(formId, { logo })
export const setRadius = (formId: string, radius: RadiusId) => update(formId, { radius })
export const setWidth = (formId: string, width: WidthId) => update(formId, { width })
export const setHideBadge = (formId: string, hideBadge: boolean) => update(formId, { hideBadge })
export function setThankYou(formId: string, patch: Partial<ThankYou>) {
  try {
    const now = parseDesign(window.localStorage.getItem(designKey(formId)))
    update(formId, { thankYou: { ...now.thankYou, ...patch } })
  } catch {
    /* storage unavailable */
  }
}
