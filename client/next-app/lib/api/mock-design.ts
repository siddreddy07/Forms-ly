import type { CSSProperties } from "react"

/* The form's design (Design tab). The UI reads it from this browser's storage so every change shows instantly,
   and this file also sends it to the backend (PATCH /forms/:id { design }) a moment after you stop changing it.
   The backend copy is the one that lasts: it is loaded back in when a form opens (see hydrateDesign).
   Everyone gets every option: page background colour, accent colour, font, corners, width,
   thank-you page and hiding the badge. */

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

/* What people see after they submit. Empty strings mean "use the default". */
export type ThankYou = { title: string; message: string; buttonLabel: string; buttonUrl: string; redirectUrl: string }

export type FormDesign = {
  /* The page behind the form. The form card itself is never tinted. */
  background: { color: BackgroundColorId; opacity: BackgroundOpacity } | null
  font: FontId
  accent: string | null
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
  radius: "md",
  width: "normal",
  thankYou: defaultThankYou,
  hideBadge: false,
}

export const designKey = (formId: string) => `mock-server:design:${formId}`
/* Present while this browser has design changes the backend has not confirmed, even after a reload. */
const unsentKey = (formId: string) => `mock-server:design-unsent:${formId}`
const setUnsent = (formId: string, on: boolean) => {
  try {
    if (on) window.localStorage.setItem(unsentKey(formId), "1")
    else window.localStorage.removeItem(unsentKey(formId))
  } catch {
    /* storage unavailable */
  }
}

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

/* The CSS for a form's page: background, accent colour, font, corners and width.
   Everything is set as CSS variables, so the form's own styles pick it up. */
export function designStyle(design: FormDesign | null): CSSProperties {
  if (!design) return {}
  const style: Record<string, string> = {}

  const bg = backgroundCss(design)
  if (bg) style.backgroundColor = bg

  const family = fonts.find((f) => f.id === design.font)?.family
  if (family) Object.assign(style, { "--font-sans": family, "--font-display": family, fontFamily: family })

  if (design.accent) {
    Object.assign(style, { "--primary": design.accent, "--primary-foreground": readableOn(design.accent), "--ring": design.accent })
  }

  const radius = radii.find((r) => r.id === design.radius)?.value
  if (radius) style["--radius"] = radius

  const width = widths.find((w) => w.id === design.width)?.value
  if (width) style["--form-width"] = width

  return style as CSSProperties
}

