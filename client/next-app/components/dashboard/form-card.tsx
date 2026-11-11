import { ClockIcon, MessageSquareIcon } from "lucide-react"
import Link from "next/link"

import { FormActionsMenu, type FormActions } from "@/components/dashboard/form-actions-menu"
import { FormPreview } from "@/components/dashboard/form-preview"
import { Badge } from "@/components/ui/badge"
import { timeAgo } from "@/lib/time"
import type { FormSummary } from "@/lib/api/types"

const statusLabel = { draft: "Draft", published: "Published", closed: "Closed" } as const

function FormCard({
  form,
  actions,
}: {
  form: FormSummary
  actions: FormActions
}) {
  const badge = (
    <Badge variant="secondary" className="h-5 rounded-md! px-1.5 text-[0.7rem]">
      {form.archived ? "Archived" : statusLabel[form.status]}
    </Badge>
  )
  return (
    <div className="group relative flex h-[5.25rem] flex-row overflow-hidden rounded-xl border bg-card transition-colors duration-200 focus-within:border-foreground/30 hover:border-foreground/30 @min-[592px]:h-full @min-[592px]:flex-col">
      {/* Phone: a short list row with a small picture on the left. Tablet and desktop: a small card with the picture across the top. */}
      <div className="relative w-24 shrink-0 overflow-hidden border-r @min-[592px]:aspect-[16/9] @min-[592px]:w-auto @min-[592px]:border-r-0 @min-[592px]:border-b">
        {/* Only the top of the form is shown: it is clipped to this box and fades out at the bottom. */}
        <div className="absolute inset-0">
          <FormPreview preview={form.preview} />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-3 py-2 @min-[592px]:justify-start @min-[592px]:gap-1.5 @min-[592px]:p-2.5 lg:p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="min-w-0 truncate font-display text-sm leading-tight font-medium tracking-tight">
            {/* Stretched link: the whole card opens the form, the menu sits above it */}
            <Link
              href={`/forms/${form.id}/build`}
              className="outline-none after:absolute after:inset-0 after:z-0 focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-ring"
            >
              {form.title}
            </Link>
          </h2>
          <FormActionsMenu form={form} actions={actions} />
        </div>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MessageSquareIcon className="size-3.5" aria-hidden="true" />
            <span className="sr-only">Responses:</span>
            {form.responses}
          </span>
          <span className="inline-flex items-center gap-1">
            <ClockIcon className="size-3.5" aria-hidden="true" />
            <span className="sr-only">Edited</span>
            {timeAgo(form.updatedAt)}
          </span>
          <span className="@min-[592px]:hidden">{badge}</span>
        </div>
        <div className="mt-auto hidden @min-[592px]:block">{badge}</div>
      </div>
    </div>
  )
}

export { FormCard }




