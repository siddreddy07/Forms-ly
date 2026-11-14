"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { CircleAlertIcon } from "lucide-react"
import gsap from "gsap"

import { WarmGlow } from "@/components/ui/warm-glow"
import { brand } from "@/lib/brand"

/* The 404 page, kept small: the address that failed, shown in a field with its error, and one way home.
   GSAP types the address in, then the error drops in and the field shakes once. With reduced motion it is all just there. */
export function NotFoundScene({ title, text }: { title: string; text: string }) {
  const missing = usePathname() || "/"
  const root = React.useRef<HTMLDivElement>(null)
  const input = React.useRef<HTMLInputElement>(null)

  React.useLayoutEffect(() => {
    const el = root.current
    const field = input.current
    if (!el || !field) return
    const mm = gsap.matchMedia()
    const ctx = gsap.context(() => {
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const typed = { n: 0 }
        field.value = ""
        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .from("[data-head]", { yPercent: 110, duration: 0.9, stagger: 0.08 })
          .from("[data-fade]", { opacity: 0, y: 12, duration: 0.6 }, 0.3)
          .to(
            typed,
            { n: missing.length, duration: Math.min(1.2, 0.3 + missing.length * 0.05), ease: "none", onUpdate: () => (field.value = missing.slice(0, Math.round(typed.n))) },
            0.7
          )
          .from("[data-error]", { y: -8, opacity: 0, duration: 0.4 }, ">0.05")
          .to("[data-field]", { keyframes: { x: [0, -8, 7, -4, 2, 0] }, duration: 0.45 }, "<")
      })
    }, el)
    return () => {
      mm.revert()
      ctx.revert()
    }
  }, [missing])

  return (
    <div ref={root} className="relative isolate min-h-svh overflow-hidden bg-background text-foreground">
      <WarmGlow />

      <div className="mx-auto flex min-h-svh max-w-3xl flex-col px-5 py-6 sm:px-8">
        <header>
          <Link
            href="/"
            className="inline-block rounded-md font-display text-lg font-medium tracking-tight outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            {brand.name}
          </Link>
        </header>

        <main className="flex flex-1 flex-col justify-center gap-[clamp(0.75rem,3svh,1.5rem)] py-4">
          <h1 className="font-display text-[clamp(2.5rem,min(11vw,14svh),6.5rem)] font-medium leading-[0.95] tracking-tight">
            {title.split(" ").map((w, i) => (
              <span key={i} className="mr-[0.22em] inline-block overflow-hidden pb-[0.12em] align-bottom">
                <span data-head className="inline-block">
                  {w}
                </span>
              </span>
            ))}
          </h1>

          <p data-fade className="max-w-md text-base leading-relaxed text-muted-foreground">
            {text}
          </p>

          <div data-fade className="grid max-w-md gap-2">
            <div data-field className="flex h-12 items-center rounded-xl border-2 border-destructive bg-card px-3.5">
              <input
                ref={input}
                defaultValue={missing}
                readOnly
                aria-label="Address that was not found"
                aria-invalid="true"
                className="w-full bg-transparent font-mono text-sm outline-none"
              />
            </div>
            <p data-error role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
              <CircleAlertIcon className="size-4 shrink-0" aria-hidden="true" />
              Error 404: no page lives here.
            </p>
          </div>

          <div data-fade>
            <Link
              href="/"
              className="scene-gradient inline-flex min-h-11 items-center rounded-full px-6 text-sm font-medium text-[#1a1208] shadow-[0_8px_24px_-8px_rgba(255,122,24,0.7)] outline-none transition hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Go home
            </Link>
          </div>
        </main>
      </div>
    </div>
  )
}
