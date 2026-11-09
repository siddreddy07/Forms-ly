import type { LucideIcon } from "lucide-react"

function SectionPlaceholder({
  icon: Icon,
  title,
  hint,
}: {
  icon: LucideIcon
  title: string
  hint: string
}) {
  return (
    <div className="mx-auto flex min-h-[60svh] max-w-sm flex-col items-center justify-center px-6 text-center">
      <span className="inline-flex size-12 items-center justify-center rounded-xl border bg-card">
        <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
      </span>
      <h2 className="mt-4 font-display text-2xl font-medium tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
    </div>
  )
}

export { SectionPlaceholder }
