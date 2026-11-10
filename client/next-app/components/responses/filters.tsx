"use client"

import * as React from "react"
import { PlusIcon, SlidersHorizontalIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { activeCount, emptyFilter, opsFor, type FilterCondition, type ResponseFilter } from "@/lib/responses/filter"
import type { Block } from "@/lib/schema"
import { cn } from "@/lib/utils"

const selectClass =
  "h-10 w-full rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:outline-2 focus-visible:outline-ring sm:h-9"

/* Phones and tablets get a drawer from the bottom, within thumb reach; larger screens get one from the side. */
function useWideScreen() {
  return React.useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(min-width: 1024px)")
      mq.addEventListener("change", cb)
      return () => mq.removeEventListener("change", cb)
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => false
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}

/* The input for a condition's value, which depends on the kind of question and how it is compared. */
function ValueEditor({ block, condition, onChange }: { block: Block; condition: FilterCondition; onChange: (values: FilterCondition["values"]) => void }) {
  const { op, values } = condition
  if (op === "empty" || op === "not_empty") return null

  if (op === "any_of") {
    return (
      <ul className="grid gap-1">
        {(block.options ?? []).map((o) => {
          const on = values.includes(o.id)
          return (
            <li key={o.id}>
              <label className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg border bg-background px-3 text-sm has-[:checked]:border-foreground/40 has-[:checked]:bg-muted/60">
                <input type="checkbox" checked={on} onChange={() => onChange(on ? values.filter((v) => v !== o.id) : [...values, o.id])} className="size-4 accent-foreground" />
                <span className="min-w-0 truncate">{o.label || "Untitled option"}</span>
              </label>
            </li>
          )
        })}
      </ul>
    )
  }

  if (block.type === "yes_no") {
    return (
      <select aria-label="Value" className={selectClass} value={values[0] === undefined ? "" : String(values[0])} onChange={(e) => onChange(e.target.value === "" ? [] : [e.target.value === "true"])}>
        <option value="">Choose…</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    )
  }

  const numeric = block.type === "number" || block.type === "rating" || block.type === "scale"
  const type = numeric ? "number" : block.type === "date" ? "date" : block.type === "time" ? "time" : "text"
  const toValue = (raw: string) => (numeric && raw !== "" ? Number(raw) : raw)

  if (op === "between") {
    return (
      <div className="grid grid-cols-2 gap-2">
        {[0, 1].map((i) => (
          <Input
            key={i}
            type="number"
            inputMode="decimal"
            aria-label={i === 0 ? "From" : "To"}
            placeholder={i === 0 ? "From" : "To"}
            className="h-10 sm:h-9"
            value={values[i] === undefined ? "" : String(values[i])}
            onChange={(e) => {
              const next = [...values]
              next[i] = toValue(e.target.value)
              onChange(next)
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <Input
      type={type}
      inputMode={numeric ? "decimal" : undefined}
      aria-label="Value"
      placeholder={numeric ? "Number" : "Text"}
      className="h-10 sm:h-9"
      value={values[0] === undefined ? "" : String(values[0])}
      onChange={(e) => onChange(e.target.value === "" ? [] : [toValue(e.target.value)])}
    />
  )
}

function ConditionRow({
  columns,
  condition,
  onChange,
  onRemove,
}: {
  columns: Block[]
  condition: FilterCondition
  onChange: (next: FilterCondition) => void
  onRemove: () => void
}) {
  const block = columns.find((c) => c.id === condition.questionId)
  const ops = block ? opsFor(block) : []

  return (
    <li className="grid gap-2 rounded-xl border bg-card p-3">
      <div className="flex items-center gap-2">
        <select
          aria-label="Question"
          className={selectClass}
          value={condition.questionId}
          onChange={(e) => {
            const next = columns.find((c) => c.id === e.target.value)
            onChange({ questionId: e.target.value, op: next ? opsFor(next)[0].op : "contains", values: [] })
          }}
        >
          {columns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label || "Untitled question"}
            </option>
          ))}
        </select>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove this condition" onClick={onRemove}>
          <XIcon />
        </Button>
      </div>
      <select
        aria-label="How to compare"
        className={selectClass}
        value={condition.op}
        onChange={(e) => {
          const op = e.target.value as FilterCondition["op"]
          /* A different kind of comparison needs different values, so start again. */
          onChange({ ...condition, op, values: [] })
        }}
      >
        {ops.map((o) => (
          <option key={o.op} value={o.op}>
            {o.label}
          </option>
        ))}
      </select>
      {block && <ValueEditor block={block} condition={condition} onChange={(values) => onChange({ ...condition, values })} />}
    </li>
  )
}

/* The filter button and its drawer. The filter itself lives in the page, so it survives closing the drawer. */
export function ResponseFilters({
  columns,
  filter,
  onChange,
  shown,
}: {
  columns: Block[]
  filter: ResponseFilter
  onChange: (next: ResponseFilter) => void
  /* How many responses pass the filter right now. */
  shown: number
}) {
  const wide = useWideScreen()
  const active = activeCount(filter)

  function addCondition() {
    const first = columns[0]
    if (!first) return
    onChange({ ...filter, conditions: [...filter.conditions, { questionId: first.id, op: opsFor(first)[0].op, values: [] }] })
  }

  return (
    <Sheet>
      <SheetTrigger
        aria-label={active ? `Filters, ${active} on` : "Filters"}
        render={<Button variant="outline" size="lg" className="relative" />}
      >
        <SlidersHorizontalIcon /> Filters
        {active > 0 && (
          <span className="ml-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 text-xs font-medium text-background tabular-nums">{active}</span>
        )}
      </SheetTrigger>
      <SheetContent side={wide ? "right" : "bottom"} showCloseButton={false} className={cn("gap-0 p-0", !wide && "data-[side=bottom]:rounded-t-2xl")}>
        <SheetTitle className="sr-only">Filter responses</SheetTitle>
        <SheetDescription className="sr-only">Narrow the table by date, device or answers</SheetDescription>
        {!wide && <div aria-hidden="true" className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-border" />}

        <div className="flex items-center justify-between px-4 pt-3 pb-1 lg:pt-5">
          <h2 className="font-display text-lg font-medium tracking-tight">Filters</h2>
          {active > 0 && (
            <Button variant="ghost" size="sm" onClick={() => onChange(emptyFilter)}>
              Reset
            </Button>
          )}
        </div>

        <div className="grid max-h-[65svh] content-start gap-4 overflow-y-auto px-4 py-3 lg:max-h-none lg:flex-1">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Submitted">
              <select aria-label="Submitted" className={selectClass} value={filter.dateRange ?? ""} onChange={(e) => onChange({ ...filter, dateRange: (e.target.value || null) as ResponseFilter["dateRange"] })}>
                <option value="">Any time</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
            </Field>
            <Field label="Device">
              <select aria-label="Device" className={selectClass} value={filter.device ?? ""} onChange={(e) => onChange({ ...filter, device: (e.target.value || null) as ResponseFilter["device"] })}>
                <option value="">Any device</option>
                <option value="phone">Phone</option>
                <option value="tablet">Tablet</option>
                <option value="desktop">Desktop</option>
              </select>
            </Field>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">Answers</p>
              {filter.conditions.length > 1 && (
                <div role="radiogroup" aria-label="Match" className="grid grid-cols-2 rounded-lg bg-muted p-0.5 text-xs font-medium">
                  {(["all", "any"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={filter.match === m}
                      onClick={() => onChange({ ...filter, match: m })}
                      className={cn("h-7 rounded-md px-2.5 outline-none focus-visible:outline-2 focus-visible:outline-ring", filter.match === m ? "bg-background shadow-sm" : "text-muted-foreground")}
                    >
                      {m === "all" ? "Match all" : "Match any"}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {filter.conditions.length > 0 && (
              <ul className="grid gap-2">
                {filter.conditions.map((c, i) => (
                  <ConditionRow
                    key={i}
                    columns={columns}
                    condition={c}
                    onChange={(next) => onChange({ ...filter, conditions: filter.conditions.map((x, j) => (j === i ? next : x)) })}
                    onRemove={() => onChange({ ...filter, conditions: filter.conditions.filter((_, j) => j !== i) })}
                  />
                ))}
              </ul>
            )}
            <Button type="button" variant="outline" className="justify-self-start" onClick={addCondition} disabled={columns.length === 0}>
              <PlusIcon /> Add a filter
            </Button>
          </div>
        </div>

        <SheetFooter className="border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <SheetClose render={<Button size="lg" className="w-full" />}>
            Show {shown} {shown === 1 ? "response" : "responses"}
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
