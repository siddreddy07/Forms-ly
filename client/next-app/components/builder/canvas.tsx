"use client"

import * as React from "react"
import { useDroppable } from "@dnd-kit/core"
import {
  rectSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { EyeOffIcon, GripVerticalIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { useBuilder } from "@/components/builder/builder-context"
import { stepZoneId, useDropHint } from "@/components/builder/dnd"
import { Hint } from "@/components/builder/hint"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormHeaderView } from "@/components/renderer/form-header"
import { HEADER_ID } from "@/lib/builder/store"
import { BlockField, spanClass } from "@/components/renderer/field"
import { blockRegistry, type Block } from "@/lib/schema"
import { cn } from "@/lib/utils"

function SortableBlock({
  block,
  selected,
  onSelect,
}: {
  block: Block
  selected: boolean
  onSelect: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id })
  const hint = useDropHint()
  const line =
    hint && hint.overId === block.id ? (hint.after ? "bottom" : "top") : null
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        spanClass(block, true),
        "relative",
        isDragging && "z-10 opacity-70"
      )}
    >
      {line && (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-0 z-20 h-0.5 rounded-full bg-foreground",
            line === "top" ? "-top-1.5" : "-bottom-1.5"
          )}
        />
      )}
      <div
        role="button"
        data-block-id={block.id}
        tabIndex={0}
        aria-pressed={selected}
        aria-label={`${blockRegistry[block.type].label}: ${block.label || block.content || "untitled"}`}
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
        onKeyDown={(e) => {
          if (
            e.target === e.currentTarget &&
            (e.key === "Enter" || e.key === " ")
          ) {
            e.preventDefault()
            onSelect()
          }
        }}
        className={cn(
          "cursor-pointer scroll-mt-32 rounded-lg border border-transparent p-2 pl-8 transition-colors outline-none hover:border-border focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
          selected && "border-foreground bg-muted/40 hover:border-foreground"
        )}
      >
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          onClick={(e) => e.stopPropagation()}
          className="absolute top-1/2 left-0.5 inline-flex size-9 -translate-y-1/2 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring active:cursor-grabbing"
        >
          <GripVerticalIcon className="size-4" />
        </button>
        {block.logic?.length ? (
          <span className="absolute top-1 right-1 z-10 inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
            <EyeOffIcon className="size-3" aria-hidden="true" />
            Conditional
          </span>
        ) : null}
        <div inert className="pointer-events-none">
          <BlockField
            block={block}
            value={undefined}
            onChange={() => {}}
            editing
          />
        </div>
      </div>
    </div>
  )
}

const stepBtn =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40"

function StepZone({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stepZoneId(id) })
  const hint = useDropHint()
  const ring = isOver && hint?.overId === stepZoneId(id)
  return (
    <section
      ref={setNodeRef}
      aria-label={label}
      className={cn(
        "rounded-xl border bg-card p-4 transition-shadow sm:p-6",
        ring && "ring-2 ring-foreground/60"
      )}
    >
      {children}
    </section>
  )
}

