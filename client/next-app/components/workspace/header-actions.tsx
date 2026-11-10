"use client"

import Link from "next/link"
import { EyeIcon, FileTextIcon, GlobeIcon, LockIcon } from "lucide-react"

import { useFormMeta } from "@/components/forms/use-form-meta"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import type { FormStatus } from "@/lib/api/types"

export function StatusBadge({ formId, fallback }: { formId: string; fallback: FormStatus }) {
  const meta = useFormMeta(formId)
  const label = !meta ? (fallback === "published" ? "Published" : "Draft") : !meta.published ? "Draft" : meta.access === "private" ? "Private" : "Published"
  const Icon = label === "Draft" ? FileTextIcon : label === "Private" ? LockIcon : GlobeIcon
  /* On phones only the icon shows (the word is still there for screen readers). */
  return (
    <Badge variant="secondary" title={label} className="shrink-0 rounded-md! max-sm:px-1.5">
      <Icon className="size-3.5 sm:hidden" aria-hidden="true" />
      <span className="max-sm:sr-only">{label}</span>
    </Badge>
  )
}

export function HeaderActions({ formId }: { formId: string }) {
  const previewHref = `/f/${formId}?preview=1`

  /* Publishing lives on the Share tab, so the header only has Preview. */
  return (
    <div className="ml-auto flex shrink-0 items-center">
      <Link
        href={previewHref}
        target="_blank"
        rel="noreferrer"
        aria-label="Preview"
        title="Preview"
        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring lg:hidden"
      >
        <EyeIcon className="size-4" />
      </Link>
      <Link href={previewHref} target="_blank" rel="noreferrer" className={`${buttonVariants({ variant: "outline" })} max-lg:hidden`}>
        Preview
      </Link>
    </div>
  )
}
