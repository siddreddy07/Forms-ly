"use client"

import * as React from "react"
import { nanoid } from "nanoid"
import { PlusIcon, XIcon } from "lucide-react"
import { Trash2 } from "@/components/animate-ui/icons/trash-2"

import { useBuilder } from "@/components/builder/builder-context"
import { Input } from "@/components/ui/input"
import { blockRegistry, isAnswerBlock, type Block, type BlockType, type LeafCondition, type Rule } from "@/lib/schema"
import { cn } from "@/lib/utils"

type Op = LeafCondition["operator"]
type Kind = "text" | "number" | "choice" | "multi" | "yesno" | "date" | "time" | "file"

const kinds: Partial<Record<BlockType, Kind>> = {
  short_text: "text",
  long_text: "text",
  email: "text",
  phone: "text",
  url: "text",
  number: "number",
  rating: "number",
  scale: "number",
  single_choice: "choice",
  dropdown: "choice",
  multiple_choice: "multi",
  yes_no: "yesno",
  date: "date",
  time: "time",
  file_upload: "file",
}

const empty: { op: Op; label: string }[] = [
  { op: "is_empty", label: "is left empty" },
  { op: "is_not_empty", label: "is filled in" },
]

const operators: Record<Kind, { op: Op; label: string }[]> = {
  text: [{ op: "equals", label: "is" }, { op: "not_equals", label: "is not" }, { op: "contains", label: "contains" }, ...empty],
  number: [{ op: "equals", label: "is" }, { op: "greater_than", label: "is more than" }, { op: "less_than", label: "is less than" }, ...empty],
  choice: [{ op: "equals", label: "is" }, { op: "not_equals", label: "is not" }, ...empty],
  multi: [{ op: "contains", label: "includes" }, ...empty],
  yesno: [{ op: "equals", label: "is" }, ...empty],
  date: [{ op: "equals", label: "is" }, ...empty],
  time: [{ op: "equals", label: "is" }, ...empty],
  file: [{ op: "is_not_empty", label: "has a file" }, { op: "is_empty", label: "has no file" }],
}

const selectClass =
  "h-9 w-full min-w-0 rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:outline-2 focus-visible:outline-ring"
const iconBtn =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"

const kindOf = (b: Block): Kind => kinds[b.type] ?? "text"
const questionName = (b: Block) => b.label || blockRegistry[b.type].label

function defaultCondition(source: Block): LeafCondition {
  const kind = kindOf(source)
  const op = operators[kind][0].op
  let value: LeafCondition["value"]
  if (kind === "choice" || kind === "multi") value = source.options?.[0]?.id ?? ""
  else if (kind === "yesno") value = true
  else if (op !== "is_empty" && op !== "is_not_empty") value = kind === "number" ? 0 : ""
  return { blockId: source.id, operator: op, value }
}

