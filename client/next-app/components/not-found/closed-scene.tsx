import Link from "next/link"

import { StartLink } from "@/components/auth/start-link"
import { MadeWith } from "@/components/brand/made-with"
import { WarmGlow } from "@/components/ui/warm-glow"
import { brand } from "@/lib/brand"
import { fullDateTime } from "@/lib/time"

/* The page a visitor sees when a form exists but can't be filled in. Same plain background as the 404 page; the form
   itself sits there with its questions blacked out, and a padlock (or a clock, if it just isn't open yet) on top. */

type Variant = "private" | "unpublished" | "closed"

const copy: Record<Variant, { title: string; text: string }> = {
  private: {
    title: "This form is private",
    text: "Put in the 4 digit code the owner gave you to open it. If you don't have one, ask them.",
  },
  unpublished: {
    title: "This form isn't open yet",
    text: "The owner hasn't published it, or has taken it offline. Check back later, or ask them when it opens.",
  },
  closed: {
    title: "This form is closed",
    text: "It is not taking answers any more.",
  },
}

/* The form, with every question blacked out. */
function Sheet() {
  const bars = ["w-3/5", "w-2/5", "w-1/2"]
  return (
    <div
      aria-hidden="true"
      className="nf-float w-full max-w-72 rotate-[-3deg] rounded-2xl border border-black/10 bg-[#f5f2ec] p-5 text-[#101012] shadow-[0_30px_50px_rgba(0,0,0,0.25)] dark:shadow-[0_30px_50px_rgba(0,0,0,0.6)] sm:max-w-80 sm:p-6"
    >
      <div className="nf-redact h-5 w-3/4 rounded-sm bg-[#101012]" style={{ ["--d" as string]: "0ms" }} />
      <div className="mt-2 h-2.5 w-1/2 rounded-sm bg-[#101012]/15" />
      <div className="mt-6 grid gap-5">
        {bars.map((w, i) => (
          <div key={w} className="grid gap-2">
            <div className={`nf-redact h-3 rounded-sm bg-[#101012] ${w}`} style={{ ["--d" as string]: `${(i + 1) * 140}ms` }} />
            <div className="h-9 rounded-lg border-2 border-[#101012]/20" />
          </div>
        ))}
      </div>
      <div className="mt-6 flex items-center gap-3">
        <span className="size-5 rounded-full border-[3px] border-[#3f7bff]" />
        <span className="size-5 rounded-full border-[3px] border-[#ff3b4d]" />
        <span className="size-5 rounded-full border-[3px] border-[#2fd08c]" />
        <div className="ml-auto h-9 w-24 rounded-full bg-[#101012]/85" />
      </div>
    </div>
  )
}

function Padlock() {
  return (
    <svg viewBox="0 0 120 150" aria-hidden="true" className="absolute -bottom-6 -right-2 w-32 drop-shadow-[0_18px_22px_rgba(0,0,0,0.55)] sm:-right-6 sm:w-40">
      <path className="nf-shackle" d="M32 66V44a28 28 0 0 1 56 0v22" fill="none" stroke="#9a98a0" strokeWidth="13" strokeLinecap="round" />
      <rect x="10" y="62" width="100" height="80" rx="18" fill="#ffb000" />
      <rect x="10" y="62" width="100" height="80" rx="18" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="2" />
      <circle cx="60" cy="96" r="9" fill="#101012" />
      <path d="M56 100h8l3 22H53Z" fill="#101012" />
    </svg>
  )
}

function Clock() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" className="absolute -bottom-6 -right-2 w-32 drop-shadow-[0_18px_22px_rgba(0,0,0,0.55)] sm:-right-6 sm:w-40">
      <circle cx="60" cy="60" r="52" fill="#3f7bff" />
      <circle cx="60" cy="60" r="40" fill="#f5f2ec" />
      <path className="nf-hand" d="M60 60V30" stroke="#101012" strokeWidth="7" strokeLinecap="round" />
      <path d="M60 60 82 68" stroke="#101012" strokeWidth="7" strokeLinecap="round" />
      <circle cx="60" cy="60" r="5" fill="#ff3b4d" />
    </svg>
  )
}

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
  const { title } = copy[variant]
  const when = closesAt ? fullDateTime(closesAt) : ""
  const text =
    variant !== "closed"
      ? copy[variant].text
      : reason === "limit"
        ? "It has reached the most responses it can take."
        : when
          ? `It stopped taking answers on ${when}.`
          : copy.closed.text
  return (
    <div className="relative isolate min-h-svh overflow-hidden bg-background text-foreground">
      <WarmGlow />

      <div className="mx-auto flex min-h-svh max-w-5xl flex-col px-5 py-6 sm:px-8">
        <header>
          <Link href="/" className="inline-block rounded-md font-display text-lg font-medium tracking-tight outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
            {brand.name}
          </Link>
        </header>

        <main className="grid flex-1 items-center gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
          <div className="grid max-w-md gap-4 max-lg:order-2">
            <h1 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">{title}</h1>
            <p className="text-base leading-relaxed text-muted-foreground">{text}</p>
            {children}
            <div className="flex flex-wrap gap-2.5 pt-2">
              <StartLink
                className="inline-flex min-h-11 items-center rounded-full bg-foreground px-5 text-sm font-medium text-background outline-none transition-colors hover:bg-foreground/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                signedInChildren="Go to your forms"
              >
                Make your own form
              </StartLink>
              <Link
                href="/"
                className="inline-flex min-h-11 items-center rounded-full border border-foreground/15 px-5 text-sm font-medium outline-none transition-colors hover:bg-foreground/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Go home
              </Link>
            </div>
          </div>

          <div className="relative mx-auto flex w-full max-w-sm justify-center pb-8 max-lg:order-1">
            <Sheet />
            {variant === "private" ? <Padlock /> : <Clock />}
          </div>
        </main>

        <footer className="flex justify-center pb-2">
          <MadeWith />
        </footer>
      </div>
    </div>
  )
}
