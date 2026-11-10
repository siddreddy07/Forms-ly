"use client"

import * as React from "react"
import { ChevronDownIcon, PlusIcon, SlidersHorizontalIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { activeCount, emptyFilter, opsFor, type FilterCondition, type ResponseFilter } from "@/lib/responses/filter"
import type { Block } from "@/lib/schema"
import { cn } from "@/lib/utils"

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

type Option = { value: string; label: string }

/* A button that looks like a select, but opens a menu. Used for every choice in the drawer, so the rows stay compact
   and the same on a phone and a desktop. */
function SelectTrigger({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <DropdownMenuTrigger
      aria-label={label}
      className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border bg-background px-2.5 text-sm outline-none transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring aria-expanded:bg-muted"
    >
      <span className="truncate">{children}</span>
      <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
    </DropdownMenuTrigger>
  )
}

/* One choice out of a short list, shown as its current value. */
function MenuSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Option[]
  onChange: (value: string) => void
}) {
  const current = options.find((o) => o.value === value)
  return (
    <DropdownMenu>
      <SelectTrigger label={label}>{current?.label ?? label}</SelectTrigger>
      <DropdownMenuContent className="min-w-44">
        <DropdownMenuRadioGroup value={value} onValueChange={(next) => onChange(String(next))}>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value}>
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/* The input for a condition's value, which depends on the kind of question and how it is compared. */
function ValueEditor({ block, condition, onChange }: { block: Block; condition: FilterCondition; onChange: (values: FilterCondition["values"]) => void }) {
  const { op, values } = condition
  if (op === "empty" || op === "not_empty") return null

  if (op === "any_of") {
    const picked = (block.options ?? []).filter((o) => values.includes(o.id))
    return (
      <DropdownMenu>
        <SelectTrigger label="Values">{picked.length ? picked.map((o) => o.label || "Untitled option").join(", ") : "Choose options"}</SelectTrigger>
        <DropdownMenuContent className="max-h-64">
          {(block.options ?? []).map((o) => (
            <DropdownMenuCheckboxItem
              key={o.id}
              checked={values.includes(o.id)}
              closeOnClick={false}
              onCheckedChange={(on) => onChange(on ? [...values, o.id] : values.filter((v) => v !== o.id))}
            >
              {o.label || "Untitled option"}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  if (block.type === "yes_no") {
    return (
      <MenuSelect
        label="Value"
        value={values[0] === undefined ? "any" : String(values[0])}
        options={[
          { value: "any", label: "Choose…" },
          { value: "true", label: "Yes" },
          { value: "false", label: "No" },
        ]}
        onChange={(v) => onChange(v === "any" ? [] : [v === "true"])}
      />
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
            className="h-9"
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
      className="h-9"
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
  const hasValue = condition.op !== "empty" && condition.op !== "not_empty"

  return (
    <li className="grid gap-2 rounded-xl border bg-card p-2.5">
      <div className="flex items-center gap-1">
        <div className="min-w-0 flex-1">
          <MenuSelect
            label="Question"
            value={condition.questionId}
            options={columns.map((c) => ({ value: c.id, label: c.label || "Untitled question" }))}
            onChange={(id) => {
              const next = columns.find((c) => c.id === id)
              onChange({ questionId: id, op: next ? opsFor(next)[0].op : "contains", values: [] })
            }}
          />
        </div>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove this condition" onClick={onRemove}>
          <XIcon />
        </Button>
      </div>
      {block && (
        <div className="grid gap-2">
          <MenuSelect
            label="How to compare"
            value={condition.op}
            options={ops.map((o) => ({ value: o.op, label: o.label }))}
            onChange={(op) => onChange({ ...condition, op: op as FilterCondition["op"], values: [] })}
          />
          {hasValue && <ValueEditor block={block} condition={condition} onChange={(values) => onChange({ ...condition, values })} />}
        </div>
      )}
    </li>
  )
}

const dateOptions: Option[] = [
  { value: "any", label: "Any time" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
]

const deviceOptions: Option[] = [
  { value: "any", label: "Any device" },
  { value: "phone", label: "Phone" },
  { value: "tablet", label: "Tablet" },
  { value: "desktop", label: "Desktop" },
]

/* The filter button and its drawer. The filter itself lives in the page, so it survives closing the drawer.
   Every choice is a dropdown menu, so a condition is three short lines instead of a wall of selects. */
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
        render={<Button variant="outline" className={"text-sm md:text-lg relative"} />}
      >
        <SlidersHorizontalIcon /> Filters
        {active > 0 && (
          <span className="ml-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 text-xs font-medium text-background tabular-nums">{active}</span>
        )}
      </SheetTrigger>
      <SheetContent
        side={wide ? "right" : "bottom"}
        showCloseButton={false}
        className={cn("gap-0 p-0", !wide && "data-[side=bottom]:rounded-t-2xl", wide && "sm:max-w-md")}
      >
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
          <section className="grid gap-2">
            <p className="text-xs font-medium text-muted-foreground">When</p>
            <div className="grid grid-cols-2 gap-2">
              <MenuSelect
                label="Submitted"
                value={filter.dateRange ?? "any"}
                options={dateOptions}
                onChange={(v) => onChange({ ...filter, dateRange: (v === "any" ? null : v) as ResponseFilter["dateRange"] })}
              />
              <MenuSelect
                label="Device"
                value={filter.device ?? "any"}
                options={deviceOptions}
                onChange={(v) => onChange({ ...filter, device: (v === "any" ? null : v) as ResponseFilter["device"] })}
              />
            </div>
          </section>

          <Separator />

          <section className="grid gap-2">
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

            {filter.conditions.length > 0 ? (
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
            ) : (
              <p className="text-sm text-muted-foreground">No answer filters yet.</p>
            )}

            <Button type="button" variant="outline" className="w-full border-dashed" onClick={addCondition} disabled={columns.length === 0}>
              <PlusIcon /> Add a filter
            </Button>
          </section>
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
