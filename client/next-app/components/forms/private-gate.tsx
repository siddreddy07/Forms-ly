"use client"

import * as React from "react"
import { LockIcon } from "lucide-react"
import { toast } from "sonner"

import { Toaster } from "@/components/ui/sonner"
import { unlockForm, type PublicFormResponse } from "@/lib/api/forms"
import { cn } from "@/lib/utils"

const LENGTH = 4

/* Four boxes for the form's code. It sends itself when the fourth digit goes in. A wrong code shows a toast and clears
   the boxes; the page stays as it is so they can try again. */
export function PrivateGate({ slug, onOpen }: { slug: string; onOpen: (data: PublicFormResponse, code: string) => void }) {
  const [digits, setDigits] = React.useState<string[]>(() => Array(LENGTH).fill(""))
  const [checking, setChecking] = React.useState(false)
  const refs = React.useRef<(HTMLInputElement | null)[]>([])

  const focus = (i: number) => refs.current[Math.max(0, Math.min(LENGTH - 1, i))]?.focus()

  async function submit(code: string) {
    setChecking(true)
    const data = await unlockForm(slug, code)
    if (data && data.state === "live") {
      onOpen(data, code)
      return
    }
    setChecking(false)
    setDigits(Array(LENGTH).fill(""))
    toast.error("Unable to access form")
    requestAnimationFrame(() => focus(0))
  }

  function put(i: number, raw: string) {
    const typed = raw.replace(/\D/g, "")
    if (!typed) return
    /* Pasting "4271" fills every box; typing fills one and moves on. */
    const next = [...digits]
    typed
      .slice(0, LENGTH - i)
      .split("")
      .forEach((d, k) => {
        next[i + k] = d
      })
    setDigits(next)
    const last = Math.min(LENGTH - 1, i + typed.length)
    if (next.every(Boolean)) void submit(next.join(""))
    else focus(last)
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i]) {
      e.preventDefault()
      const next = [...digits]
      next[Math.max(0, i - 1)] = ""
      setDigits(next)
      focus(i - 1)
    } else if (e.key === "ArrowLeft") focus(i - 1)
    else if (e.key === "ArrowRight") focus(i + 1)
  }

  return (
    <div className="grid gap-3 pt-1">
      <Toaster position="top-center" />
      <p className="flex items-center gap-2 text-sm font-medium">
        <LockIcon className="size-4" aria-hidden="true" />
        Enter the 4 digit code
      </p>
      <div role="group" aria-label="4 digit access code" className="flex gap-2.5">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el
            }}
            value={d}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={LENGTH}
            aria-label={`Digit ${i + 1}`}
            disabled={checking}
            onChange={(e) => put(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
            className={cn(
              "size-14 rounded-xl border-2 border-foreground/20 bg-transparent text-center font-display text-2xl font-medium outline-none transition-colors sm:size-16",
              "focus:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50",
              d && "border-foreground/60"
            )}
          />
        ))}
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {checking ? "Checking…" : "Don't have the code? Ask the person who shared this form."}
      </p>
    </div>
  )
}
