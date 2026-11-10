"use client"

import * as React from "react"
import { CheckIcon, LockIcon, SparklesIcon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { fonts, setFont, type FontId } from "@/lib/api/mock-design"
import { useIsPro } from "@/lib/pro"
import { cn } from "@/lib/utils"

const sampleClass = {
  sans: "font-sans",
  serif: "font-serif",
  mono: "font-mono",
} as const

function ProBadge() {
  return (
    <Badge variant="secondary" className="gap-1">
      <SparklesIcon className="size-3" aria-hidden="true" /> Pro
    </Badge>
  )
}

function UpgradeHint() {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed bg-muted/40 px-3 py-2.5">
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <LockIcon className="size-3.5 shrink-0" aria-hidden="true" /> Included
        in Pro.
      </p>
      <Button size="sm" onClick={() => toast.message("Plans are coming soon.")}>
        Upgrade
      </Button>
    </div>
  )
}

/* only: show just one of the two sections (used by the tabs in the small-screen drawer). */
export function ProDesign({
  formId,
  font,
  only,
}: {
  formId: string
  font: FontId
  only?: "font" | "ai"
}) {
  const pro = useIsPro()
  const [prompt, setPrompt] = React.useState("")

  return (
    <div className={cn("grid gap-6", !only && "border-t pt-6")}>
      {only !== "ai" && (
        <section className="grid gap-3" aria-labelledby="font-title">
          <div className="flex items-center justify-between gap-2">
            <h3 id="font-title" className="text-sm font-medium">
              Font
            </h3>
            <ProBadge />
          </div>
          <div
            role="radiogroup"
            aria-label="Font"
            className="grid grid-cols-3 gap-2"
          >
            {fonts.map((f) => {
              const active = pro && font === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={f.label}
                  disabled={!pro}
                  onClick={() => setFont(formId, f.id)}
                  className={cn(
                    "relative flex flex-col items-center gap-0.5 rounded-lg border px-2 py-2.5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    active
                      ? "border-foreground bg-muted/50 ring-2 ring-foreground/20"
                      : "enabled:hover:bg-muted/30",
                    !pro && "cursor-not-allowed opacity-60"
                  )}
                >
                  <span
                    className={cn("text-2xl leading-none", sampleClass[f.id])}
                  >
                    Aa
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {f.label}
                  </span>
                  {!pro && (
                    <LockIcon
                      className="absolute top-1.5 right-1.5 size-3 text-muted-foreground"
                      aria-hidden="true"
                    />
                  )}
                  {active && (
                    <CheckIcon
                      className="absolute top-1.5 right-1.5 size-3"
                      aria-hidden="true"
                    />
                  )}
                </button>
              )
            })}
          </div>
          {!pro && <UpgradeHint />}
        </section>
      )}

      {only !== "font" && (
        <section className="grid gap-3" aria-labelledby="ai-title">
          <div className="flex items-center justify-between gap-2">
            <h3 id="ai-title" className="text-sm font-medium">
              Design with AI
            </h3>
            <ProBadge />
          </div>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={!pro}
            rows={3}
            aria-label="Describe the look you want"
            placeholder="Describe the look you want, like “calm and friendly for a yoga studio”"
            className="rounded-lg text-sm"
          />
          <Button
            disabled={!pro || !prompt.trim()}
            onClick={() => toast.message("AI design is coming soon.")}
            className="w-fit"
          >
            <SparklesIcon /> Generate design
          </Button>
          {!pro && <UpgradeHint />}
        </section>
      )}
    </div>
  )
}
