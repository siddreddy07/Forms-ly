"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { authLinks, brand } from "@/lib/brand"
import { cn } from "@/lib/utils"

/* The 404 page: a gamepad. Its four face buttons (the same four a game console has) are the way back in.
   The prompts beside it are the real links and buttons; the buttons on the pad do the same for mouse and touch. */

type Kind = "triangle" | "square" | "circle" | "cross"

type Pad = {
  kind: Kind
  color: string
  /* Where the button sits on the 600 x 380 controller drawing. */
  at: [number, number]
  label: string
  href?: string
}

const pads: Pad[] = [
  { kind: "triangle", color: "#2fd08c", at: [450, 90], label: "Build a form", href: authLinks.signUp },
  { kind: "square", color: "#f4a6c6", at: [400, 140], label: "Your forms", href: "/dashboard" },
  { kind: "circle", color: "#ff3b4d", at: [500, 140], label: "Go back" },
  { kind: "cross", color: "#3f7bff", at: [450, 190], label: "Go home", href: "/" },
]

function Symbol({ kind, className }: { kind: Kind; className?: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2.7, strokeLinecap: "round", strokeLinejoin: "round" } as const
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} {...common}>
      {kind === "triangle" && <path d="M12 4.6 20.2 18.6H3.8Z" />}
      {kind === "square" && <rect x="5" y="5" width="14" height="14" rx="1.6" />}
      {kind === "circle" && <circle cx="12" cy="12" r="7.6" />}
      {kind === "cross" && <path d="M6 6l12 12M18 6 6 18" />}
    </svg>
  )
}

/* "4 0 4" in rings. The 0 is drawn like a selected radio button, because this is a form site. */
function Digits() {
  const ring = "nf-drop flex aspect-square w-[5.5rem] shrink-0 items-center justify-center rounded-full border-[0.75rem] sm:w-28 lg:w-32"
  return (
    <div role="img" aria-label="Error 404" className="flex items-center gap-3 sm:gap-4">
      <span className={ring} style={{ borderColor: "#ff3b4d", ["--d" as string]: "0ms" }}>
        <span className="font-display text-5xl font-semibold leading-none sm:text-6xl">4</span>
      </span>
      <span className={ring} style={{ borderColor: "#ffb000", ["--d" as string]: "110ms" }}>
        <span className="aspect-square w-[58%] rounded-full border-[0.55rem] border-foreground" />
      </span>
      <span className={ring} style={{ borderColor: "#3f7bff", ["--d" as string]: "220ms" }}>
        <span className="font-display text-5xl font-semibold leading-none sm:text-6xl">4</span>
      </span>
    </div>
  )
}

/* The controller body: the right-hand side is where the buttons are. */
function PadBody() {
  return (
    <svg viewBox="0 0 600 380" aria-hidden="true" className="absolute inset-0 size-full drop-shadow-[0_30px_40px_rgba(0,0,0,0.3)] dark:drop-shadow-[0_30px_40px_rgba(0,0,0,0.55)]">
      <defs>
        <linearGradient id="nf-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#34343b" />
          <stop offset="1" stopColor="#18181c" />
        </linearGradient>
        <linearGradient id="nf-stick" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3d3d46" />
          <stop offset="1" stopColor="#1d1d22" />
        </linearGradient>
      </defs>
      <path
        d="M120 60C60 60 20 130 10 230C2 300 20 350 60 350C100 350 130 300 165 250C180 232 200 225 225 225L375 225C400 225 420 232 435 250C470 300 500 350 540 350C580 350 598 300 590 230C580 130 540 60 480 60C440 60 420 78 380 78L220 78C180 78 160 60 120 60Z"
        fill="url(#nf-body)"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="1.5"
      />
      {/* touchpad and the centre button */}
      <rect x="248" y="104" width="104" height="54" rx="14" fill="#101013" stroke="rgba(255,255,255,0.07)" />
      <circle cx="300" cy="196" r="8" fill="#101013" stroke="rgba(255,255,255,0.1)" />
      {/* D-pad */}
      <g fill="#0e0e11" stroke="rgba(255,255,255,0.12)">
        <rect x="128" y="129" width="44" height="22" rx="5" />
        <rect x="139" y="118" width="22" height="44" rx="5" />
      </g>
      {/* the two sticks */}
      {[215, 385].map((x) => (
        <g key={x}>
          <circle cx={x} cy="262" r="37" fill="#0e0e11" stroke="rgba(255,255,255,0.08)" />
          <circle cx={x} cy="262" r="27" fill="url(#nf-stick)" stroke="rgba(255,255,255,0.14)" />
          <circle cx={x} cy="262" r="15" fill="none" stroke="rgba(255,255,255,0.08)" />
        </g>
      ))}
    </svg>
  )
}

