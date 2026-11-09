import { temporal } from "zundo"
import { createStore } from "zustand/vanilla"

import { createBlock, type Block, type BlockType, type FormDocument } from "@/lib/schema"

export type BuilderState = {
  doc: FormDocument
  selectedId: string | null
  activeStepId: string
}

export type BuilderActions = {
  select: (id: string | null) => void
  addBlock: (type: BlockType) => void
  deleteBlock: (id: string) => void
  /* Typing bursts are merged into a single undo step. */
  updateBlock: (id: string, patch: Partial<Block>) => void
}

export type BuilderStore = ReturnType<typeof createBuilderStore>

/* Only `doc` is tracked for undo and redo. Selection is view state. */
export function createBuilderStore(initial: FormDocument) {
  /* While `editing`, rapid changes are folded into one history entry. */
  let editing = false
  let burst = false
  let timer: ReturnType<typeof setTimeout> | null = null

  return createStore<BuilderState & BuilderActions>()(
    temporal(
      (set, get) => ({
        doc: initial,
        selectedId: null,
        activeStepId: initial.steps[0].id,

        select: (id) => set({ selectedId: id }),

        addBlock: (type) => {
          const { doc, selectedId, activeStepId } = get()
          const block = createBlock(type)

          /* Insert after the selected block, otherwise at the end of the active step. */
          let stepIndex = doc.steps.findIndex((s) => s.id === activeStepId)
          let at = -1
          const selStep = doc.steps.findIndex((s) => s.blocks.some((b) => b.id === selectedId))
          if (selStep >= 0) {
            stepIndex = selStep
            at = doc.steps[selStep].blocks.findIndex((b) => b.id === selectedId) + 1
          }
          if (stepIndex < 0) stepIndex = 0

          const steps = doc.steps.map((s, i) => {
            if (i !== stepIndex) return s
            const blocks: Block[] = [...s.blocks]
            blocks.splice(at < 0 ? blocks.length : at, 0, block)
            return { ...s, blocks }
          })
          set({ doc: { ...doc, steps }, selectedId: block.id, activeStepId: steps[stepIndex].id })
        },

        updateBlock: (id, patch) => {
          const { doc } = get()
          const steps = doc.steps.map((s) => ({
            ...s,
            blocks: s.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
          }))
          editing = true
          set({ doc: { ...doc, steps } })
          editing = false
        },

        deleteBlock: (id) => {
          const { doc } = get()
          const steps = doc.steps.map((s) => ({ ...s, blocks: s.blocks.filter((b) => b.id !== id) }))
          set({ doc: { ...doc, steps }, selectedId: null })
        },
      }),
      {
        limit: 100,
        handleSet: (handleSet) => (pastState, replace) => {
          if (!editing) {
            burst = false
            if (timer) clearTimeout(timer)
            handleSet(pastState, replace)
            return
          }
          if (!burst) {
            burst = true
            handleSet(pastState, replace)
          }
          if (timer) clearTimeout(timer)
          timer = setTimeout(() => {
            burst = false
          }, 700)
        },
        partialize: (state) => ({ doc: state.doc }),
        equality: (a, b) => a.doc === b.doc,
      }
    )
  )
}