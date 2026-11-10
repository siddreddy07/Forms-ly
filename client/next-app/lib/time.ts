const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

export function timeAgo(iso: string, now = Date.now()) {
  const diff = (new Date(iso).getTime() - now) / 1000
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ]
  for (const [unit, secs] of units) {
    if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit)
  }
  return "just now"
}

/* "today at 5:00 PM", "tomorrow at 9:00 AM", or "Nov 20, 2026 at 5:00 PM" for the public form's closing notice. */
export function closingLabel(iso: string, now = new Date()): string | null {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return null
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((day(at) - day(now)) / 86_400_000)
  const time = at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  if (days === 0) return `today at ${time}`
  if (days === 1) return `tomorrow at ${time}`
  return at.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: at.getFullYear() === now.getFullYear() ? undefined : "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

/* A full date and time, for "this form closed on ...". */
export function fullDateTime(iso: string): string {
  const at = new Date(iso)
  return Number.isNaN(at.getTime()) ? "" : at.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}
