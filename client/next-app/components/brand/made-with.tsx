import { LogoMark } from "@/components/brand/logo"
import { rainbowButtonVariants } from "@/components/ui/rainbow-button"
import { brand } from "@/lib/brand"
import { cn } from "@/lib/utils"

/* The outline colours the rainbow button cycles through. Instead of a rainbow they are all white and silver, so the
   border (and the faint glow under it) shimmers like polished metal. */
const shine = {
  "--color-1": "oklch(1 0 0)",
  "--color-2": "oklch(0.72 0 0)",
  "--color-3": "oklch(0.97 0 0)",
  "--color-4": "oklch(0.6 0 0)",
  "--color-5": "oklch(0.9 0 0)",
} as React.CSSProperties

/* The "Made with Formly" badge shown under public forms: the Magic UI rainbow button (components/ui/rainbow-button.tsx)
   with a shiny silver outline and a glossy sheen. It is dark in light mode and light in dark mode, and the form's page colour does not
   change it. */
export function MadeWith({ className }: { className?: string }) {
  return (
    <a
      href="/"
      target="_blank"
      rel="noopener"
      style={shine}
      className={cn(rainbowButtonVariants({ size: "sm" }), "h-7 gap-1.5 rounded-full py-0 pr-3 pl-1.5 text-xs text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.4),inset_0_-1px_1px_rgb(0_0_0/0.25)] dark:text-black dark:shadow-[inset_0_1px_0_rgb(255_255_255),inset_0_-1px_1px_rgb(0_0_0/0.15)]", className)}
    >
      {/* Gloss: a bright sheen over the top half, like light on glass. */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-1 top-px h-1/2 rounded-full bg-gradient-to-b from-white/40 to-white/0 dark:from-white/80" />
      <span className="relative flex size-4 items-center justify-center rounded-full bg-white text-black dark:bg-black dark:text-white">
        <LogoMark className="size-3" />
      </span>
      <span className="relative">
        Made with <span className="font-display font-medium">{brand.name}</span>
      </span>
    </a>
  )
}
