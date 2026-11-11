import { cn } from "@/lib/utils"

/* A haze of warm yellow-orange light at the top of the page, like the sky before sunrise. On the home page it opens
   upward from the bottom of the header when the page first appears; every other page gets a smaller, fainter
   version. Put it inside a `relative isolate` wrapper. It is decoration only: it takes no clicks and screen readers
   skip it. */
export function WarmGlow({ size = "soft", className }: { size?: "hero" | "soft"; className?: string }) {
  if (size === "hero") {
    return (
      <div aria-hidden="true" className={cn("warm-sky-hero pointer-events-none absolute inset-x-0 top-0 -z-10 h-[26rem] opacity-95 dark:opacity-65", className)} />
    )
  }
  return <div aria-hidden="true" className={cn("warm-sky pointer-events-none absolute inset-x-0 top-0 -z-10 h-44", className)} />
}
