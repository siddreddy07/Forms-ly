"use client"

import * as React from "react"
import { CheckCircle2Icon } from "lucide-react"

import { BlockField, spanClass } from "@/components/renderer/field"
import { FormHeaderView } from "@/components/renderer/form-header"
import { Button, buttonVariants } from "@/components/ui/button"
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
  thankYou?: { title: string; message?: string; button?: { label: string; url: string }; redirectUrl?: string }
  /* Design tab: show the thank-you screen without filling in the form. */
  forceThankYou?: boolean
  /* Preview only: lets the tester fill the form in again. */
  allowAnother?: boolean
  /* Builder preview only: show the banner slot even when no image is set. */
  showEmptyBanner?: boolean
}

function FormRenderer({
  form,
  mode,
  onSubmit,
  submitLabel = "Submit",
  thankYou = { title: "Thank you", message: "Your response has been recorded." },
  allowAnother,
  showEmptyBanner,
  forceThankYou,
}: Props) {
  const [answers, setAnswers] = React.useState<Answers>({})
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [index, setIndex] = React.useState(0)
  const [submitting, setSubmitting] = React.useState(false)
  const [done, setDone] = React.useState(false)
  const [closeBlocked, setCloseBlocked] = React.useState(false)
  const [submitError, setSubmitError] = React.useState<string | null>(null)
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
    setSubmitError(null)
    try {
      await onSubmit?.(all.data)
      setDone(true)
    } catch (err) {
      setSubmitError(err instanceof Error && err.message ? err.message : "Couldn't send your answers. Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const showThankYou = done || forceThankYou

  /* Live form only: if the owner set a redirect address, send people there after a moment. */
  React.useEffect(() => {
    const url = thankYou.redirectUrl
    if (!done || !url) return
    const timer = setTimeout(() => window.location.assign(url), 2500)
    return () => clearTimeout(timer)
  }, [done, thankYou.redirectUrl])

  if (showThankYou) {
    return (
      <div data-form-renderer className="flex flex-col items-center py-10 text-center" role="status">
        <CheckCircle2Icon className="size-10" aria-hidden="true" />
        <h2 className="mt-4 font-display text-2xl font-medium tracking-tight">{thankYou.title}</h2>
        {thankYou.message && <p className="mt-1 text-muted-foreground">{thankYou.message}</p>}
        {thankYou.button && (
          <a href={thankYou.button.url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ className: "mt-6" })}>
            {thankYou.button.label}
          </a>
        )}
        {thankYou.redirectUrl && <p className="mt-4 text-sm text-muted-foreground">Taking you to the next page...</p>}
        {allowAnother ? (
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => {
              setAnswers({})
              setErrors({})
              setIndex(0)
              setDone(false)
              setSubmitError(null)
            }}
          >
            Fill it in again
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => {
                window.close()
                /* Browsers only close tabs a script opened; if this one stays, say so. */
                setTimeout(() => setCloseBlocked(true), 200)
              }}
            >
              Close this tab
            </Button>
            {closeBlocked && <p className="mt-3 text-sm text-muted-foreground">You can close this tab now.</p>}
          </>
        )}
      </div>
    )
  }

  const progress = multi ? Math.round(((Math.min(index, screens.length - 1) + 1) / screens.length) * 100) : 0

  return (
    <form ref={root} data-form-renderer noValidate onSubmit={handleSubmit} className="scroll-mt-20">
      {index === 0 && <FormHeaderView header={form.header} showEmptyBanner={showEmptyBanner && !!form.header} />}

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
              className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {(current.heading || current.description) && (
        <div className="mb-5 grid gap-1">
          {current.heading && <h2 className="font-display text-2xl font-medium tracking-tight">{current.heading}</h2>}
          {current.description && <p className="text-muted-foreground">{current.description}</p>}
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

      {submitError && (
        <p role="alert" className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {submitError}
        </p>
      )}

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