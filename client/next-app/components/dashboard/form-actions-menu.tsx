"use client"

import * as React from "react"

import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  CheckIcon,
  CopyIcon,
  FolderIcon,
  MoreHorizontalIcon,
  PencilIcon,
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
import { RenameFormDialog } from "@/components/forms/rename-form-dialog"
import type { FormSummary } from "@/lib/api/types"

export type FormActions = {
  onRename: (id: string, name: string) => Promise<void>
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
  const [renaming, setRenaming] = React.useState(false)
  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Actions for ${form.title}`}
        className="relative z-10 -mt-1 -mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-expanded:bg-muted"
      >
        <MoreHorizontalIcon className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuItem onClick={() => setRenaming(true)}>
          <PencilIcon /> Rename
        </DropdownMenuItem>
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
    <RenameFormDialog open={renaming} onOpenChange={setRenaming} currentName={form.title} onSave={(name) => actions.onRename(form.id, name)} />
    </>
  )
}

export { FormActionsMenu }
