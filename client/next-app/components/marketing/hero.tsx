"use client"

import { ArrowRightIcon, CheckIcon } from "lucide-react"
import { motion, MotionConfig } from "motion/react"
import * as React from "react"

import { StartLink } from "@/components/auth/start-link"
import { LiveForm } from "@/components/marketing/live-form"
import { buttonVariants } from "@/components/ui/button"
import { accentPresets, defaultDesign, fonts, radii, type FontId, type RadiusId } from "@/lib/api/mock-design"
import { createCafeApplication } from "@/lib/schema"
import { cn } from "@/lib/utils"

const ease = [0.22, 1, 0.36, 1] as const

const headline = ["Forms", "people", "enjoy", "filling", "in"]

/* The three design choices every form really has (Design tab), shown as the page's one interactive moment. */
function DesignPicker({
  accent,
  radius,
  font,
  onAccent,
  onRadius,
  onFont,
}: {
  accent: string | null
  radius: RadiusId
  font: FontId
  onAccent: (hex: string | null) => void
  onRadius: (id: RadiusId) => void
  onFont: (id: FontId) => void
}) {
  const chip = (on: boolean) =>
    cn(
      "h-8 rounded-full px-3 text-sm font-medium outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
      on ? "bg-foreground text-background" : "text-muted-foreground hover:bg-foreground/8 hover:text-foreground"
    )
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:gap-x-6 sm:gap-y-3">
      <div role="radiogroup" aria-label="Accent colour" className="flex items-center gap-2">
        <button
          type="button"
          role="radio"
          aria-checked={accent === null}
          aria-label="Default colour"
          onClick={() => onAccent(null)}
          className={cn("size-6 rounded-full border bg-foreground outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", accent === null && "ring-2 ring-foreground ring-offset-2 ring-offset-background")}
        />
        {accentPresets.map((c) => (
          <button
            key={c.hex}
            type="button"
            role="radio"
            aria-checked={accent === c.hex}
            aria-label={c.label}
            title={c.label}
            onClick={() => onAccent(c.hex)}
            style={{ backgroundColor: c.hex }}
            className={cn("flex size-6 items-center justify-center rounded-full text-white outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", accent === c.hex && "ring-2 ring-foreground ring-offset-2 ring-offset-background")}
          >
            {accent === c.hex && <CheckIcon className="size-3.5" />}
          </button>
        ))}
      </div>
      <div role="radiogroup" aria-label="Corners" className="flex items-center rounded-full bg-muted p-0.5">
        {radii.map((r) => (
          <button key={r.id} type="button" role="radio" aria-checked={radius === r.id} onClick={() => onRadius(r.id)} className={chip(radius === r.id)}>
            {r.label}
          </button>
        ))}
      </div>
      <div role="radiogroup" aria-label="Font" className="flex items-center rounded-full bg-muted p-0.5">
        {fonts.map((f) => (
          <button key={f.id} type="button" role="radio" aria-checked={font === f.id} onClick={() => onFont(f.id)} className={chip(font === f.id)}>
            {f.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function Hero() {
  const [accent, setAccent] = React.useState<string | null>(null)
  const [radius, setRadius] = React.useState<RadiusId>("md")
  const [font, setFont] = React.useState<FontId>("sans")
  const design = React.useMemo(() => ({ ...defaultDesign, accent, radius, font }), [accent, radius, font])

  return (
    <MotionConfig reducedMotion="user">
      <section className="px-4 pt-24 pb-12 sm:px-6 sm:pt-40 sm:pb-16">
        <div className="mx-auto max-w-6xl text-center">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease, delay: 0.1 }} >
            <p className="text-sm font-medium">The form builder for client work</p>
            <p className="text-sm text-muted-foreground">Free to start, no card needed</p>
          </motion.div>

          <h1 className="mx-auto mt-8 flex max-w-5xl flex-wrap justify-center gap-x-[0.22em] font-display text-[clamp(3rem,9vw,8.5rem)] leading-[0.95] font-medium tracking-[-0.045em]">
            {headline.map((word, i) => (
              <span key={word} className="inline-block overflow-hidden pb-[0.12em]">
                <motion.span
                  className="inline-block"
                  initial={{ y: "110%", opacity: 0, filter: "blur(8px)" }}
                  animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                  transition={{ duration: 0.9, ease, delay: 0.2 + i * 0.07 }}
                >
                  {word}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease, delay: 0.65 }}
            className="mx-auto mt-4 max-w-xl text-base leading-relaxed sm:mt-6 sm:text-lg text-muted-foreground text-balance"
          >
            Build a form by dragging blocks into place. Share a link. See exactly where people drop off.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease, delay: 0.78 }} className="mt-6 flex justify-center sm:mt-10">
            <StartLink
              modal
              className={`${buttonVariants({ size: "lg", shape: "pill" })} group/cta h-12 px-6 text-base`}
              signedInChildren={
                <>
                  Go to dashboard
                  <ArrowRightIcon data-icon="inline-end" className="transition-transform duration-300 group-hover/cta:translate-x-1" />
                </>
              }
            >
              Start for free
              <ArrowRightIcon data-icon="inline-end" className="transition-transform duration-300 group-hover/cta:translate-x-1" />
            </StartLink>
          </motion.div>
        </div>

        {/* The real renderer, with the real design options. */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease, delay: 0.9 }}
          className="relative mx-auto mt-16 hidden max-w-5xl overflow-hidden rounded-[2rem] bg-muted/50 px-8 py-10 lg:block"
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[color-mix(in_oklab,var(--warm)_22%,transparent)] to-transparent" />
          <div className="relative grid gap-8">
            <div className="grid gap-3 text-center">
              <p className="text-sm text-muted-foreground">This is a real form. Fill it in, then change how it looks.</p>
              <DesignPicker accent={accent} radius={radius} font={font} onAccent={setAccent} onRadius={setRadius} onFont={setFont} />
            </div>
            {/* Big screens only: on phones and tablets this whole panel is left out. */}
            <LiveForm make={createCafeApplication} design={design} />
          </div>
        </motion.div>
      </section>
    </MotionConfig>
  )
}

export { Hero }
