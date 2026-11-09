import { GripVerticalIcon, StarIcon } from "lucide-react"

/* PLACEHOLDER: static stand-in for the live builder demo (built in the next step). */
const fields = [
  { label: "Full name", value: "Mara Okafor", type: "Short text" },
  { label: "Which shift suits you?", value: "Weekday mornings", type: "Dropdown" },
  { label: "Why do you want to work here?", value: "I have run a coffee cart for two summers and want to learn the roasting side.", type: "Long text" },
]

function WindowFrame() {
  return (
    <div
      role="img"
      aria-label="Preview of the form builder with a café job application"
      className="overflow-hidden rounded-[1.75rem] border bg-card shadow-[0_30px_80px_-30px_rgb(0_0_0/0.25)]"
    >
      <div className="flex h-11 items-center gap-2 border-b bg-muted/60 px-4">
        <span className="size-3 rounded-full bg-[oklch(0.72_0.15_25)]" />
        <span className="size-3 rounded-full bg-[oklch(0.84_0.14_85)]" />
        <span className="size-3 rounded-full bg-[oklch(0.78_0.15_145)]" />
        <span className="ml-4 text-xs text-muted-foreground">
          Harbour Coffee <span className="mx-1">/</span> Job application
        </span>
      </div>
      <div className="grid min-h-[22rem] grid-cols-1 md:grid-cols-[13rem_1fr_14rem]">
        <aside className="hidden border-r p-4 md:block">
          <p className="mb-3 text-xs font-medium text-muted-foreground">Blocks</p>
          {["Short text", "Long text", "Email", "Dropdown", "Rating", "File upload"].map((b) => (
            <div key={b} className="mb-1.5 flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
              <GripVerticalIcon className="size-3.5 text-muted-foreground" />
              {b}
            </div>
          ))}
        </aside>
        <div className="bg-muted/40 p-4 sm:p-8">
          <div className="mx-auto max-w-lg rounded-2xl border bg-card p-6 text-left">
            <h3 className="font-display text-2xl font-medium tracking-tight">Join the team</h3>
            <p className="mt-1 text-sm text-muted-foreground">Barista, weekend and weekday shifts.</p>
            <div className="mt-6 space-y-5">
              {fields.map((f) => (
                <div key={f.label}>
                  <p className="mb-1.5 text-sm font-medium">{f.label}</p>
                  <div className="rounded-xl border bg-background px-3 py-2.5 text-sm text-foreground/80">{f.value}</div>
                </div>
              ))}
              <div>
                <p className="mb-1.5 text-sm font-medium">How was your last job?</p>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <StarIcon key={i} className={i < 4 ? "size-5 fill-foreground" : "size-5 text-muted-foreground/50"} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <aside className="hidden border-l p-4 md:block">
          <p className="mb-3 text-xs font-medium text-muted-foreground">Properties</p>
          <p className="text-sm font-medium">Long text</p>
          <div className="mt-3 space-y-2 text-xs text-muted-foreground">
            <div className="rounded-lg border bg-background px-3 py-2">Required</div>
            <div className="rounded-lg border bg-background px-3 py-2">Max 400 characters</div>
            <div className="rounded-lg border bg-background px-3 py-2">Full width</div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export { WindowFrame }
