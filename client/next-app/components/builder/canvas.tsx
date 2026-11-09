"use client"

import { PlusIcon } from "lucide-react"

import { useBuilder } from "@/components/builder/builder-context"
import { BlockField, spanClass } from "@/components/renderer/field"
import { blockRegistry } from "@/lib/schema"
import { cn } from "@/lib/utils"

/* Draws the form with the real renderer fields, made inert so a click selects the block. */
function Canvas() {
  const doc = useBuilder((s) => s.doc)
  const selectedId = useBuilder((s) => s.selectedId)
  const select = useBuilder((s) => s.select)
  const empty = doc.steps.every((s) => s.blocks.length === 0)

  if (empty) {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center py-16 text-center">
        <span className="inline-flex size-12 items-center justify-center rounded-xl border bg-card">
          <PlusIcon className="size-5 text-muted-foreground" aria-hidden="true" />
        </span>
        <h2 className="mt-4 font-display text-xl font-medium tracking-tight">Start with a block</h2>
        <p className="mt-1 text-sm text-muted-foreground">Pick a block to add it to your form.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-4" onClick={() => select(null)}>
      {doc.steps.map((step, i) => (
        <section key={step.id} aria-label={step.title ?? `Step ${i + 1}`} className="rounded-xl border bg-card p-4 sm:p-6">
          {doc.steps.length > 1 && (
            <p className="mb-4 text-xs font-medium text-muted-foreground">
              Step {i + 1}{step.title ? `: ${step.title}` : ""}
            </p>
          )}
          <div className="grid grid-cols-12 gap-x-3 gap-y-3">
            {step.blocks.map((block) => {
              const selected = block.id === selectedId
              return (
                <div key={block.id} className={spanClass(block)}>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-pressed={selected}
                    aria-label={`${blockRegistry[block.type].label}: ${block.label || block.content || "untitled"}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      select(block.id)
                    }}
                    onKeyDown={(e) => {
                      if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault()
                        select(block.id)
                      }
                    }}
                    className={cn(
                      "cursor-pointer rounded-lg border border-transparent p-2 outline-none transition-colors hover:border-border focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
                      selected && "border-foreground bg-muted/40 hover:border-foreground"
                    )}
                  >
                    <div inert className="pointer-events-none">
                      <BlockField block={block} value={undefined} onChange={() => {}} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

export { Canvas }