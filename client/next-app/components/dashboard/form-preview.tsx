import { backgroundGradient, defaultDesign, parseDesign } from "@/lib/api/mock-design"
import type { FormPreview as Preview } from "@/lib/api/types"

/* The top of the real form, cut off at the bottom: a page in the form's own background colour with the form sitting
   on it. Only shapes and short labels, so a card stays cheap to draw. */
function shapeFor(type: string, options: string[]) {
  if (type === "long_text") return <div className="h-7 rounded-md border bg-background" />
  if (type === "heading" || type === "paragraph" || type === "image") return null
  if (type === "rating" || type === "scale") {
    return (
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="size-3 rounded-full border bg-background" />
        ))}
      </div>
    )
  }
  if (options.length > 0) {
    return (
      <div className="grid gap-1">
        {options.slice(0, 2).map((o, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[0.55rem] text-muted-foreground">
            <span className="size-2.5 shrink-0 rounded-full border bg-background" />
            <span className="truncate">{o}</span>
          </div>
        ))}
      </div>
    )
  }
  return <div className="h-5 rounded-md border bg-background" />
}

function FormPreview({ preview }: { preview?: Preview }) {
  const design = preview?.design ? parseDesign(JSON.stringify(preview.design)) : defaultDesign
  const tint = backgroundGradient(design)
  const accent = design.accent ?? undefined
  const blocks = (preview?.blocks ?? []).filter((b) => b.type !== "divider")

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-muted px-[12%] pt-[9%]"
      style={tint ? { backgroundImage: tint } : undefined}
      aria-hidden="true"
    >
      <div className="grid gap-2 rounded-t-lg border border-b-0 bg-card p-3 shadow-sm">
        <div className="grid gap-0.5">
          <p className="truncate text-xs leading-tight font-semibold text-card-foreground">{preview?.title || "Untitled form"}</p>
          {preview?.description ? <p className="line-clamp-1 text-[0.55rem] text-muted-foreground">{preview.description}</p> : null}
        </div>
        {blocks.length === 0 ? (
          <>
            <div className="h-5 rounded-md border bg-background" />
            <div className="h-5 rounded-md border bg-background" />
          </>
        ) : (
          blocks.map((b) => (
            <div key={b.id} className="grid gap-1">
              {b.label ? (
                <p className="truncate text-[0.6rem] font-medium text-card-foreground">{b.label}</p>
              ) : b.type === "heading" && b.content ? (
                <p className="truncate text-[0.7rem] font-semibold text-card-foreground">{b.content}</p>
              ) : b.type === "paragraph" && b.content ? (
                <p className="line-clamp-1 text-[0.55rem] text-muted-foreground">{b.content}</p>
              ) : null}
              {shapeFor(b.type, b.options)}
            </div>
          ))
        )}
        <div className="h-5 w-16 rounded-md bg-foreground" style={accent ? { backgroundColor: accent } : undefined} />
      </div>
    </div>
  )
}

export { FormPreview }
