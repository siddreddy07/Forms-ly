import { temporal } from "zundo"
import { createStore } from "zustand/vanilla"

import { createBlock, createOption, createStep, type Block, type FormHeader, type Step, type BlockType, type FormDocument } from "@/lib/schema"

const withMode = (doc: FormDocument): FormDocument => ({ ...doc, mode: doc.steps.length > 1 ? "steps" : "single" })

/* The form header card is selectable like a block but is not one. */
export const HEADER_ID = "form-header"

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
  duplicateBlock: (id: string) => void
  /* Adds the header at the top once; selects it if it is already there. */
  addHeader: () => void
  /* A page break splits a page in two. The form is multi-page when it has any break. */
  addPageBreak: () => void
  insertPageBreak: (stepId: string, index: number) => void
  removePageBreak: (stepId: string) => void
  /* Name, heading and description of a page. Typing is merged into one undo step. */
  updateStep: (id: string, patch: Partial<Pick<Step, "title" | "heading" | "description">>) => void
  updateHeader: (patch: Partial<FormHeader>) => void
  /* Adds a new block at an exact place, used by drag from the library. */
  insertBlock: (type: BlockType, stepId: string, index: number) => void
  /* Moves one place up or down, crossing into the neighbouring step at the edges. */
  moveBlock: (id: string, dir: -1 | 1) => void
  /* Drag and drop: reorder inside one step. */
  reorderBlock: (stepId: string, fromId: string, toId: string) => void
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
          if (selectedId === HEADER_ID) {
            stepIndex = 0
            at = 0
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

        insertBlock: (type, stepId, index) => {
          const { doc } = get()
          const block = createBlock(type)
          const steps = doc.steps.map((s) => {
            if (s.id !== stepId) return s
            const blocks = [...s.blocks]
            blocks.splice(Math.max(0, Math.min(index, blocks.length)), 0, block)
            return { ...s, blocks }
          })
          set({ doc: { ...doc, steps }, selectedId: block.id, activeStepId: stepId })
        },

        addPageBreak: () => {
          const { doc, selectedId, activeStepId } = get()
          let stepId = doc.steps[doc.steps.length - 1].id
          let index = doc.steps[doc.steps.length - 1].blocks.length
          const si = doc.steps.findIndex((s) => s.blocks.some((b) => b.id === selectedId))
          if (si >= 0) {
            stepId = doc.steps[si].id
            index = doc.steps[si].blocks.findIndex((b) => b.id === selectedId) + 1
          } else if (selectedId === HEADER_ID) {
            stepId = doc.steps[0].id
            index = 0
          } else if (doc.steps.some((s) => s.id === activeStepId)) {
            stepId = activeStepId
            index = doc.steps.find((s) => s.id === activeStepId)!.blocks.length
          }
          get().insertPageBreak(stepId, index)
        },

        insertPageBreak: (stepId, index) => {
          const { doc } = get()
          const at = doc.steps.findIndex((s) => s.id === stepId)
          if (at < 0) return
          const src = doc.steps[at]
          const cut = Math.max(0, Math.min(index, src.blocks.length))
          const next = createStep(`Step ${at + 2}`, src.blocks.slice(cut))
          const steps = [...doc.steps]
          /* The first break turns a single page into pages, so page 1 gets a name too. */
          steps.splice(at, 1, { ...src, title: src.title ?? `Step ${at + 1}`, blocks: src.blocks.slice(0, cut) }, next)
          set({ doc: withMode({ ...doc, steps }), activeStepId: next.id })
        },

        removePageBreak: (stepId) => {
          const { doc } = get()
          const i = doc.steps.findIndex((s) => s.id === stepId)
          if (i <= 0) return
          const steps = [...doc.steps]
          const [gone] = steps.splice(i, 1)
          steps[i - 1] = { ...steps[i - 1], blocks: [...steps[i - 1].blocks, ...gone.blocks] }
          set({ doc: withMode({ ...doc, steps }), activeStepId: steps[i - 1].id })
        },

        updateStep: (id, patch) => {
          const { doc } = get()
          editing = true
          set({ doc: { ...doc, steps: doc.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)) } })
          editing = false
        },

        addHeader: () => {
          const { doc } = get()
          if (!doc.header) set({ doc: { ...doc, header: {} }, selectedId: HEADER_ID })
          else set({ selectedId: HEADER_ID })
        },

        updateHeader: (patch) => {
          const { doc } = get()
          editing = true
          set({ doc: { ...doc, header: { ...doc.header, ...patch } } })
          editing = false
        },

        duplicateBlock: (id) => {
          const { doc } = get()
          let newId: string | null = null
          const steps = doc.steps.map((s) => {
            const i = s.blocks.findIndex((b) => b.id === id)
            if (i < 0) return s
            const src = s.blocks[i]
            const fresh = createBlock(src.type)
            const copy: Block = { ...src, id: fresh.id, options: src.options?.map((o) => createOption(o.label)) }
            newId = copy.id
            const blocks = [...s.blocks]
            blocks.splice(i + 1, 0, copy)
            return { ...s, blocks }
          })
          if (newId) set({ doc: { ...doc, steps }, selectedId: newId })
        },

        moveBlock: (id, dir) => {
          const { doc } = get()
          const si = doc.steps.findIndex((s) => s.blocks.some((b) => b.id === id))
          if (si < 0) return
          const steps = doc.steps.map((s) => ({ ...s, blocks: [...s.blocks] }))
          const bi = steps[si].blocks.findIndex((b) => b.id === id)
          const [block] = steps[si].blocks.splice(bi, 1)
          const to = bi + dir
          if (to >= 0 && to <= steps[si].blocks.length) {
            steps[si].blocks.splice(to, 0, block)
          } else if (dir < 0 && si > 0) {
            steps[si - 1].blocks.push(block)
          } else if (dir > 0 && si < steps.length - 1) {
            steps[si + 1].blocks.unshift(block)
          } else {
            return
          }
          set({ doc: { ...doc, steps } })
        },

        reorderBlock: (stepId, fromId, toId) => {
          const { doc } = get()
          const steps = doc.steps.map((s) => {
            if (s.id !== stepId) return s
            const from = s.blocks.findIndex((b) => b.id === fromId)
            const to = s.blocks.findIndex((b) => b.id === toId)
            if (from < 0 || to < 0 || from === to) return s
            const blocks = [...s.blocks]
            const [b] = blocks.splice(from, 1)
            blocks.splice(to, 0, b)
            return { ...s, blocks }
          })
          set({ doc: { ...doc, steps } })
        },

        deleteBlock: (id) => {
          const { doc } = get()
          if (id === HEADER_ID) {
            set({ doc: { ...doc, header: undefined }, selectedId: null })
            return
          }
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