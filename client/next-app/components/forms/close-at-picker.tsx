"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { XIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { CalendarDatePicker } from "@/components/ui/calendar-date-picker"
import WheelPicker, { type WheelColumn } from "@/components/ui/wheel-picker"
import { useFormGate } from "@/components/workspace/form-gate"

type TimeParts = { hour: string; minute: string; period: string }

/* A new date starts at the end of that day; the wheel can move it earlier. */
const DEFAULT_TIME: TimeParts = { hour: "11", minute: "59", period: "pm" }
const MIN_LEAD_MS = 15 * 60 * 1000

/* Explicit 1–12 and 00–59 values, so the label the wheel shows is the value we save. */
const TIME_COLUMNS: WheelColumn[] = [
  {
    id: "hour",
    label: "Hours",
    loop: true,
    className: "w-9",
    options: Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })),
  },
  {
    id: "minute",
    label: "Minutes",
    loop: true,
    className: "w-9",
    options: Array.from({ length: 60 }, (_, i) => ({
      value: String(i).padStart(2, "0"),
      label: String(i).padStart(2, "0"),
    })),
  },
  {
    id: "period",
    label: "AM or PM",
    className: "w-9",
    options: [
      { value: "am", label: "AM" },
      { value: "pm", label: "PM" },
    ],
  },
]

function timeParts(value: string | null): TimeParts {
  if (!value) return DEFAULT_TIME
  const at = new Date(value)
  if (Number.isNaN(at.getTime())) return DEFAULT_TIME
  const hours = at.getHours()
  return {
    hour: String(hours % 12 === 0 ? 12 : hours % 12),
    minute: String(at.getMinutes()).padStart(2, "0"),
    period: hours < 12 ? "am" : "pm",
  }
}

function combine(day: Date, time: TimeParts) {
  const at = new Date(day)
  const hour = (Number(time.hour) % 12) + (time.period === "pm" ? 12 : 0)
  at.setHours(hour, Number(time.minute), 0, 0)
  return at
}

/* A closing time has to be at least 15 minutes away, so nobody can close a form on someone mid-answer. */
function tooSoon(at: Date) {
  return at.getTime() < Date.now() + MIN_LEAD_MS
}

/* The Settings tab's closing date and time. Edits stay local until Save is pressed; publishing is what makes the
   saved time live. */
export function CloseAtPicker() {
  const { form, settings, setSettings } = useFormGate()
  const router = useRouter()
  const [date, setDate] = React.useState<Date | undefined>(() =>
    settings.closeAt ? new Date(settings.closeAt) : undefined
  )
  const [time, setTime] = React.useState<TimeParts>(() => timeParts(settings.closeAt))
  const [status, setStatus] = React.useState<"idle" | "saving" | "saved" | "error">("idle")

  /* Follow the saved time if it changes underneath us (loaded late, or saved). */
  const savedIso = settings.closeAt
  React.useEffect(() => {
    setDate(savedIso ? new Date(savedIso) : undefined)
    setTime(timeParts(savedIso))
  }, [savedIso])

  /* The calendar can't go before today, and the wheel is checked against the one-hour minimum. */
  const minDate = React.useMemo(() => {
    const day = new Date()
    day.setHours(0, 0, 0, 0)
    return day
  }, [])

  /* Re-render every few seconds so the 15 minute check keeps up with the clock while the page sits open. */
  const [, setTick] = React.useState(0)
  React.useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 5000)
    return () => clearInterval(t)
  }, [])

  const draftAt = date ? combine(date, time) : null
  const savedAt = settings.closeAt ? new Date(settings.closeAt) : null
  /* Compared to the minute, the way the wheel works, so picking the saved time again is not a change. */
  const minute = (d: Date) => Math.floor(d.getTime() / 60_000)
  const dirty = draftAt && savedAt ? minute(draftAt) !== minute(savedAt) : !!draftAt !== !!savedAt
  const error = dirty && draftAt && tooSoon(draftAt) ? "Pick a time at least 15 minutes from now." : null
  /* Save needs both: the time differs from the stored one, and it is at least 15 minutes from the current time. */
  const canSave = dirty && !error

  function pickDate(next: Date | undefined) {
    if (!next) {
      clear()
      return
    }
    const day = new Date(next)
    day.setHours(0, 0, 0, 0)
    if (day.getTime() < minDate.getTime()) return
    setDate(next)
    setStatus("idle")
  }

  function pickTime(next: Record<string, string>) {
    setTime(next as TimeParts)
    setStatus("idle")
  }

  function clear() {
    setDate(undefined)
    setTime(DEFAULT_TIME)
    setStatus("idle")
  }

  async function save() {
    if (!canSave || status === "saving") return
    setStatus("saving")
    const ok = await setSettings({ ...settings, closeAt: draftAt ? draftAt.toISOString() : null })
    setStatus(ok ? "saved" : "error")
    if (!ok) return
    toast.success(draftAt ? "Closing time updated." : "Closing time removed.", {
      action: { label: "Go live", onClick: () => router.push(`/forms/${form.id}/share`) },
      duration: 8000,
      classNames: {
        toast: "cn-toast !min-h-0 !gap-2 !py-1.5 !pr-1.5 !pl-3 !text-xs",
        title: "!text-xs !leading-tight",
        actionButton: "toast-pill-action",
      },
    })
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <CalendarDatePicker
          id="close-date"
          value={date}
          minValue={minDate}
          onChange={pickDate}
          className="w-32 sm:w-42"
        />
        <WheelPicker
          columns={TIME_COLUMNS}
          value={time}
          onValueChange={pickTime}
          label="Closing time"
          visibleRows={1}
          className="w-32 rounded-lg border-border bg-muted/40 px-2 dark:border-border dark:bg-muted/20"
        />
        {date && (
          <Button variant="ghost" size="sm" onClick={clear} disabled={status === "saving"}>
            <XIcon data-icon="inline-start" />
            Clear
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={save} disabled={!canSave || status === "saving"}>
          {status === "saving" ? "Saving…" : "Save"}
        </Button>
        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : status === "error" ? (
          <p className="text-xs text-destructive">Couldn&apos;t save. Try again.</p>
        ) : status === "saved" ? (
          <p className="text-xs text-muted-foreground">Saved</p>
        ) : dirty ? (
          <p className="text-xs text-muted-foreground">
            Unsaved change{draftAt ? ` · closes ${draftAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}` : ""}
          </p>
        ) : null}
      </div>
    </div>
  )
}
