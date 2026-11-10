import { createBlock, createStep } from "./factory"
import type { FormDocument } from "./types"
import { SCHEMA_VERSION } from "./types"

/* Realistic sample used by the demo and tests of the renderer. */
export function createCafeApplication(): FormDocument {
  const name = createBlock("short_text", { label: "Full name", required: true })
  const email = createBlock("email", { label: "Email", required: true })
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
    header: { title: "Join our café team", description: "We are a small neighbourhood café hiring baristas and kitchen staff. Tell us a little about yourself." },
    steps: [{ ...createStep("About you", [name, email, shift]), heading: "Let us get to know you", description: "Your contact details and the shift you would like." },
      { ...createStep("Experience", [experience, story, cv]), heading: "Your experience", description: "Tell us about your last role and attach your CV." },],
  }
}

export function createClientIntake(): FormDocument {
  return {
    version: SCHEMA_VERSION,
    mode: "single",
    header: { title: "Start a project with us", description: "A few questions so we can understand your goals, timeline and budget before we talk." },
    steps: [
      createStep("Client intake", [
        createBlock("heading", { content: "Tell us about the project" }),
        createBlock("paragraph", { content: "Five minutes now saves a week of back and forth later." }),
        createBlock("short_text", { label: "Your name", required: true }),
        createBlock("email", { label: "Email", required: true }),
        createBlock("short_text", { label: "Company" }),
        createBlock("phone", { label: "Phone" }),
        createBlock("single_choice", {
          label: "What do you need?",
          required: true,
          options: [
            { id: "site", label: "A new website" },
            { id: "brand", label: "Branding" },
            { id: "both", label: "Both" },
          ],
        }),
        createBlock("multiple_choice", {
          label: "Which of these matter most?",
          options: [
            { id: "speed", label: "Speed" },
            { id: "cost", label: "Cost" },
            { id: "quality", label: "Quality" },
          ],
        }),
        createBlock("long_text", { label: "Describe the project", required: true, validation: { minLength: 20, maxLength: 1500 } }),
        createBlock("date", { label: "Ideal launch date", layout: { colSpan: 6 } }),
        createBlock("number", { label: "Budget in pounds", validation: { min: 0 }, layout: { colSpan: 6 } }),
        createBlock("file_upload", { label: "Brief or references", validation: { maxFiles: 3, maxFileSizeMb: 3 } }),
      ]),
    ],
  }
}

export function createWebsiteFeedback(): FormDocument {
  return {
    version: SCHEMA_VERSION,
    mode: "single",
    header: { title: "How are we doing?", description: "Two minutes of your time helps us improve the site for everyone." },
    steps: [
      createStep(undefined, [
        createBlock("rating", { label: "How was your visit today?", required: true }),
        createBlock("scale", { label: "How likely are you to recommend us?", required: true }),
        createBlock("multiple_choice", {
          label: "What could we improve?",
          options: [
            { id: "speed", label: "Speed" },
            { id: "content", label: "Content" },
            { id: "navigation", label: "Finding things" },
          ],
        }),
        createBlock("long_text", { label: "Anything else you want to tell us?" }),
        createBlock("email", { label: "Your email, if you want a reply" }),
      ]),
    ],
  }
}