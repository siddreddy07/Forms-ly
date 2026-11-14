"use client"

import * as React from "react"
import Link from "next/link"
import gsap from "gsap"

import { StartLink } from "@/components/auth/start-link"
import { MadeWith } from "@/components/brand/made-with"
import { brand } from "@/lib/brand"
import { fullDateTime } from "@/lib/time"

/* The page for a form that exists but can't be filled in: closed (time ran out, or it is full), private, or not
   published. Light rising from the bottom edge, and a huge ghost readout behind the headline: a clock
   that runs down to 00:00 for a closed form, four dots for a private one, dashes for one that isn't open yet.
   GSAP runs one arrival and the countdown; with reduced motion the page is simply there. */

type Variant = "private" | "unpublished" | "closed"

type Info = {
  title: string
  text: string
  ghost: string
  rows: { label: string; value: string }[]
}

function describe(variant: Variant, reason: "date" | "limit" | undefined, when: string): Info {
  if (variant === "private") {
    return {
      title: "This form is private",
      text: "Put in the 4 digit code the owner gave you to open it. If you don't have one, ask them.",
      ghost: "••••",
      rows: [
        { label: "Status", value: "Private" },
        { label: "To open it", value: "4 digit code" },
      ],
    }
  }
  if (variant === "unpublished") {
    return {
      title: "This form isn't open yet",
      text: "The owner hasn't published it, or has taken it offline. Check back later, or ask them when it opens.",
      ghost: "--:--",
      rows: [
        { label: "Status", value: "Not open" },
        { label: "Reason", value: "Not published" },
      ],
    }
  }
  if (reason === "limit") {
    return {
      title: "This form is full",
      text: "It has reached the most responses it can take, so it is not taking answers any more.",
      ghost: "00:00",
      rows: [
        { label: "Status", value: "Closed" },
        { label: "Reason", value: "Response limit reached" },
      ],
    }
  }
  return {
    title: "This form has closed",
    text: when ? `It stopped taking answers on ${when}.` : "It is not taking answers any more.",
    ghost: "00:00",
    rows: [
      { label: "Status", value: "Closed" },
      ...(when ? [{ label: "Closed on", value: when }] : []),
      { label: "Reason", value: "Closing time reached" },
    ],
  }
}

const pill =
  "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full px-5 text-sm font-medium outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

export function ClosedScene({
  variant,
  reason,
  closesAt,
  children,
}: {
  variant: Variant
  /* Only for "closed": why it stopped. */
  reason?: "date" | "limit"
  closesAt?: string | null
  children?: React.ReactNode
}) {
  const info = describe(variant, reason, closesAt ? fullDateTime(closesAt) : "")
  const root = React.useRef<HTMLDivElement>(null)
  const ghost = React.useRef<HTMLDivElement>(null)

  React.useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const mm = gsap.matchMedia()
    const ctx = gsap.context(() => {
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } })
        tl.from("[data-ghost]", { opacity: 0, scale: 1.06, duration: 1.4 })
          .from("[data-head]", { yPercent: 110, duration: 1, stagger: 0.1 }, 0.1)
          .from("[data-meta] > *", { y: 14, opacity: 0, duration: 0.6, stagger: 0.08 }, 0.5)
          .from("[data-rule]", { scaleX: 0, duration: 1, ease: "power3.inOut" }, 0.6)
          .from("[data-low]", { y: 16, opacity: 0, duration: 0.7, stagger: 0.08 }, 0.9)

        /* The closed clock runs down to zero and stays there. */
        if (variant === "closed" && ghost.current) {
          const node = ghost.current
          const clock = { s: 9 }
          node.textContent = "00:09"
          tl.to(
            clock,
            {
              s: 0,
              duration: 2.2,
              ease: "none",
              onUpdate: () => {
                node.textContent = `00:0${Math.ceil(clock.s)}`
              },
              onComplete: () => {
                node.textContent = "00:00"
              },
            },
            0.5
          )
        }
      })
    }, el)
    return () => {
      mm.revert()
      ctx.revert()
    }
  }, [variant])

  return (
    <div ref={root} className="relative isolate min-h-svh overflow-hidden bg-background text-foreground">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="scene-floor absolute inset-0" />
        <div className="scene-grain absolute inset-0" />
      </div>

      <div className="mx-auto flex min-h-svh max-w-6xl flex-col px-5 py-6 sm:px-8">
        <header>
          <Link
            href="/"
            className="inline-block rounded-md font-display text-lg font-medium tracking-tight outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            {brand.name}
          </Link>
        </header>

        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 py-3 lg:justify-end lg:gap-8 lg:max-w-none lg:pb-8 lg:pt-16">
          <div data-ghost className="text-center lg:pointer-events-none lg:absolute lg:inset-x-0 lg:top-[34%] lg:-z-10 lg:-translate-y-1/2">
            <div
              ref={ghost}
              aria-hidden="true"
              className="scene-gradient-text select-none whitespace-nowrap font-display text-[clamp(4rem,min(22vw,13svh),22rem)] font-semibold leading-none tracking-tighter opacity-[0.28] lg:text-[clamp(5.5rem,min(27vw,32svh),22rem)] lg:opacity-[0.2] dark:opacity-[0.2] dark:lg:opacity-[0.16]"
            >
              {info.ghost}
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-12">
            <h1 className="mx-auto flex max-w-[14ch] flex-wrap justify-center gap-x-[0.22em] text-center font-display text-[clamp(2.25rem,min(9vw,10svh),6.5rem)] font-medium leading-[0.95] tracking-tight lg:mx-0 lg:justify-start lg:text-left lg:text-[clamp(2.75rem,min(8.5vw,14svh),6.5rem)]">
              {info.title.split(" ").map((w, i) => (
                <span key={i} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
                  <span data-head className="inline-block">
                    {w}
                  </span>
                </span>
              ))}
            </h1>

            <dl data-meta className="grid divide-y divide-foreground/10 overflow-hidden rounded-2xl border border-foreground/10 bg-card/70 text-sm lg:min-w-56 lg:divide-y-0 lg:gap-4 lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent">
              {info.rows.map((r) => (
                <div key={r.label} className="flex items-baseline justify-between gap-4 px-4 py-2.5 lg:grid lg:gap-0.5 lg:p-0">
                  <dt className="text-muted-foreground">{r.label}</dt>
                  <dd className="text-right font-medium lg:text-left">{r.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <span data-rule className="scene-gradient h-px w-full origin-left opacity-80 max-lg:hidden" />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-12">
            <div data-low className="grid content-start justify-items-center gap-3 lg:justify-items-start lg:gap-4">
              <p className={`text-center text-base leading-relaxed text-muted-foreground lg:text-left ${variant === "closed" ? "max-lg:hidden" : ""}`}>{info.text}</p>
              {children}
            </div>
            <div data-low className="grid w-full content-start gap-2.5 sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-end">
              <StartLink
                className={`${pill} scene-gradient text-[#1a1208] shadow-[0_8px_24px_-8px_rgba(255,122,24,0.7)] hover:brightness-105`}
                signedInChildren="Go to your forms"
              >
                Make your own form
              </StartLink>
              <Link href="/" className={`${pill} border border-foreground/15 hover:bg-foreground/8`}>
                Go home
              </Link>
            </div>
          </div>
        </main>

        <footer className="flex justify-center pb-2">
          <MadeWith />
        </footer>
      </div>
    </div>
  )
}
