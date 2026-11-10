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
  return (
    <div className="group relative flex h-[6.75rem] flex-row overflow-hidden rounded-xl border bg-card transition-colors duration-200 focus-within:border-foreground/30 hover:border-foreground/30 sm:h-full sm:flex-col">
      <div className="w-24 shrink-0 sm:aspect-[16/10] sm:w-auto">
        <FormPreview preview={form.preview} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3 sm:h-28 sm:flex-none sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="min-w-0 truncate font-display text-base leading-tight font-medium tracking-tight sm:text-lg">
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
        <div className="flex items-center gap-x-3 overflow-hidden text-xs whitespace-nowrap text-muted-foreground">
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
        </div>
        <div className="mt-auto">
          <Badge variant="secondary" className="rounded-md!">
            {form.archived ? "Archived" : statusLabel[form.status]}
          </Badge>
        </div>
      </div>
    </div>
  )
}

export { FormCard }




