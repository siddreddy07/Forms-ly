"use client"

import Link from "next/link"
import { SignUpButton } from "@clerk/nextjs"
import { ArrowUpRightIcon } from "lucide-react"

import { Logo } from "@/components/brand/logo"
import { authLinks, brand, navLinks } from "@/lib/brand"

/* The last call to action, then the footer with the name set huge, cut off at the bottom of the page. */
function CtaFooter() {
  return (
    <footer className="px-4 pb-6 sm:px-6">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[1.5rem] bg-foreground px-5 py-12 text-center text-background sm:rounded-[2rem] sm:px-6 sm:py-24">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[color-mix(in_oklab,var(--warm)_32%,transparent)] to-transparent" />
        <h2 className="marketing-serif relative mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-3 text-4xl sm:text-7xl">
          Set up your first form in minutes
        </h2>
        <div className="relative mt-6 flex justify-center sm:mt-9">
          <SignUpButton mode="modal">
            <button type="button" className="group/cta inline-flex h-12 items-center gap-3 rounded-full bg-background py-1.5 pr-1.5 pl-6 text-base font-medium text-foreground outline-none transition-colors hover:bg-background/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-background">
              Start for free
              <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-b from-[oklch(0.85_0.16_75)] to-[oklch(0.72_0.18_50)] text-[oklch(0.2_0.02_50)]">
                <ArrowUpRightIcon className="size-4 transition-transform duration-300 group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5" />
              </span>
            </button>
          </SignUpButton>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-2 py-8 sm:grid-cols-[1fr_auto] sm:items-start sm:gap-10 sm:py-12">
        <div className="grid max-w-sm gap-4">
          <Logo />
          <p className="marketing-serif text-2xl sm:text-3xl">{brand.tagline}</p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-14 gap-y-2 text-sm">
          {navLinks
            .filter((l) => l.href.startsWith("/#"))
            .map((l) => (
              <Link key={l.href} href={l.href} className="inline-flex items-center gap-1 rounded text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                {l.label}
                <ArrowUpRightIcon className="size-3 text-[oklch(0.7_0.17_55)] dark:text-[var(--warm)]" aria-hidden="true" />
              </Link>
            ))}
          <Link href={authLinks.signIn} className="inline-flex items-center gap-1 rounded text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            Sign in
            <ArrowUpRightIcon className="size-3 text-[oklch(0.7_0.17_55)] dark:text-[var(--warm)]" aria-hidden="true" />
          </Link>
        </nav>
      </div>

      <p aria-hidden="true" className="marketing-serif pointer-events-none mx-auto -mb-[0.28em] max-w-6xl select-none overflow-hidden text-center text-[clamp(5rem,26vw,22rem)] leading-[0.8] text-foreground/[0.07]">
        {brand.name}
      </p>
    </footer>
  )
}

export { CtaFooter }
