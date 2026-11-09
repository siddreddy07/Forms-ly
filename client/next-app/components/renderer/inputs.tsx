"use client"

import * as React from "react"
import { CheckIcon, StarIcon, UploadIcon, XIcon } from "lucide-react"

import type { Block, FileAnswer } from "@/lib/schema"
import { cn } from "@/lib/utils"

type Common = {
  block: Block
  describedBy?: string
  invalid: boolean
}

const choiceCard =
  "relative flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border bg-background px-3.5 py-2.5 text-sm transition-colors has-checked:border-foreground has-checked:bg-muted has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring hover:bg-muted"

/* Single choice and yes/no: native radios, so arrow keys work for free. */
export function RadioCards({
  block,
  options,
  value,
  onChange,
  columns,
}: {
  block: Block
  options: { id: string; label: string }[]
  value: string | boolean | undefined
  onChange: (id: string) => void
  columns?: number
}) {
  return (
    <div className={cn("grid gap-2", columns === 2 && "grid-cols-2")}>
      {options.map((o) => (
        <label key={o.id} className={choiceCard}>
          <input
            type="radio"
            name={block.id}
            value={o.id}
            checked={String(value) === o.id}
            onChange={() => onChange(o.id)}
            className="sr-only"
          />
          <span
            aria-hidden="true"
            className="inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-foreground/40 [label:has(:checked)_&]:border-foreground [label:has(:checked)_&]:bg-foreground"
          >
            <span className="size-1.5 rounded-full bg-background opacity-0 [label:has(:checked)_&]:opacity-100" />
          </span>
          {o.label}
        </label>
      ))}
    </div>
  )
}

export function CheckboxCards({
  block,
  value,
  onChange,
}: {
  block: Block
  value: string[]
  onChange: (next: string[]) => void
}) {
  return (
    <div className="grid gap-2">
      {(block.options ?? []).map((o) => {
        const checked = value.includes(o.id)
        return (
          <label key={o.id} className={choiceCard}>
            <input
              type="checkbox"
              name={block.id}
              value={o.id}
              checked={checked}
              onChange={() => onChange(checked ? value.filter((v) => v !== o.id) : [...value, o.id])}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className="inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-foreground/40 [label:has(:checked)_&]:border-foreground [label:has(:checked)_&]:bg-foreground"
            >
              <CheckIcon className="size-3 text-background opacity-0 [label:has(:checked)_&]:opacity-100" />
            </span>
            {o.label}
          </label>
        )
      })}
    </div>
  )
}

export function Dropdown({
  block,
  value,
  onChange,
  describedBy,
  invalid,
}: Common & { value: string | undefined; onChange: (v: string) => void }) {
  return (
    <select
      id={`f-${block.id}`}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      aria-required={block.required || undefined}
      className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:border-destructive"
    >
      <option value="">{block.placeholder ?? "Choose an option"}</option>
      {(block.options ?? []).map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

/* Rating (stars) and scale (numbers): radios again, so keyboard use is native. */
export function NumberScale({
  block,
  value,
  onChange,
  stars,
}: {
  block: Block
  value: number | undefined
  onChange: (n: number) => void
  stars?: boolean
}) {
  const min = block.scale?.min ?? 1
  const max = block.scale?.max ?? 5
  const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i)

  return (
    <div>
      <div className={cn("flex flex-wrap gap-1.5", stars && "gap-1")}>
        {steps.map((n) => {
          const filled = stars && value !== undefined && n <= value
          return (
            <label
              key={n}
              className={cn(
                "relative inline-flex cursor-pointer items-center justify-center rounded-lg transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring",
                stars
                  ? "size-10 hover:bg-muted"
                  : "h-11 min-w-11 flex-1 border bg-background text-sm hover:bg-muted has-checked:border-foreground has-checked:bg-foreground has-checked:text-background"
              )}
            >
              <input
                type="radio"
                name={block.id}
                value={n}
                checked={value === n}
                onChange={() => onChange(n)}
                className="sr-only"
              />
              {stars ? (
                <>
                  <StarIcon className={cn("size-6", filled ? "fill-foreground" : "text-muted-foreground/60")} aria-hidden="true" />
                  <span className="sr-only">{n} of {max}</span>
                </>
              ) : (
                n
              )}
            </label>
          )
        })}
      </div>
      {!stars && (block.scale?.minLabel || block.scale?.maxLabel) && (
        <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
          <span>{block.scale?.minLabel}</span>
          <span>{block.scale?.maxLabel}</span>
        </div>
      )}
    </div>
  )
}

export function FileInput({
  block,
  value,
  onChange,
  describedBy,
}: Common & { value: FileAnswer[]; onChange: (next: FileAnswer[]) => void }) {
  const [localError, setLocalError] = React.useState<string>()
  const maxFiles = block.validation?.maxFiles ?? 1
  const maxMb = block.validation?.maxFileSizeMb

  function add(files: FileList | null) {
    if (!files) return
    setLocalError(undefined)
    const accepted: FileAnswer[] = []
    for (const f of Array.from(files)) {
      if (maxMb && f.size > maxMb * 1024 * 1024) {
        setLocalError(`${f.name} is larger than ${maxMb} MB`)
        continue
      }
      /* Placeholder: real uploads go to storage and return a URL. */
      accepted.push({ name: f.name, size: f.size, url: URL.createObjectURL(f) })
    }
    onChange([...value, ...accepted].slice(0, maxFiles))
  }

  return (
    <div>
      {value.length < maxFiles && (
        <label className="flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed bg-background px-4 py-5 text-center text-sm text-muted-foreground transition-colors hover:bg-muted has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring">
          <UploadIcon className="size-5" aria-hidden="true" />
          <span>{maxFiles > 1 ? "Choose files" : "Choose a file"}</span>
          <input
            id={`f-${block.id}`}
            type="file"
            multiple={maxFiles > 1}
            aria-describedby={describedBy}
            onChange={(e) => {
              add(e.target.files)
              e.target.value = ""
            }}
            className="sr-only"
          />
        </label>
      )}
      {value.length > 0 && (
        <ul className="mt-2 grid gap-1.5">
          {value.map((f, i) => (
            <li key={f.url} className="flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
              <span className="min-w-0 truncate">{f.name}</span>
              <button
                type="button"
                aria-label={`Remove ${f.name}`}
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                <XIcon className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {localError && <p className="mt-1.5 text-sm text-destructive">{localError}</p>}
    </div>
  )
}