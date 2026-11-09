import { isBlockVisible } from "./logic"
import { isAnswerBlock } from "./registry"
import type { Answers, Block, FormDocument, FormMode } from "./types"

export type Screen = { id: string; title?: string; heading?: string; description?: string; blocks: Block[] }

/* Splits a form into the screens a respondent walks through. Recomputed on every answer change. */
export function buildScreens(form: FormDocument, answers: Answers, mode: FormMode = form.mode): Screen[] {
  const visibleIn = (blocks: Block[]) => blocks.filter((b) => isBlockVisible(b, answers))

  if (mode === "single") {
    return [{ id: "all", blocks: visibleIn(form.steps.flatMap((s) => s.blocks)) }]
  }

  if (mode === "steps") {
    const screens = form.steps
      .map((s) => ({ id: s.id, title: s.title, heading: s.heading, description: s.description, blocks: visibleIn(s.blocks) }))
      .filter((s) => s.blocks.length > 0)
    return screens.length ? screens : [{ id: "empty", blocks: [] }]
  }

  /* one-at-a-time: layout blocks travel with the next question; trailing ones join the last screen */
  const screens: Screen[] = []
  let pending: Block[] = []
  for (const block of visibleIn(form.steps.flatMap((s) => s.blocks))) {
    pending.push(block)
    if (isAnswerBlock(block.type)) {
      screens.push({ id: block.id, blocks: pending })
      pending = []
    }
  }
  if (pending.length) {
    if (screens.length) screens[screens.length - 1].blocks.push(...pending)
    else screens.push({ id: "intro", blocks: pending })
  }
  return screens.length ? screens : [{ id: "empty", blocks: [] }]
}