function ValueField({ source, cond, onChange }: { source: Block; cond: LeafCondition; onChange: (v: LeafCondition["value"]) => void }) {
  const kind = kindOf(source)
  if (cond.operator === "is_empty" || cond.operator === "is_not_empty") return null
  if (kind === "choice" || kind === "multi") {
    return (
      <select aria-label="Answer" value={String(cond.value ?? "")} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        {(source.options ?? []).map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    )
  }
  if (kind === "yesno") {
    return (
      <select aria-label="Answer" value={String(cond.value ?? true)} onChange={(e) => onChange(e.target.value === "true")} className={selectClass}>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    )
  }
  return (
    <Input
      aria-label="Answer"
      type={kind === "number" ? "number" : kind === "date" ? "date" : kind === "time" ? "time" : "text"}
      value={cond.value === undefined ? "" : String(cond.value)}
      onChange={(e) => onChange(kind === "number" ? (e.target.value === "" ? undefined : Number(e.target.value)) : e.target.value)}
      placeholder={kind === "text" ? "Type an answer" : undefined}
      className="h-9 rounded-lg text-sm"
    />
  )
}

/* "Show this field only when ..." in plain sentences. One rule per field. */
export function LogicEditor({ block }: { block: Block }) {
  /* Select the stable document, then derive the list: a selector that builds a new array every time loops forever. */
  const doc = useBuilder((s) => s.doc)
  const allBlocks = React.useMemo(() => doc.steps.flatMap((st) => st.blocks), [doc])
  const updateBlock = useBuilder((s) => s.updateBlock)
  const rule = block.logic?.[0]

  const index = allBlocks.findIndex((b) => b.id === block.id)
  const referenced = new Set(rule?.when.conditions.map((c) => c.blockId))
  const sources = allBlocks.filter((b, i) => isAnswerBlock(b.type) && b.id !== block.id && (i < index || referenced.has(b.id)))

  const setRule = (next: Rule | undefined) => updateBlock(block.id, { logic: next ? [next] : undefined })
  const setConditions = (conditions: LeafCondition[]) => rule && setRule(conditions.length ? { ...rule, when: { ...rule.when, conditions } } : undefined)

  if (sources.length === 0) {
    return <p className="text-sm text-muted-foreground">Add a question above this field first. You can then show or hide this field based on the answer.</p>
  }

  if (!rule) {
    return (
      <button
        type="button"
        onClick={() => setRule({ id: nanoid(8), action: "show", when: { match: "all", conditions: [defaultCondition(sources[0])] } })}
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-dashed text-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        <PlusIcon className="size-4" /> Show or hide based on an answer
      </button>
    )
  }

  const { conditions } = rule.when
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <select
          aria-label="Show or hide"
          value={rule.action}
          onChange={(e) => setRule({ ...rule, action: e.target.value as Rule["action"] })}
          className={cn(selectClass, "w-auto")}
        >
          <option value="show">Show</option>
          <option value="hide">Hide</option>
        </select>
        <span>this field when</span>
        {conditions.length > 1 && (
          <select
            aria-label="All or any"
            value={rule.when.match}
            onChange={(e) => setRule({ ...rule, when: { ...rule.when, match: e.target.value as "all" | "any" } })}
            className={cn(selectClass, "w-auto")}
          >
            <option value="all">all of these</option>
            <option value="any">any of these</option>
          </select>
        )}
      </div>

      <ul className="grid gap-2">
        {conditions.map((c, i) => {
          const source = allBlocks.find((b) => b.id === c.blockId)
          if (!source) return null
          const ops = operators[kindOf(source)]
          const patch = (p: Partial<LeafCondition>) => setConditions(conditions.map((x, j) => (j === i ? { ...x, ...p } : x)))
          return (
            <li key={i} className="grid gap-1.5 rounded-lg border bg-muted/30 p-2">
              <div className="flex items-center gap-1.5">
                <select
                  aria-label="Question"
                  value={c.blockId}
                  onChange={(e) => {
                    const next = allBlocks.find((b) => b.id === e.target.value)
                    if (next) setConditions(conditions.map((x, j) => (j === i ? defaultCondition(next) : x)))
                  }}
                  className={selectClass}
                >
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {questionName(s)}
                    </option>
                  ))}
                </select>
                <button type="button" aria-label="Remove condition" onClick={() => setConditions(conditions.filter((_, j) => j !== i))} className={iconBtn}>
                  <XIcon className="size-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <select
                  aria-label="Comparison"
                  value={c.operator}
                  onChange={(e) => {
                    const op = e.target.value as Op
                    const needs = op !== "is_empty" && op !== "is_not_empty"
                    patch({ operator: op, value: needs ? (c.value ?? defaultCondition(source).value) : undefined })
                  }}
                  className={selectClass}
                >
                  {ops.map((o) => (
                    <option key={o.op} value={o.op}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <ValueField source={source} cond={c} onChange={(value) => patch({ value })} />
              </div>
            </li>
          )
        })}
      </ul>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setConditions([...conditions, defaultCondition(sources[0])])}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <PlusIcon className="size-4" /> Add another
        </button>
        <button
          type="button"
          onClick={() => setRule(undefined)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Trash2 animateOnHover size={16} className="size-4" /> Remove rule
        </button>
      </div>
    </div>
  )
}
