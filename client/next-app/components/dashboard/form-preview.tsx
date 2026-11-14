import { backgroundCss, defaultDesign, parseDesign } from "@/lib/api/mock-design"
import type { FormPreview as Preview } from "@/lib/api/types"

/* The top of the real form, cut off at the bottom: a page in the form's own background colour with the form sitting
   on it. A light sketch: tiny labels over thin bars, so a card stays cheap to draw and easy to read. */
const bar = "h-3 rounded-[3px] border bg-background"

function shapeFor(type: string, options: string[]) {
  if (type === "long_text") return <div className="h-5 rounded-[3px] border bg-background" />
  if (type === "heading" || type === "paragraph" || type === "image") return null
  if (type === "rating" || type === "scale") {
    return (
      <div className="flex gap-0.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="size-2 rounded-full border bg-background" />
        ))}
      </div>
    )
  }
  if (options.length > 0) {
    return (
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-0.5">
        {options.slice(0, 2).map((o, i) => (
          <div key={i} className="flex items-center gap-1 text-[0.45rem] leading-none text-muted-foreground">
            <span className="size-1.5 shrink-0 rounded-full border bg-background" />
            <span className="truncate">{o}</span>
          </div>
        ))}
      </div>
    )
  }
  return <div className={bar} />
}

function FormPreview({ preview }: { preview?: Preview }) {
  const design = preview?.design ? parseDesign(JSON.stringify(preview.design)) : defaultDesign
  /* The thumbnail's background: plain, with a gradient rising from the bottom in the form's page colour (or the warm
     default). The form sits on it with a little padding and runs off the bottom, so only its top shows. */
  const solid = backgroundCss(design)
  const glow = solid ?? "color-mix(in oklab, var(--warm) 45%, transparent)"
  const tint = `linear-gradient(to top, ${glow} 0%, color-mix(in oklab, ${glow} 40%, transparent) 22%, transparent 48%)`
  const accent = design.accent ?? undefined
  /* Only the first few questions: the card shows just the top of the form. */
  const blocks = (preview?.blocks ?? []).filter((b) => b.type !== "divider").slice(0, 4)

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-muted px-[10%] pt-[9%]"
      style={{ backgroundImage: tint }}
      aria-hidden="true"
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-1.5 rounded-t-md border border-b-0 bg-card p-2 shadow-sm">
        <p className="truncate text-[0.6rem] leading-tight font-semibold text-card-foreground">{preview?.title || "Untitled form"}</p>
        {blocks.length === 0 ? (
          <>
            <div className={bar} />
            <div className={bar} />
          </>
        ) : (
          blocks.map((b) => (
            <div key={b.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-0.5">
              {b.label ? (
                <p className="truncate text-[0.5rem] leading-none font-medium text-muted-foreground">{b.label}</p>
              ) : b.type === "heading" && b.content ? (
                <p className="truncate text-[0.55rem] leading-none font-semibold text-card-foreground">{b.content}</p>
              ) : null}
              {shapeFor(b.type, b.options)}
            </div>
          ))
        )}
        <div className="h-3 w-10 rounded-[3px] bg-foreground" style={accent ? { backgroundColor: accent } : undefined} />
      </div>
    </div>
  )
}

export { FormPreview }
