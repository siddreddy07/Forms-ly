"use client"

import * as React from "react"
import { MousePointerClickIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react"

import { blockIcons } from "@/components/builder/block-icons"
import { useBuilder } from "@/components/builder/builder-context"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { blockRegistry, createOption, supportsWidth, type Block, type BlockType, type Validation } from "@/lib/schema"
import { cn } from "@/lib/utils"

const placeholderTypes: BlockType[] = ["short_text", "long_text", "email", "phone", "number", "url", "dropdown"]
const lengthTypes: BlockType[] = ["short_text", "long_text"]
const choiceTypes: BlockType[] = ["single_choice", "multiple_choice", "dropdown"]

const widths = [
  { label: "Full", span: 12 },
  { label: "2/3", span: 8 },
  { label: "1/2", span: 6 },
  { label: "1/3", span: 4 },
]

const inputClass = "h-9 rounded-lg text-sm"

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}

function NumberField({
  id,
  value,
  onChange,
  min,
  max,
  placeholder,
}: {
  id: string
  value: number | undefined
  onChange: (n: number | undefined) => void
  min?: number
  max?: number
  placeholder?: string
}) {
  return (
    <Input
      id={id}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
      className={inputClass}
    />
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 pt-1">
      <h3 className="text-xs font-semibold tracking-wide text-foreground uppercase">{title}</h3>
      {children}
    </section>
  )
}

