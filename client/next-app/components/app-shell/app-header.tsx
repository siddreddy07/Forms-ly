import Link from "next/link"

import { Logo } from "@/components/brand/logo"

function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav aria-label="Account" className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="font-medium">Forms</Link>
          <span
            aria-label="Signed in as Mara Okafor"
            className="inline-flex size-8 items-center justify-center rounded-full bg-foreground text-xs font-medium text-background"
          >
            MO
          </span>
        </nav>
      </div>
    </header>
  )
}

export { AppHeader }
