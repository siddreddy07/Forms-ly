"use client"

import * as React from "react"
import { CalendarDate } from "@internationalized/date"
import { ChevronDownIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar-rac"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

function toCalendarDate(date: Date) {
  return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

function fromCalendarDate(value: { year: number; month: number; day: number }) {
  return new Date(value.year, value.month - 1, value.day)
}

/* A date button that opens the calendar. Past days are disabled, so a closing date can never land in the past. */
export function CalendarDatePicker({
  value,
  onChange,
  minValue,
  id,
  placeholder = "Select date",
  className,
}: {
  value?: Date
  onChange: (date: Date | undefined) => void
  minValue?: Date
  id?: string
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" id={id} className={cn("w-52 justify-between font-normal", className)}>
            <span className="truncate">{value ? value.toLocaleDateString() : placeholder}</span>
            <ChevronDownIcon data-icon="inline-end" />
          </Button>
        }
      />
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          aria-label="Closing date"
          value={value ? toCalendarDate(value) : null}
          minValue={minValue ? toCalendarDate(minValue) : undefined}
          onChange={(next) => {
            /* Single mode always hands back one date; the wrapper's props widen the type to include ranges. */
            const picked = next as { year: number; month: number; day: number } | null
            onChange(picked ? fromCalendarDate(picked) : undefined)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
