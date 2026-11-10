"use client"

import * as React from "react"
import { format } from "date-fns"
import { ChevronDownIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useFormGate } from "@/components/workspace/form-gate"

/* A new date starts at the end of that day; the time field can move it earlier. */
const DEFAULT_TIME = "23:59:00"

function timeOf(value: string | null) {
  if (!value) return DEFAULT_TIME
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? DEFAULT_TIME : format(date, "HH:mm:ss")
}

/* The Settings tab's closing date and time. The date opens a calendar, the time is a normal time field.
   Every change saves at once; publishing is what makes it the live closing time. */
export function CloseAtPicker() {
  const { settings, setSettings } = useFormGate()
  const [open, setOpen] = React.useState(false)
  /* The saved value is the source of truth; the draft only holds a time that is still being typed. */
  const date = settings.closeAt ? new Date(settings.closeAt) : undefined
  const [timeDraft, setTimeDraft] = React.useState<string | null>(null)
  const time = timeDraft ?? timeOf(settings.closeAt)

  function save(nextDate: Date | undefined, nextTime: string) {
    if (!nextDate) {
      void setSettings({ ...settings, closeAt: null })
      return
    }
    const [hours = 0, minutes = 0, seconds = 0] = nextTime.split(":").map(Number)
    const at = new Date(nextDate)
    at.setHours(hours, minutes, seconds, 0)
    void setSettings({ ...settings, closeAt: at.toISOString() })
  }

  function pickDate(next: Date | undefined) {
    setOpen(false)
    save(next, time)
  }

  function pickTime(raw: string) {
    setTimeDraft(raw)
    /* Browsers can send a half-typed time; only save a complete one. */
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(raw)) save(date, raw.length === 5 ? `${raw}:00` : raw)
  }

  function clear() {
    setTimeDraft(null)
    void setSettings({ ...settings, closeAt: null })
  }

  return (
    <FieldGroup className="flex-row flex-wrap items-end gap-2">
      <Field className="w-40">
        <FieldLabel htmlFor="close-date">Date</FieldLabel>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <Button variant="outline" id="close-date" className="w-full justify-between font-normal">
                {date ? format(date, "PPP") : "Select date"}
                <ChevronDownIcon data-icon="inline-end" />
              </Button>
            }
          />
          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              captionLayout="dropdown"
              defaultMonth={date}
              onSelect={pickDate}
            />
          </PopoverContent>
        </Popover>
      </Field>
      <Field className="w-28">
        <FieldLabel htmlFor="close-time">Time</FieldLabel>
        <Input
          type="time"
          id="close-time"
          step="1"
          value={time}
          disabled={!date}
          onChange={(e) => pickTime(e.target.value)}
          onBlur={() => {
            if (date && time !== timeOf(settings.closeAt)) save(date, time)
            setTimeDraft(null)
          }}
          className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />
      </Field>
      {date && (
        <Button variant="ghost" size="sm" onClick={clear}>
          <XIcon data-icon="inline-start" />
          Clear
        </Button>
      )}
    </FieldGroup>
  )
}
