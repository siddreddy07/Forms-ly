import { z } from "zod"

/* Form schema v1. Pure data: no React, no app imports. Can move to a shared package later. */

export const SCHEMA_VERSION = 1

export const blockTypes = [
  "short_text",
  "long_text",
  "email",
  "phone",
  "number",
  "url",
  "date",
  "time",
  "single_choice",
  "multiple_choice",
  "dropdown",
  "rating",
  "scale",
  "yes_no",
  "file_upload",
  "heading",
  "paragraph",
  "divider",
  "image",
] as const

export type BlockType = (typeof blockTypes)[number]

export const optionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
})

export const validationSchema = z.object({
  minLength: z.number().int().min(0).optional(),
  maxLength: z.number().int().min(1).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  maxFiles: z.number().int().min(1).optional(),
  maxFileSizeMb: z.number().min(0).optional(),
})

export const leafConditionSchema = z.object({
  blockId: z.string().min(1),
  operator: z.enum([
    "equals",
    "not_equals",
    "contains",
    "greater_than",
    "less_than",
    "is_empty",
    "is_not_empty",
  ]),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
})

export const conditionGroupSchema = z.object({
  match: z.enum(["all", "any"]),
  conditions: z.array(leafConditionSchema).min(1),
})

/* Jump-to-step and end-form actions come with the visual logic editor later. */
export const ruleSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["show", "hide"]),
  when: conditionGroupSchema,
})

export const blockSchema = z.object({
  id: z.string().min(1),
  type: z.enum(blockTypes),
  label: z.string(),
  help: z.string().optional(),
  placeholder: z.string().optional(),
  required: z.boolean().default(false),
  options: z.array(optionSchema).optional(),
  validation: validationSchema.optional(),
  scale: z
    .object({
      min: z.number().int(),
      max: z.number().int(),
      minLabel: z.string().optional(),
      maxLabel: z.string().optional(),
    })
    .optional(),
  /* Heading and paragraph text, or an image URL. */
  content: z.string().optional(),
  alt: z.string().optional(),
  layout: z.object({ colSpan: z.number().int().min(1).max(12) }).default({ colSpan: 12 }),
  logic: z.array(ruleSchema).optional(),
})

export const stepSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  blocks: z.array(blockSchema),
})

export const formModeSchema = z.enum(["single", "steps", "one-at-a-time"])

/* Shown once above the first step: a banner, the company or form title, and a short description. */
export const formHeaderSchema = z.object({
  banner: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
})

export const formSchemaV1 = z.object({
  version: z.literal(SCHEMA_VERSION),
  mode: formModeSchema.default("single"),
  header: formHeaderSchema.optional(),
  steps: z.array(stepSchema).min(1),
})

export type Option = z.infer<typeof optionSchema>
export type Validation = z.infer<typeof validationSchema>
export type LeafCondition = z.infer<typeof leafConditionSchema>
export type ConditionGroup = z.infer<typeof conditionGroupSchema>
export type Rule = z.infer<typeof ruleSchema>
export type Block = z.infer<typeof blockSchema>
export type Step = z.infer<typeof stepSchema>
export type FormHeader = z.infer<typeof formHeaderSchema>
export type FormMode = z.infer<typeof formModeSchema>
export type FormDocument = z.infer<typeof formSchemaV1>

export type FileAnswer = { name: string; size: number; url: string }
export type AnswerValue = string | number | boolean | string[] | FileAnswer[] | null | undefined
export type Answers = Record<string, AnswerValue>