import { ClockIcon, FolderIcon, MessageSquareIcon } from "lucide-react"
import Link from "next/link"

import { FormActionsMenu, type FormActions } from "@/components/dashboard/form-actions-menu"
import { Badge } from "@/components/ui/badge"
import { timeAgo } from "@/lib/time"
import type { FormSummary } from "@/lib/api/types"

const statusLabel = { draft: "Draft", published: "Published", closed: "Closed" } as const

function FormCard({
  form,
  folders,
  actions,
}: {
  form: FormSummary
  folders: string[]
  actions: FormActions
}) {
  return (
    <div className="group relative flex h-[6.75rem] flex-row overflow-hidden rounded-xl border bg-card transition-colors duration-200 focus-within:border-foreground/30 hover:border-foreground/30 sm:h-full sm:flex-col">
      {/* Thumbnail placeholder: becomes a scaled live render of the form */}
      <div
        className="flex w-24 shrink-0 flex-col justify-center gap-1.5 bg-muted p-3 sm:aspect-[16/10] sm:w-auto sm:justify-start sm:gap-2 sm:p-5"
        aria-hidden="true"
      >
        <div className="h-2 w-2/5 rounded-full bg-foreground/15" />
        <div className="h-4 rounded-md bg-background sm:h-7 sm:rounded-lg" />
        <div className="h-4 rounded-md bg-background sm:h-7 sm:rounded-lg" />
        <div className="h-4 w-3/5 rounded-md bg-background sm:h-7 sm:rounded-lg" />
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
          <FormActionsMenu form={form} folders={folders} actions={actions} />
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
          {form.folder && (
            <span className="hidden items-center gap-1 sm:inline-flex">
              <FolderIcon className="size-3.5" aria-hidden="true" />
              <span className="sr-only">Folder:</span>
              {form.folder}
            </span>
          )}
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




