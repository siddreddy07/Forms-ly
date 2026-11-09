import { ArchiveIcon, FileTextIcon, FolderOpenIcon } from "lucide-react"

import { NewFormDialog } from "@/components/dashboard/new-form-dialog"

type Props = {
  kind: "none" | "folder" | "archived"
  folder?: string
  onCreate: (input: { title: string; templateId: string }) => void
}

function EmptyState({ kind, folder, onCreate }: Props) {
  const Icon = kind === "archived" ? ArchiveIcon : kind === "folder" ? FolderOpenIcon : FileTextIcon
  const title =
    kind === "none" ? "No forms yet" : kind === "folder" ? `Nothing in ${folder}` : "No archived forms"
  const hint =
    kind === "none"
      ? "Pick a template, edit it, share the link."
      : kind === "folder"
        ? "Move a form here from its menu, or create one."
        : "Forms you archive show up here."

  return (
    <div className="mx-auto mt-12 flex max-w-xs flex-col items-center text-center">
      <span className="inline-flex size-12 items-center justify-center rounded-xl border bg-card">
        <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
      </span>
      <h2 className="mt-4 font-display text-xl font-medium tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      {kind !== "archived" && (
        <div className="mt-5">
          <NewFormDialog onCreate={onCreate} />
        </div>
      )}
    </div>
  )
}

export { EmptyState }
