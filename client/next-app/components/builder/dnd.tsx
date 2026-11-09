"use client"

import * as React from "react"
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  TouchSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { SeparatorHorizontalIcon } from "lucide-react"

import { blockIcons } from "@/components/builder/block-icons"
import { useBuilder } from "@/components/builder/builder-context"
import { blockRegistry, type BlockType, type FormDocument } from "@/lib/schema"

/* Where a block dragged from the library would land: next to `overId`, or at the end of a step. */
type DropHint = { overId: string; after: boolean } | null
const HintContext = React.createContext<DropHint>(null)
export const useDropHint = () => React.useContext(HintContext)

export const stepZoneId = (stepId: string) => `step:${stepId}`
const LIB = "lib:"
const BREAK = "lib:page_break"

/* Prefer a block under the pointer over the step it sits in. */
const collide: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  if (hits.length) {
    const blocks = hits.filter((h) => !String(h.id).startsWith("step:"))
    return blocks.length ? blocks : hits
  }
  return closestCenter(args)
}

function locate(doc: FormDocument, overId: string, after: boolean) {
  if (overId.startsWith("step:")) {
    const step = doc.steps.find((s) => stepZoneId(s.id) === overId)
    return step ? { stepId: step.id, index: step.blocks.length } : null
  }
  for (const step of doc.steps) {
    const i = step.blocks.findIndex((b) => b.id === overId)
    if (i >= 0) return { stepId: step.id, index: i + (after ? 1 : 0) }
  }
  return null
}

function BuilderDnd({ children }: { children: React.ReactNode }) {
  const doc = useBuilder((s) => s.doc)
  const insertBlock = useBuilder((s) => s.insertBlock)
  const insertPageBreak = useBuilder((s) => s.insertPageBreak)
  const reorderBlock = useBuilder((s) => s.reorderBlock)
  const [dragType, setDragType] = React.useState<BlockType | "page_break" | null>(null)
  const [hint, setHint] = React.useState<DropHint>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const isAfter = (e: DragMoveEvent | DragEndEvent) => {
    const a = e.active.rect.current.translated
    const o = e.over?.rect
    if (!a || !o) return false
    const dy = a.top + a.height / 2 - (o.top + o.height / 2)
    const dx = a.left + a.width / 2 - (o.left + o.width / 2)
    return Math.abs(dy) < o.height * 0.15 ? dx > 0 : dy > 0
  }

  function onStart(e: DragStartEvent) {
    const id = String(e.active.id)
    if (id.startsWith(LIB)) setDragType(id.slice(LIB.length) as BlockType | "page_break")
  }

  function onMove(e: DragMoveEvent) {
    if (!dragType) return
    const overId = e.over ? String(e.over.id) : null
    setHint(overId && !overId.startsWith("step:") ? { overId, after: isAfter(e) } : overId ? { overId, after: true } : null)
  }

  function onEnd(e: DragEndEvent) {
    const activeId = String(e.active.id)
    const overId = e.over ? String(e.over.id) : null
    const after = isAfter(e)
    setDragType(null)
    setHint(null)
    if (!overId) return
    if (activeId.startsWith(LIB)) {
      const at = locate(doc, overId, after)
      if (at) {
        if (activeId === BREAK) insertPageBreak(at.stepId, at.index)
        else insertBlock(activeId.slice(LIB.length) as BlockType, at.stepId, at.index)
      }
    } else if (activeId !== overId) {
      const from = doc.steps.find((s) => s.blocks.some((b) => b.id === activeId))
      const to = locate(doc, overId, false)
      if (from && to && from.id === to.stepId) {
        const target = overId.startsWith("step:") ? from.blocks[from.blocks.length - 1].id : overId
        reorderBlock(from.id, activeId, target)
      }
    }
  }

  function cancel() {
    setDragType(null)
    setHint(null)
  }

  const Icon = dragType === "page_break" ? SeparatorHorizontalIcon : dragType ? blockIcons[dragType] : null
  const dragLabel = dragType === "page_break" ? "Page break" : dragType ? blockRegistry[dragType].label : ""

  return (
    <DndContext id="builder-dnd" sensors={sensors} collisionDetection={collide} onDragStart={onStart} onDragMove={onMove} onDragEnd={onEnd} onDragCancel={cancel}>
      <HintContext.Provider value={hint}>{children}</HintContext.Provider>
      <DragOverlay dropAnimation={null}>
        {dragType && Icon ? (
          <div className="flex h-10 w-48 items-center gap-2.5 rounded-lg border bg-background px-2.5 text-sm shadow-lg">
            <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate">{dragLabel}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

export { BuilderDnd }