export function NotFoundScene({ title, text }: { title: string; text: string }) {
  const router = useRouter()
  const [hot, setHot] = React.useState<Kind | null>(null)

  /* Back leaves the site if this page was the first one opened, so fall back to the home page then. */
  const run = (pad: Pad) => {
    if (pad.href) router.push(pad.href)
    else if (window.history.length > 1) router.back()
    else router.push("/")
  }

  return (
    <div className="relative isolate min-h-svh overflow-hidden bg-background text-foreground">
      {/* The stage: a hairline grid and two diagonals, like a level editor. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-100"
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in oklab, currentColor 8%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, currentColor 8%, transparent) 1px, transparent 1px)",
          backgroundSize: "clamp(120px, 16vw, 240px) clamp(120px, 16vw, 240px)",
          backgroundPosition: "center",
        }}
      />
      <svg aria-hidden="true" className="absolute inset-0 -z-10 size-full" preserveAspectRatio="none" viewBox="0 0 100 100">
        <line x1="0" y1="0" x2="100" y2="100" stroke="currentColor" strokeOpacity="0.07" strokeWidth="0.15" vectorEffect="non-scaling-stroke" />
        <line x1="100" y1="0" x2="0" y2="100" stroke="currentColor" strokeOpacity="0.07" strokeWidth="0.15" vectorEffect="non-scaling-stroke" />
      </svg>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_70%_60%,rgba(63,123,255,0.10),transparent_60%)]" />

      <div className="mx-auto flex min-h-svh max-w-6xl flex-col px-5 py-6 sm:px-8">
        <header>
          <Link
            href="/"
            className="inline-block rounded-md font-display text-lg font-medium tracking-tight outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            {brand.name}
          </Link>
        </header>

        <main className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-6">
          <div className="grid gap-8">
            <Digits />
            <div className="grid max-w-md gap-3">
              <h1 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">{title}</h1>
              <p className="text-base leading-relaxed text-muted-foreground">{text}</p>
            </div>

            {/* The prompts: what each button does, as a game would show them. */}
            <nav aria-label="Where to go" className="grid max-w-md grid-cols-2 gap-2.5">
              {pads.map((pad) => {
                const body = (
                  <>
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-full border-[3px]"
                      style={{ borderColor: pad.color }}
                    >
                      <Symbol kind={pad.kind} className="size-4" />
                    </span>
                    <span>{pad.label}</span>
                  </>
                )
                const className = cn(
                  "flex min-h-12 items-center gap-3 rounded-full border border-foreground/15 px-3 pr-4 text-left text-sm font-medium outline-none transition-colors",
                  "hover:bg-foreground/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  hot === pad.kind && "bg-foreground/10"
                )
                const events = {
                  onPointerEnter: () => setHot(pad.kind),
                  onPointerLeave: () => setHot(null),
                  onFocus: () => setHot(pad.kind),
                  onBlur: () => setHot(null),
                }
                return pad.href ? (
                  <Link key={pad.kind} href={pad.href} className={className} {...events}>
                    {body}
                  </Link>
                ) : (
                  <button key={pad.kind} type="button" onClick={() => run(pad)} className={className} {...events}>
                    {body}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* The controller, with the four buttons on the right. */}
          <div className="nf-float relative mx-auto aspect-[600/380] w-full max-w-[34rem] lg:max-w-none">
            <PadBody />
            {pads.map((pad) => {
              const [x, y] = pad.at
              const lit = hot === pad.kind
              return (
                <button
                  key={pad.kind}
                  type="button"
                  tabIndex={-1}
                  aria-hidden="true"
                  onClick={() => run(pad)}
                  onPointerEnter={() => setHot(pad.kind)}
                  onPointerLeave={() => setHot(null)}
                  className={cn(
                    "absolute flex aspect-square -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 bg-[#0e0e11] text-[#f5f2ec] outline-none transition-[transform,box-shadow] duration-150 sm:border-[6px]",
                    "active:translate-y-[calc(-50%+2px)] active:scale-90",
                    lit && "scale-105"
                  )}
                  style={{
                    left: `${(x / 600) * 100}%`,
                    top: `${(y / 380) * 100}%`,
                    width: `${(64 / 600) * 100}%`,
                    borderColor: pad.color,
                    boxShadow: lit
                      ? `0 0 0 4px color-mix(in oklab, ${pad.color} 25%, transparent), 0 0 32px color-mix(in oklab, ${pad.color} 55%, transparent)`
                      : "0 6px 10px rgba(0,0,0,0.45), inset 0 -4px 6px rgba(0,0,0,0.4)",
                  }}
                >
                  <Symbol kind={pad.kind} className="size-[52%]" />
                </button>
              )
            })}
          </div>
        </main>
      </div>
    </div>
  )
}
