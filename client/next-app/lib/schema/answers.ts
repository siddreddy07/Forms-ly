import { z } from "zod"

import { isBlockVisible } from "./logic"
import { isAnswerBlock } from "./registry"
import type { Answers, Block, FormDocument } from "./types"
import { maxUploadMb } from "@/lib/uploads"

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const PHONE = /^[+()\d\s.-]{6,20}$/

function textSchema(block: Block) {
  const v = block.validation
  let s = z.string()
  if (v?.minLength) s = s.min(v.minLength, `At least ${v.minLength} characters`)
  if (v?.maxLength) s = s.max(v.maxLength, `At most ${v.maxLength} characters`)
  if (v?.pattern) {
    try {
      s = s.regex(new RegExp(v.pattern), "Does not match the expected format")
    } catch {
      /* An invalid pattern is ignored rather than blocking every submission. */
    }
  }
  return s
}

/* The rule for one block's answer, ignoring whether it is required. */
function baseSchema(block: Block): z.ZodType {
  switch (block.type) {
    case "short_text":
    case "long_text":
      return textSchema(block)
    case "email":
      return z.email("Enter a valid email address")
    case "phone":
      return z.string().regex(PHONE, "Enter a valid phone number")
    case "url":
      return z.url("Enter a valid web address")
    case "date":
      return z.string().regex(ISO_DATE, "Pick a date")
    case "time":
      return z.string().regex(TIME, "Pick a time")
    case "number": {
      let n = z.number("Enter a number")
      if (block.validation?.min !== undefined) n = n.min(block.validation.min, `At least ${block.validation.min}`)
      if (block.validation?.max !== undefined) n = n.max(block.validation.max, `At most ${block.validation.max}`)
      return n
    }
    case "single_choice":
    case "dropdown": {
      const ids = new Set((block.options ?? []).map((o) => o.id))
      return z.string().refine((v) => ids.has(v), "Pick one of the options")
    }
    case "multiple_choice": {
      const ids = new Set((block.options ?? []).map((o) => o.id))
      return z.array(z.string().refine((v) => ids.has(v), "Pick from the options"))
    }
    case "yes_no":
      return z.boolean("Choose yes or no")
    case "rating":
    case "scale": {
      const min = block.scale?.min ?? 1
      const max = block.scale?.max ?? 5
      return z.number("Choose a value").int().min(min).max(max)
    }
    case "file_upload": {
      const maxFiles = block.validation?.maxFiles ?? 1
      const maxMb = maxUploadMb(block)
      return z
        .array(z.object({ name: z.string(), size: z.number().max(maxMb * 1024 * 1024, `Each file must be ${maxMb} MB or smaller`), url: z.string() }))
        .max(maxFiles, `Upload at most ${maxFiles} file${maxFiles === 1 ? "" : "s"}`)
    }
    default:
      return z.never()
  }
}

function isBlank(v: unknown) {
  return v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)
}

export type ValidationResult =
  | { success: true; data: Answers }
  | { success: false; errors: Record<string, string> }

/* Validates only blocks that are visible for these answers, the same rule the server will apply. */
export function validateBlocks(blocks: Block[], answers: Answers): ValidationResult {
  const errors: Record<string, string> = {}
  const data: Answers = {}

  for (const block of blocks) {
    if (!isAnswerBlock(block.type) || !isBlockVisible(block, answers)) continue
    const value = answers[block.id]

    if (isBlank(value)) {
      if (block.required) errors[block.id] = "This field is required"
      continue
    }
    const parsed = baseSchema(block).safeParse(value)
    if (parsed.success) data[block.id] = parsed.data as Answers[string]
    else errors[block.id] = parsed.error.issues[0]?.message ?? "Invalid answer"
  }

  return Object.keys(errors).length ? { success: false, errors } : { success: true, data }
}

export function validateAnswers(form: FormDocument, answers: Answers): ValidationResult {
  return validateBlocks(form.steps.flatMap((s) => s.blocks), answers)
}
