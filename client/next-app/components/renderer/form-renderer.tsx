"use client"

import * as React from "react"
import { CheckCircle2Icon } from "lucide-react"

import { BlockField, spanClass } from "@/components/renderer/field"
import { FormHeaderView } from "@/components/renderer/form-header"
import { Button } from "@/components/ui/button"
import {
  buildScreens,
  validateBlocks,
  type Answers,
  type AnswerValue,
  type FormDocument,
  type FormMode,
} from "@/lib/schema"

type Props = {
  form: FormDocument
  /* Overrides form.mode, for the builder's preview toggle. */
  mode?: FormMode
  onSubmit?: (answers: Answers) => void | Promise<void>
  submitLabel?: string
  thankYou?: { title: string; message?: string }
  /* Preview only: lets the tester fill the form in again. */
  allowAnother?: boolean
}

function FormRenderer({
  form,
  mode,
  onSubmit,
  submitLabel = "Submit",
  thankYou = { title: "Thank you", message: "Your response has been recorded." },
  allowAnother,
}: Props) {
  const [answers, setAnswers] = React.useState<Answers>({})
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [index, setIndex] = React.useState(0)
  const [submitting, setSubmitting] = React.useState(false)
  const [done, setDone] = React.useState(false)
  const root = React.useRef<HTMLFormElement>(null)

  const effectiveMode = mode ?? form.mode
  const screens = buildScreens(form, answers, effectiveMode)
  const current = screens[Math.min(index, screens.length - 1)]
  const isLast = index >= screens.length - 1
  const multi = screens.length > 1

  function focusFirstError(ids: string[]) {
    requestAnimationFrame(() => {
      for (const id of ids) {
        const el = root.current?.querySelector<HTMLElement>(
          `[data-field="${id}"] :is(input, select, textarea, button)`
        )
        if (el) return el.focus()
      }
    })
  }

  function setAnswer(blockId: string, value: AnswerValue) {
    const next = { ...answers, [blockId]: value }
    setAnswers(next)
    /* Once a field has shown an error, re-check it as the respondent fixes it. */
    if (errors[blockId]) {
      const block = current.blocks.find((b) => b.id === blockId)
      const result = block ? validateBlocks([block], next) : undefined
      setErrors((prev) => {
        const copy = { ...prev }
        if (result && !result.success && result.errors[blockId]) copy[blockId] = result.errors[blockId]
        else delete copy[blockId]
        return copy
      })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return

    const here = validateBlocks(current.blocks, answers)
    if (!here.success) {
      setErrors(here.errors)
      focusFirstError(current.blocks.map((b) => b.id).filter((id) => here.errors[id]))
      return
    }
    setErrors({})

    if (!isLast) {
      setIndex((i) => i + 1)
      requestAnimationFrame(() => root.current?.scrollIntoView({ block: "start", behavior: "smooth" }))
      return
    }

    /* Final check across every visible screen, in case an earlier answer changed what is required. */
    const all = validateBlocks(screens.flatMap((s) => s.blocks), answers)
    if (!all.success) {
      const badScreen = screens.findIndex((s) => s.blocks.some((b) => all.errors[b.id]))
      setErrors(all.errors)
      setIndex(Math.max(badScreen, 0))
      focusFirstError(Object.keys(all.errors))
      return
    }

    setSubmitting(true)
    try {
      await onSubmit?.(all.data)
      setDone(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div data-form-renderer className="flex flex-col items-center py-10 text-center" role="status">
        <CheckCircle2Icon className="size-10" aria-hidden="true" />
        <h2 className="mt-4 font-display text-2xl font-medium tracking-tight">{thankYou.title}</h2>
        {thankYou.message && <p className="mt-1 text-muted-foreground">{thankYou.message}</p>}
        {allowAnother && (
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => {
              setAnswers({})
              setErrors({})
              setIndex(0)
              setDone(false)
            }}
          >
            Fill it in again
          </Button>
        )}
      </div>
    )
  }

  const progress = multi ? Math.round(((Math.min(index, screens.length - 1) + 1) / screens.length) * 100) : 0

  return (
    <form ref={root} data-form-renderer noValidate onSubmit={handleSubmit} className="scroll-mt-20">
      {index === 0 && <FormHeaderView header={form.header} />}

      {multi && (
        <div className="mb-6">
          <div className="mb-2 flex items-baseline justify-between text-sm">
            <span className="font-medium">{current.title ?? `Question ${index + 1}`}</span>
            <span className="text-muted-foreground">
              {Math.min(index, screens.length - 1) + 1} of {screens.length}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Form progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="h-1.5 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-foreground transition-[width] duration-300 ease-out motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div
        key={current.id}
        className="grid grid-cols-12 gap-x-4 gap-y-5 animate-in fade-in-0 slide-in-from-bottom-1 duration-300 motion-reduce:animate-none"
      >
        {current.blocks.map((block) => (
          <div key={block.id} className={spanClass(block)}>
            <BlockField
              block={block}
              value={answers[block.id]}
              error={errors[block.id]}
              onChange={(v) => setAnswer(block.id, v)}
            />
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        {index > 0 ? (
          <Button type="button" variant="outline" size="lg" onClick={() => setIndex((i) => Math.max(i - 1, 0))}>
            Back
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" size="lg" disabled={submitting}>
          {isLast ? (submitting ? "Sending" : submitLabel) : "Next"}
        </Button>
      </div>
    </form>
  )
}

export { FormRenderer }