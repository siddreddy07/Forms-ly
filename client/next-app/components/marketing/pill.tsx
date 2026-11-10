import { cn } from "@/lib/utils"

/* The small label above a heading. The dot is one of the few places the warm colour shows up. */
export function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full bg-muted px-3.5 py-1.5 text-sm font-medium", className)}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--warm)]" />
      {children}
    </span>
  )
}
