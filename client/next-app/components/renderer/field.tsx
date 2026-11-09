"use client"

import * as React from "react"

import {
  CheckboxCards,
  Dropdown,
  FileInput,
  NumberScale,
  RadioCards,
} from "@/components/renderer/inputs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { supportsWidth, type AnswerValue, type Block, type FileAnswer } from "@/lib/schema"
import { cn } from "@/lib/utils"

const spans: Record<number, string> = {
  1: "sm:col-span-1", 2: "sm:col-span-2", 3: "sm:col-span-3", 4: "sm:col-span-4",
  5: "sm:col-span-5", 6: "sm:col-span-6", 7: "sm:col-span-7", 8: "sm:col-span-8",
  9: "sm:col-span-9", 10: "sm:col-span-10", 11: "sm:col-span-11", 12: "sm:col-span-12",
}

const flatSpans: Record<number, string> = {
  1: "col-span-1", 2: "col-span-2", 3: "col-span-3", 4: "col-span-4",
  5: "col-span-5", 6: "col-span-6", 7: "col-span-7", 8: "col-span-8",
  9: "col-span-9", 10: "col-span-10", 11: "col-span-11", 12: "col-span-12",
}

/* `always` applies the chosen width at every screen size (used by the builder canvas). */
export function spanClass(block: Block, always = false) {
  if (!supportsWidth(block.type)) return "col-span-12"
  if (always) return flatSpans[block.layout.colSpan] ?? "col-span-12"
  return cn("col-span-12", spans[block.layout.colSpan] ?? "sm:col-span-12")
}

const inputTypes: Partial<Record<Block["type"], { type: string; inputMode?: "email" | "tel" | "url" | "decimal"; autoComplete?: string }>> = {
  short_text: { type: "text" },
  email: { type: "email", inputMode: "email", autoComplete: "email" },
  phone: { type: "tel", inputMode: "tel", autoComplete: "tel" },
  url: { type: "url", inputMode: "url" },
  number: { type: "number", inputMode: "decimal" },
  date: { type: "date" },
  time: { type: "time" },
}

const groupTypes = new Set<Block["type"]>(["single_choice", "multiple_choice", "yes_no", "rating", "scale", "file_upload"])

export function BlockField({
  block,
  value,
  error,
  onChange,
}: {
  block: Block
  value: AnswerValue
  error?: string
  onChange: (value: AnswerValue) => void
}) {
  /* Layout blocks: content only. */
  if (block.type === "heading") {
    return <h2 className="font-display text-2xl font-medium tracking-tight">{block.content}</h2>
  }
  if (block.type === "paragraph") {
    return <p className="text-muted-foreground">{block.content}</p>
  }
  if (block.type === "divider") {
    return <hr className="my-1 border-border" />
  }
  if (block.type === "image") {
    /* eslint-disable-next-line @next/next/no-img-element */
    return block.content ? <img src={block.content} alt={block.alt ?? ""} className="w-full rounded-lg" /> : null
  }

  const id = `f-${block.id}`
  const helpId = block.help ? `${id}-help` : undefined
  const errId = error ? `${id}-err` : undefined
  const describedBy = [helpId, errId].filter(Boolean).join(" ") || undefined
  const invalid = !!error
  const isGroup = groupTypes.has(block.type)

  const labelNode = (
    <>
      {block.label}
      {!block.required && <span className="ml-1.5 text-xs font-normal text-muted-foreground">optional</span>}
    </>
  )

  let control: React.ReactNode
  switch (block.type) {
    case "long_text":
      control = (
        <Textarea
          id={id}
          value={(value as string) ?? ""}
          placeholder={block.placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          aria-required={block.required || undefined}
          rows={4}
          className="min-h-24 rounded-lg"
        />
      )
      break
    case "dropdown":
      control = (
        <Dropdown block={block} value={value as string | undefined} onChange={onChange} describedBy={describedBy} invalid={invalid} />
      )
      break
    case "single_choice":
      control = <RadioCards block={block} options={block.options ?? []} value={value as string | undefined} onChange={onChange} />
      break
    case "yes_no":
      control = (
        <RadioCards
          block={block}
          options={[{ id: "true", label: "Yes" }, { id: "false", label: "No" }]}
          value={value as boolean | undefined}
          onChange={(v) => onChange(v === "true")}
          columns={2}
        />
      )
      break
    case "multiple_choice":
      control = <CheckboxCards block={block} value={(value as string[]) ?? []} onChange={onChange} />
      break
    case "rating":
      control = <NumberScale block={block} value={value as number | undefined} onChange={onChange} stars />
      break
    case "scale":
      control = <NumberScale block={block} value={value as number | undefined} onChange={onChange} />
      break
    case "file_upload":
      control = (
        <FileInput block={block} value={(value as FileAnswer[]) ?? []} onChange={onChange} describedBy={describedBy} invalid={invalid} />
      )
      break
    default: {
      const cfg = inputTypes[block.type] ?? { type: "text" }
      control = (
        <Input
          id={id}
          type={cfg.type}
          inputMode={cfg.inputMode}
          autoComplete={cfg.autoComplete}
          value={(value as string | number | undefined) ?? ""}
          placeholder={block.placeholder}
          onChange={(e) =>
            onChange(block.type === "number" ? (e.target.value === "" ? undefined : Number(e.target.value)) : e.target.value)
          }
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          aria-required={block.required || undefined}
          className="h-11 rounded-lg"
        />
      )
    }
  }

  const head = (
    <>
      {block.help && (
        <p id={helpId} className="mb-2 text-sm text-muted-foreground">
          {block.help}
        </p>
      )}
    </>
  )
  const foot = error && (
    <p id={errId} role="alert" className="mt-1.5 text-sm text-destructive">
      {error}
    </p>
  )

  return isGroup ? (
    <fieldset data-field={block.id} aria-describedby={describedBy} aria-invalid={invalid || undefined}>
      <legend className="mb-1.5 text-sm font-medium">{labelNode}</legend>
      {head}
      {control}
      {foot}
    </fieldset>
  ) : (
    <div data-field={block.id}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {labelNode}
      </label>
      {head}
      {control}
      {foot}
    </div>
  )
}