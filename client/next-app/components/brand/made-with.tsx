import { LogoMark } from "@/components/brand/logo"
import { brand } from "@/lib/brand"
import { cn } from "@/lib/utils"

/* The "Made with Formly" badge shown under public forms: a small pill with the mark, linking to the home page.
   It takes the form's own colours, so it sits quietly on any background. */
export function MadeWith({ className }: { className?: string }) {
  return (
    <a
      href="/"
      target="_blank"
      rel="noopener"
      className={cn(
        "group inline-flex items-center gap-2 rounded-full border bg-card/80 py-1.5 pr-3.5 pl-2 text-xs text-muted-foreground shadow-xs backdrop-blur-sm outline-none transition-colors",
        "hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        className
      )}
    >
      <span className="flex size-5 items-center justify-center rounded-full bg-foreground text-background transition-transform duration-300 group-hover:rotate-[-12deg]">
        <LogoMark className="size-3" />
      </span>
      <span>
        Made with <span className="font-display font-medium text-foreground">{brand.name}</span>
      </span>
    </a>
  )
}
