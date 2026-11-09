import { createBlock, createStep } from "./factory"
import type { FormDocument } from "./types"
import { SCHEMA_VERSION } from "./types"

/* Realistic sample used by the demo and tests of the renderer. */
export function createCafeApplication(): FormDocument {
  const name = createBlock("short_text", { label: "Full name", required: true, layout: { colSpan: 6 } })
  const email = createBlock("email", { label: "Email", required: true, layout: { colSpan: 6 } })
  const shift = createBlock("dropdown", {
    label: "Which shift suits you?",
    options: [
      { id: "weekday", label: "Weekday mornings" },
      { id: "weekend", label: "Weekends" },
      { id: "evening", label: "Evenings" },
    ],
    required: true,
  })
  const experience = createBlock("yes_no", { label: "Have you worked in a café before?" })
  const story = createBlock("long_text", {
    label: "Tell us about your last job",
    logic: [
      {
        id: "rule_experience",
        action: "show",
        when: { match: "all", conditions: [{ blockId: experience.id, operator: "equals", value: true }] },
      },
    ],
  })
  const cv = createBlock("file_upload", { label: "CV", help: "PDF or Word, up to 10 MB" })

  return {
    version: SCHEMA_VERSION,
    mode: "steps",
    steps: [createStep("About you", [name, email, shift]), createStep("Experience", [experience, story, cv])],
  }
}