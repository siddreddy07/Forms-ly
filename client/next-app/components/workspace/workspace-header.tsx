import { ArrowLeftIcon } from "lucide-react"
import Link from "next/link"

import { HeaderActions, StatusBadge } from "@/components/workspace/header-actions"
import type { FormStatus } from "@/lib/api/types"

function WorkspaceHeader({ formId, title, status }: { formId: string; title: string; status: FormStatus }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-xl lg:border-b-0">
      <div className="mx-auto flex h-14 max-w-[1800px] items-center gap-2 px-3 sm:px-6">
        <Link
          href="/dashboard"
          aria-label="Back to your forms"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <ArrowLeftIcon className="size-4" />
        </Link>
        <h1 className="min-w-0 truncate font-display text-lg font-medium tracking-tight">{title}</h1>
        <StatusBadge formId={formId} fallback={status} />
        <HeaderActions formId={formId} />
      </div>
    </header>
  )
}

export { WorkspaceHeader }