function PropertiesPanel({ onClose, onDelete, compact = false }: { onClose?: () => void; onDelete?: () => void; compact?: boolean }) {
  const [tab, setTab] = React.useState("content")
  const block = useBuilder((s) => s.doc.steps.flatMap((st) => st.blocks).find((b) => b.id === s.selectedId))
  const updateBlock = useBuilder((s) => s.updateBlock)

  if (!block) {
    return (
      <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 p-6 text-center">
        <MousePointerClickIcon className="size-5 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Select a block to edit it.</p>
      </div>
    )
  }

  const def = blockRegistry[block.type]
  const Icon = blockIcons[block.type]
  const patch = (p: Partial<Block>) => updateBlock(block.id, p)
  const setValidation = (key: keyof Validation, value: number | undefined) => {
    const next = { ...block.validation, [key]: value }
    if (value === undefined) delete next[key]
    patch({ validation: next })
  }
  const fid = (name: string) => `prop-${block.id}-${name}`

  const hasDetails = choiceTypes.includes(block.type) || lengthTypes.includes(block.type) || ["number", "file_upload", "rating", "scale"].includes(block.type)
  const hasWidth = supportsWidth(block.type)

  const content = (
    <>
      {/* Question text */}
      {def.collectsAnswer && (
        <>
          <Field label="Label" htmlFor={fid("label")}>
            <Input id={fid("label")} value={block.label} onChange={(e) => patch({ label: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Help text" htmlFor={fid("help")}>
            <Input
              id={fid("help")}
              value={block.help ?? ""}
              onChange={(e) => patch({ help: e.target.value || undefined })}
              placeholder="Shown under the label"
              className={inputClass}
            />
          </Field>
          {placeholderTypes.includes(block.type) && (
            <Field label="Placeholder" htmlFor={fid("ph")}>
              <Input
                id={fid("ph")}
                value={block.placeholder ?? ""}
                onChange={(e) => patch({ placeholder: e.target.value || undefined })}
                className={inputClass}
              />
            </Field>
          )}
          <div className="flex items-center justify-between gap-3">
            <label htmlFor={fid("req")} className="text-sm">
              Required
            </label>
            <Switch id={fid("req")} checked={block.required} onCheckedChange={(v) => patch({ required: v })} />
          </div>
        </>
      )}

      {/* Layout block content */}
      {block.type === "heading" && (
        <Field label="Text" htmlFor={fid("content")}>
          <Input id={fid("content")} value={block.content ?? ""} onChange={(e) => patch({ content: e.target.value })} className={inputClass} />
        </Field>
      )}
      {block.type === "paragraph" && (
        <Field label="Text" htmlFor={fid("content")}>
          <Textarea id={fid("content")} value={block.content ?? ""} onChange={(e) => patch({ content: e.target.value })} rows={4} className="rounded-lg text-sm" />
        </Field>
      )}
      {block.type === "image" && (
        <>
          <Field label="Image address" htmlFor={fid("content")}>
            <Input id={fid("content")} type="url" value={block.content ?? ""} onChange={(e) => patch({ content: e.target.value })} placeholder="https://" className={inputClass} />
          </Field>
          <Field label="Description for screen readers" htmlFor={fid("alt")}>
            <Input id={fid("alt")} value={block.alt ?? ""} onChange={(e) => patch({ alt: e.target.value })} className={inputClass} />
          </Field>
        </>
      )}

    </>
  )
  const details = (
    <>
      {/* Options */}
      {choiceTypes.includes(block.type) && (
        <Section title="Options">
          <ul className="grid gap-1.5">
            {(block.options ?? []).map((o, i, all) => (
              <li key={o.id} className="flex items-center gap-1.5">
                <Input
                  aria-label={`Option ${i + 1}`}
                  value={o.label}
                  onChange={(e) =>
                    patch({ options: all.map((x) => (x.id === o.id ? { ...x, label: e.target.value } : x)) })
                  }
                  className={inputClass}
                />
                <button
                  type="button"
                  aria-label={`Remove option ${i + 1}`}
                  disabled={all.length <= 1}
                  onClick={() => patch({ options: all.filter((x) => x.id !== o.id) })}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40"
                >
                  <XIcon className="size-4" />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => patch({ options: [...(block.options ?? []), createOption(`Option ${(block.options?.length ?? 0) + 1}`)] })}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-dashed text-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <PlusIcon className="size-4" /> Add option
          </button>
        </Section>
      )}

      {/* Validation */}
      {lengthTypes.includes(block.type) && (
        <Section title="Length">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Min characters" htmlFor={fid("minl")}>
              <NumberField id={fid("minl")} min={0} value={block.validation?.minLength} onChange={(n) => setValidation("minLength", n)} />
            </Field>
            <Field label="Max characters" htmlFor={fid("maxl")}>
              <NumberField id={fid("maxl")} min={1} value={block.validation?.maxLength} onChange={(n) => setValidation("maxLength", n)} />
            </Field>
          </div>
        </Section>
      )}
      {block.type === "number" && (
        <Section title="Range">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Minimum" htmlFor={fid("min")}>
              <NumberField id={fid("min")} value={block.validation?.min} onChange={(n) => setValidation("min", n)} />
            </Field>
            <Field label="Maximum" htmlFor={fid("max")}>
              <NumberField id={fid("max")} value={block.validation?.max} onChange={(n) => setValidation("max", n)} />
            </Field>
          </div>
        </Section>
      )}
      {block.type === "file_upload" && (
        <Section title="Files">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Max files" htmlFor={fid("mf")}>
              <NumberField id={fid("mf")} min={1} max={10} value={block.validation?.maxFiles} onChange={(n) => setValidation("maxFiles", n)} />
            </Field>
            <Field label="Max size (MB)" htmlFor={fid("ms")}>
              <NumberField id={fid("ms")} min={1} value={block.validation?.maxFileSizeMb} onChange={(n) => setValidation("maxFileSizeMb", n)} />
            </Field>
          </div>
        </Section>
      )}
      {(block.type === "rating" || block.type === "scale") && (
        <Section title="Scale">
          <div className="grid grid-cols-2 gap-2">
            {block.type === "scale" && (
              <Field label="From" htmlFor={fid("from")}>
                <NumberField
                  id={fid("from")}
                  min={0}
                  max={1}
                  value={block.scale?.min}
                  onChange={(n) => patch({ scale: { min: n ?? 0, max: block.scale?.max ?? 10, minLabel: block.scale?.minLabel, maxLabel: block.scale?.maxLabel } })}
                />
              </Field>
            )}
            <Field label={block.type === "scale" ? "To" : "Stars"} htmlFor={fid("to")}>
              <NumberField
                id={fid("to")}
                min={3}
                max={10}
                value={block.scale?.max}
                onChange={(n) =>
                  patch({ scale: { min: block.scale?.min ?? 1, max: Math.min(Math.max(n ?? 5, 3), 10), minLabel: block.scale?.minLabel, maxLabel: block.scale?.maxLabel } })
                }
              />
            </Field>
          </div>
          {block.type === "scale" && (
            <div className="grid grid-cols-2 gap-2">
              <Field label="Low label" htmlFor={fid("lo")}>
                <Input
                  id={fid("lo")}
                  value={block.scale?.minLabel ?? ""}
                  onChange={(e) => patch({ scale: { min: block.scale?.min ?? 0, max: block.scale?.max ?? 10, maxLabel: block.scale?.maxLabel, minLabel: e.target.value || undefined } })}
                  className={inputClass}
                />
              </Field>
              <Field label="High label" htmlFor={fid("hi")}>
                <Input
                  id={fid("hi")}
                  value={block.scale?.maxLabel ?? ""}
                  onChange={(e) => patch({ scale: { min: block.scale?.min ?? 0, max: block.scale?.max ?? 10, minLabel: block.scale?.minLabel, maxLabel: e.target.value || undefined } })}
                  className={inputClass}
                />
              </Field>
            </div>
          )}
        </Section>
      )}

    </>
  )
  const widthNode = (
    <>
      {supportsWidth(block.type) && (
        <div className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Width</span>
          <div role="group" aria-label="Width" className="grid grid-cols-4 gap-1.5">
            {widths.map((w) => {
              const on = block.layout.colSpan === w.span
              return (
                <button
                  key={w.span}
                  type="button"
                  aria-pressed={on}
                  onClick={() => patch({ layout: { colSpan: w.span } })}
                  className={cn(
                    "h-9 rounded-lg border text-sm outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    on ? "border-foreground bg-foreground text-background" : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {w.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </>
  )

  if (!compact) {
    return (
      <div className="grid gap-4 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
              <h2 className="text-sm font-medium">{def.label}</h2>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{def.description}</p>
          </div>
        </div>
        {hasWidth && widthNode}
        {content}
        {details}
      </div>
    )
  }

  /* Phones and tablets: one short tabbed panel instead of a long scrolling form. */
  const tabs = [
    { id: "content", label: "Content", node: content },
    ...(hasDetails ? [{ id: "details", label: choiceTypes.includes(block.type) ? "Options" : "Limits", node: details }] : []),
    ...(hasWidth ? [{ id: "width", label: "Width", node: widthNode }] : []),
  ]
  const active = tabs.find((x) => x.id === tab) ?? tabs[0]
  const iconBtn = "inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 px-3 pt-2 pb-1">
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <h2 className="min-w-0 flex-1 truncate text-sm font-medium">{def.label}</h2>
        {onDelete && (
          <button type="button" onClick={onDelete} aria-label="Delete block" className={iconBtn}>
            <Trash2Icon className="size-4" />
          </button>
        )}
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Done editing" className={iconBtn}>
            <XIcon className="size-4" />
          </button>
        )}
      </div>
      {tabs.length > 1 && (
        <div role="tablist" aria-label="Edit sections" className="flex shrink-0 gap-1 border-b px-3 pb-2">
          {tabs.map((x) => (
            <button
              key={x.id}
              role="tab"
              type="button"
              aria-selected={active.id === x.id}
              onClick={() => setTab(x.id)}
              className={cn(
                "h-8 flex-1 rounded-lg text-sm outline-none transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                active.id === x.id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
              )}
            >
              {x.label}
            </button>
          ))}
        </div>
      )}
      <div role="tabpanel" className="grid min-h-0 flex-1 content-start gap-3 overflow-y-auto overscroll-contain p-3 pb-4 md:grid-cols-2 md:gap-x-4 [&>*]:min-w-0">
        {active.node}
      </div>
    </div>
  )
}

export { PropertiesPanel }
