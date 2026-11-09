import Link from "next/link"

import { brand } from "@/lib/brand"
import { cn } from "@/lib/utils"

/* PLACEHOLDER mark: swap this file when the real logo exists. */
function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("size-6", className)}
      fill="currentColor"
    >
      <rect x="3" y="3" width="18" height="6" rx="3" />
      <rect x="3" y="11" width="12" height="4" rx="2" />
      <rect x="3" y="17" width="18" height="4" rx="2" />
    </svg>
  )
}

function Logo({
  className,
  showName = true,
}: {
  className?: string
  showName?: boolean
}) {
  return (
    <Link
      href="/"
      aria-label={`${brand.name} home`}
      className={cn(
        "inline-flex items-center gap-2 rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring",
        className
      )}
    >
      <LogoMark />
      {showName && (
        <span className="font-display text-lg font-semibold tracking-tight">
          {brand.name}
        </span>
      )}
    </Link>
  )
}

export { Logo, LogoMark }
