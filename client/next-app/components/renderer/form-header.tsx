import { ImageIcon } from "lucide-react"

import type { FormHeader } from "@/lib/schema"

/* Banner, title and description shown once above the first step.
   `editing` keeps empty parts visible as placeholders inside the builder. */
export function FormHeaderView({ header, editing = false }: { header?: FormHeader; editing?: boolean }) {
  const { banner, title, description } = header ?? {}
  if (!editing && !banner && !title && !description) return null

  return (
    <div className="mb-6 grid gap-3">
      {banner ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={banner} alt="" className="aspect-[3/1] w-full rounded-lg object-cover" />
      ) : (
        editing && (
          <div className="flex aspect-[3/1] w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed bg-muted/60 text-muted-foreground">
            <ImageIcon className="size-7" aria-hidden="true" />
            <span className="text-xs">Add a banner</span>
          </div>
        )
      )}
      {(title || editing) && (
        <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
          {title || <span className="text-muted-foreground">Form title</span>}
        </h1>
      )}
      {(description || editing) && (
        <p className="text-muted-foreground">{description || "Add a short description of your company or this form."}</p>
      )}
    </div>
  )
}
