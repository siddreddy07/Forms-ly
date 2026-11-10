/* Stand-in for the backend's form design, kept in this browser like mock-meta.ts.
   Real API to follow: PATCH /forms/:id { design } */

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

/* Pro: the typeface used inside the form. */
export const fonts = [
  { id: "sans", label: "Modern", family: null },
  { id: "serif", label: "Classic", family: 'Georgia, "Times New Roman", serif' },
  { id: "mono", label: "Technical", family: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' },
] as const
export type FontId = (typeof fonts)[number]["id"]

/* background: the page behind the form (null keeps the default; the form card is never tinted). */
export type FormDesign = { background: { color: BackgroundColorId; opacity: BackgroundOpacity } | null; font: FontId }

export const defaultDesign: FormDesign = { background: null, font: "sans" }

/* CSS variables that restyle the form's text. The default font sets nothing. */
export function fontVars(font: FontId): Record<string, string> | undefined {
  const family = fonts.find((f) => f.id === font)?.family
  return family ? { "--font-sans": family, "--font-display": family, fontFamily: family } : undefined
}

export const designKey = (formId: string) => `mock-server:design:${formId}`

export function backgroundCss(design: FormDesign): string | undefined {
  const b = design.background
  if (!b) return undefined
  const c = backgroundColors.find((x) => x.id === b.color)
  return c ? `rgb(${c.rgb} / ${b.opacity}%)` : undefined
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

export function parseDesign(raw: string | null): FormDesign {
  if (!raw) return defaultDesign
  try {
    const d = JSON.parse(raw) as FormDesign
    const b = d.background
    const ok = b && backgroundColors.some((c) => c.id === b.color) && (backgroundOpacities as readonly number[]).includes(b.opacity)
    return { background: ok ? b : null, font: fonts.some((f) => f.id === d.font) ? d.font : "sans" }
  } catch {
    return defaultDesign
  }
}

function update(formId: string, patch: Partial<FormDesign>) {
  try {
    const now = parseDesign(window.localStorage.getItem(designKey(formId)))
    window.localStorage.setItem(designKey(formId), JSON.stringify({ ...now, ...patch }))
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l())
}

export const setBackground = (formId: string, background: FormDesign["background"]) => update(formId, { background })
export const setFont = (formId: string, font: FontId) => update(formId, { font })