/* Draws the form with the real renderer fields, made inert so a click selects the block. */
function Canvas() {
  const doc = useBuilder((s) => s.doc)
  const selectedId = useBuilder((s) => s.selectedId)
  const headerSelected = selectedId === HEADER_ID
  const updateStep = useBuilder((s) => s.updateStep)
  const removePageBreak = useBuilder((s) => s.removePageBreak)
  const paged = doc.steps.length > 1
  const select = useBuilder((s) => s.select)

  /* On phones the editing panel covers the lower half, so bring the selected block to the top. */
  React.useEffect(() => {
    if (!selectedId || window.matchMedia("(min-width: 1024px)").matches) return
    const el = document.querySelector<HTMLElement>(
      `[data-block-id="${selectedId}"]`
    )
    requestAnimationFrame(() =>
      el?.scrollIntoView({ block: "start", behavior: "smooth" })
    )
  }, [selectedId])

  return (
    <div
      className="mx-auto w-full max-w-xl space-y-4"
      onClick={() => select(null)}
    >
      {doc.header && (
        <section
          role="button"
          tabIndex={0}
          data-block-id={HEADER_ID}
          aria-pressed={headerSelected}
          aria-label="Form header: banner, title and description"
          onClick={(e) => {
            e.stopPropagation()
            select(HEADER_ID)
          }}
          onKeyDown={(e) => {
            if (
              e.target === e.currentTarget &&
              (e.key === "Enter" || e.key === " ")
            ) {
              e.preventDefault()
              select(HEADER_ID)
            }
          }}
          className={cn(
            "cursor-pointer scroll-mt-32 rounded-xl border bg-card p-4 pb-1 transition-colors outline-none hover:border-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring sm:p-6 sm:pb-2",
            headerSelected && "border-foreground hover:border-foreground"
          )}
        >
          <div inert className="pointer-events-none">
            <FormHeaderView header={doc.header} editing />
          </div>
        </section>
      )}
      {doc.steps.map((step, i) => (
        <React.Fragment key={step.id}>
          {i > 0 && (
            <div
              aria-hidden="true"
              className="flex items-center gap-3 text-xs text-muted-foreground"
            >
              <span className="flex-1 border-t border-dashed" />
              Page break
              <span className="flex-1 border-t border-dashed" />
            </div>
          )}
          <StepZone id={step.id} label={step.title ?? `Step ${i + 1}`}>
            {paged && (
              <div
                className="mb-4 grid gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-1.5">
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                    {i + 1}/{doc.steps.length}
                  </span>
                  <Input
                    aria-label={`Name of step ${i + 1}`}
                    value={step.title ?? ""}
                    onChange={(e) =>
                      updateStep(step.id, {
                        title: e.target.value || undefined,
                      })
                    }
                    placeholder="Step name"
                    className="h-8 min-w-0 flex-1 rounded-lg text-sm"
                  />
                  {i > 0 && (
                    <Hint
                      title="Remove page break"
                      description="Merges this page into the one above."
                    >
                      <button
                        type="button"
                        aria-label="Remove page break"
                        onClick={() => removePageBreak(step.id)}
                        className={stepBtn}
                      >
                        <Trash2Icon className="size-4" />
                      </button>
                    </Hint>
                  )}
                </div>
                <Input
                  aria-label={`Heading of step ${i + 1}`}
                  value={step.heading ?? ""}
                  onChange={(e) =>
                    updateStep(step.id, {
                      heading: e.target.value || undefined,
                    })
                  }
                  placeholder="Heading"
                  className="h-10 rounded-lg font-display text-lg"
                />
                <Textarea
                  aria-label={`Paragraph of step ${i + 1}`}
                  value={step.description ?? ""}
                  onChange={(e) =>
                    updateStep(step.id, {
                      description: e.target.value || undefined,
                    })
                  }
                  placeholder="Paragraph: a short note about this page"
                  rows={2}
                  className="min-h-0 rounded-lg text-sm"
                />
              </div>
            )}
            {step.blocks.length === 0 && (
              <div className="flex flex-col items-center py-12 text-center">
                <span className="inline-flex size-12 items-center justify-center rounded-xl border bg-background">
                  <PlusIcon
                    className="size-5 text-muted-foreground"
                    aria-hidden="true"
                  />
                </span>
                <h2 className="mt-4 font-display text-xl font-medium tracking-tight">
                  Start with a block
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pick a block, or drag one here.
                </p>
              </div>
            )}
            <SortableContext
              items={step.blocks.map((b) => b.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-12 gap-x-3 gap-y-3">
                {step.blocks.map((block) => (
                  <SortableBlock
                    key={block.id}
                    block={block}
                    selected={block.id === selectedId}
                    onSelect={() => select(block.id)}
                  />
                ))}
              </div>
            </SortableContext>
            {step.blocks.length > 0 && (
              <div aria-hidden="true" className="mt-3 h-8" />
            )}
          </StepZone>
        </React.Fragment>
      ))}
    </div>
  )
}

export { Canvas }