/* The thank-you screen, with defaults filled in. */
export function thankYouFor(design: FormDesign | null, options: { redirect: boolean }) {
  const t = design ? design.thankYou : defaultThankYou
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
    const t = (d.thankYou ?? {}) as Partial<ThankYou>
    return {
      background: bgOk ? b! : null,
      font: fonts.some((f) => f.id === d.font) ? d.font! : "sans",
      accent: isHex(d.accent) ? d.accent : null,
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

/* ---------- Saving to the backend ----------
   Every change is a database write, so changes are sent in bursts: 3 seconds after you stop, and at least every
   20 seconds while you keep going. Nothing is sent if the design is the same as what the backend already has. One request per form at a time; changes made during a save go in the next one.
   A failed save retries after 3s, 6s, 12s... up to 60s. The page registers how to send a request with setDesignSaver. */
const IDLE_MS = 3000
const MAX_WAIT_MS = 20000
const RETRY_BASE_MS = 3000
const RETRY_MAX_MS = 60000

export type DesignSaveResult = { ok: true } | { ok: false; retry: true; waitSeconds: number | null } | { ok: false; retry: false }
type Saver = (formId: string, design: FormDesign, keepalive: boolean) => Promise<DesignSaveResult>

export type SaveState = { status: "idle" | "saving" | "saved" | "error"; savedAt: number | null }
const idle: SaveState = { status: "idle", savedAt: null }
const saveStates = new Map<string, SaveState>()
const saveListeners = new Set<() => void>()

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

let saver: Saver | null = null
/* Forms with changes the backend has not confirmed yet. */
const pending = new Set<string>()
const running = new Set<string>()
/* The design the backend last confirmed (as text), to skip sending something it already has. */
const confirmed = new Map<string, string>()
const failures = new Map<string, number>()
const idleTimers = new Map<string, ReturnType<typeof setTimeout>>()
const maxTimers = new Map<string, ReturnType<typeof setTimeout>>()
const retryTimers = new Map<string, ReturnType<typeof setTimeout>>()

function clearTimers(formId: string) {
  for (const timers of [idleTimers, maxTimers, retryTimers]) {
    clearTimeout(timers.get(formId))
    timers.delete(formId)
  }
}

async function runSave(formId: string, keepalive = false) {
  clearTimers(formId)
  if (!saver || !pending.has(formId) || running.has(formId)) return
  if (typeof navigator !== "undefined" && navigator.onLine === false) return

  const current = parseDesign(window.localStorage.getItem(designKey(formId)))
  if (confirmed.get(formId) === JSON.stringify(current)) {
    /* Same as the backend already has (changed and changed back): nothing to send. */
    pending.delete(formId)
    setUnsent(formId, false)
    if (getSaveState(formId).status === "saving") setSaveState(formId, { status: "saved", savedAt: getSaveState(formId).savedAt ?? Date.now() })
    return
  }

  running.add(formId)
  pending.delete(formId)
  setSaveState(formId, { status: "saving", savedAt: getSaveState(formId).savedAt })
  let result: DesignSaveResult
  try {
    result = await saver(formId, current, keepalive)
  } catch {
    result = { ok: false, retry: true, waitSeconds: null }
  }
  running.delete(formId)

  if (result.ok) {
    confirmed.set(formId, JSON.stringify(current))
    failures.delete(formId)
    /* Changed again while saving: send the newest in the next save. */
    if (pending.has(formId)) scheduleSave(formId)
    else {
      setUnsent(formId, false)
      setSaveState(formId, { status: "saved", savedAt: Date.now() })
    }
    return
  }

  pending.add(formId)
  setSaveState(formId, { status: "error", savedAt: getSaveState(formId).savedAt })
  if (result.retry) {
    const n = (failures.get(formId) ?? 0) + 1
    failures.set(formId, n)
    const wait = result.waitSeconds ? result.waitSeconds * 1000 : Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** (n - 1)) + Math.random() * 1000
    retryTimers.set(formId, setTimeout(() => void runSave(formId), wait))
  }
  /* If the backend refused the design (not retry), the next change tries again. */
}

function scheduleSave(formId: string) {
  clearTimeout(idleTimers.get(formId))
  clearTimeout(retryTimers.get(formId))
  idleTimers.set(formId, setTimeout(() => void runSave(formId), IDLE_MS))
  if (!maxTimers.has(formId)) maxTimers.set(formId, setTimeout(() => void runSave(formId), MAX_WAIT_MS))
}

/* The page that knows how to talk to the backend registers itself here, and removes itself when it goes away. */
export function setDesignSaver(next: Saver | null) {
  saver = next
  if (next) pending.forEach((id) => scheduleSave(id))
}

/* Send any waiting changes right now (the page is being closed, or you are leaving the form). */
export function flushDesign(formId: string) {
  void runSave(formId, true)
}

if (typeof window !== "undefined") {
  /* Back online: send whatever piled up while offline. */
  window.addEventListener("online", () => pending.forEach((id) => void runSave(id)))
}

/* When a form opens: the backend copy replaces the one in this browser, unless this browser has changes the
   backend has not got yet. A form whose backend design is still empty adopts the one saved in this browser. */
export function hydrateDesign(formId: string, fromServer: unknown) {
  if (pending.has(formId) || running.has(formId)) return
  /* Changes from an earlier visit that never reached the backend: keep them and send them now. */
  if (window.localStorage.getItem(unsentKey(formId))) {
    pending.add(formId)
    scheduleSave(formId)
    return
  }
  const serverIsEmpty = !fromServer || (typeof fromServer === "object" && Object.keys(fromServer).length === 0)
  try {
    if (serverIsEmpty) {
      if (window.localStorage.getItem(designKey(formId))) {
        pending.add(formId)
        scheduleSave(formId)
      }
      return
    }
    const fromBackend = parseDesign(JSON.stringify(fromServer))
    confirmed.set(formId, JSON.stringify(fromBackend))
    window.localStorage.setItem(designKey(formId), JSON.stringify(fromBackend))
    listeners.forEach((l) => l())
  } catch {
    /* storage unavailable: the page just shows defaults */
  }
}

function update(formId: string, patch: Partial<FormDesign>) {
  try {
    const now = parseDesign(window.localStorage.getItem(designKey(formId)))
    const next = { ...now, ...patch }
    if (JSON.stringify(next) === JSON.stringify(now)) return
    window.localStorage.setItem(designKey(formId), JSON.stringify(next))
  } catch {
    /* storage unavailable or full */
    setSaveState(formId, { status: "error", savedAt: getSaveState(formId).savedAt })
    listeners.forEach((l) => l())
    return
  }
  listeners.forEach((l) => l())

  pending.add(formId)
  setUnsent(formId, true)
  setSaveState(formId, { status: "saving", savedAt: getSaveState(formId).savedAt })
  scheduleSave(formId)
}

export const setBackground = (formId: string, background: FormDesign["background"]) => update(formId, { background })
export const setFont = (formId: string, font: FontId) => update(formId, { font })
export const setAccent = (formId: string, accent: string | null) => update(formId, { accent })
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
