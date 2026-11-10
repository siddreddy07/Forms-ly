import { ArchiveIcon, FileTextIcon } from "lucide-react"

import { NewFormDialog } from "@/components/dashboard/new-form-dialog"

type Props = {
  kind: "none" | "archived"
  onCreate: (input: { title: string; templateId: string }) => void
}

function EmptyState({ kind, onCreate }: Props) {
  const Icon = kind === "archived" ? ArchiveIcon : FileTextIcon
  const title =
    kind === "none" ? "No forms yet" : "No archived forms"
  const hint =
    kind === "none"
      ? "Pick a template, edit it, share the link."
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
