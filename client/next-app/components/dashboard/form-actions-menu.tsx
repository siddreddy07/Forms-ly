"use client"

import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  CheckIcon,
  CopyIcon,
  FolderIcon,
  MoreHorizontalIcon,
  Trash2Icon,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { FormSummary } from "@/lib/api/types"

export type FormActions = {
  onDuplicate: (id: string) => void
  onArchive: (id: string) => void
  onDelete: (id: string) => void
  onMove: (id: string, folder: string | undefined) => void
}

function FormActionsMenu({
  form,
  folders,
  actions,
}: {
  form: FormSummary
  folders: string[]
  actions: FormActions
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Actions for ${form.title}`}
        className="relative z-10 -mt-1 -mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-expanded:bg-muted"
      >
        <MoreHorizontalIcon className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuItem onClick={() => actions.onDuplicate(form.id)}>
          <CopyIcon /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <FolderIcon /> Move to
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="min-w-44">
            <DropdownMenuItem onClick={() => actions.onMove(form.id, undefined)}>
              No folder
              {!form.folder && <CheckIcon className="ml-auto" />}
            </DropdownMenuItem>
            {folders.map((f) => (
              <DropdownMenuItem key={f} onClick={() => actions.onMove(form.id, f)}>
                {f}
                {form.folder === f && <CheckIcon className="ml-auto" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onClick={() => actions.onArchive(form.id)}>
          {form.archived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
          {form.archived ? "Restore" : "Archive"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => actions.onDelete(form.id)}>
          <Trash2Icon /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { FormActionsMenu }
