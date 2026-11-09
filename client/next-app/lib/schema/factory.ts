import { nanoid } from "nanoid"

import { blockRegistry } from "./registry"
import { SCHEMA_VERSION, type Block, type BlockType, type FormDocument, type Option, type Step } from "./types"

const id = (prefix: string) => `${prefix}_${nanoid(8)}`

/* Option ids are regenerated so two blocks never share them. */
export function createBlock(type: BlockType, overrides: Partial<Block> = {}): Block {
  const defaults = blockRegistry[type].defaults()
  return {
    id: id("blk"),
    type,
    label: "",
    required: false,
    layout: { colSpan: 12 },
    ...defaults,
    options: defaults.options?.map((o) => ({ ...o, id: id("opt") })),
    ...overrides,
  }
}

export function createStep(title?: string, blocks: Block[] = []): Step {
  return { id: id("step"), title, blocks }
}

export function createEmptyForm(): FormDocument {
  return { version: SCHEMA_VERSION, mode: "single", header: {}, steps: [createStep()] }
}

export function allBlocks(form: FormDocument): Block[] {
  return form.steps.flatMap((s) => s.blocks)
}

export function createOption(label: string): Option {
  return { id: id("opt"), label }
}
