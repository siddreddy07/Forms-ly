"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"

import { useFormMeta } from "@/components/forms/use-form-meta"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { publishForm } from "@/lib/api/mock-meta"
import { getFormDocument } from "@/lib/api/mock-schemas"
import { readServerRecord } from "@/lib/api/mock-server"
import { readDraft } from "@/lib/builder/draft"
import { createEmptyForm } from "@/lib/schema"
import type { FormStatus } from "@/lib/api/types"

export function StatusBadge({ formId, fallback }: { formId: string; fallback: FormStatus }) {
  const meta = useFormMeta(formId)
  const label = !meta ? (fallback === "published" ? "Published" : "Draft") : !meta.published ? "Draft" : meta.access === "private" ? "Private" : "Published"
  return (
    <Badge variant="secondary" className="shrink-0 rounded-md!">
      {label}
    </Badge>
  )
}

export function HeaderActions({ formId }: { formId: string }) {
  const meta = useFormMeta(formId)
  const path = usePathname()
  const router = useRouter()
  const onBuild = path.endsWith("/build")

  function publish() {
    if (onBuild) {
      window.dispatchEvent(new Event("builder:publish"))
      return
    }
    const fallback = getFormDocument(formId) ?? createEmptyForm()
    if (readDraft(formId)?.dirty) {
      toast.message("You have unsaved changes. Save them in the builder first.")
      router.push(`/forms/${formId}/build`)
      return
    }
    const rec = readServerRecord(formId, fallback)
    publishForm(formId, rec.doc, rec.version)
    toast.success("Published. Your form is live.")
  }

  return (
    <div className="ml-auto hidden items-center gap-2 lg:flex">
      <Link href={`/f/${formId}?preview=1`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
        Preview
      </Link>
      {!onBuild && (
        <button type="button" onClick={publish} disabled={!meta || meta.published} className={buttonVariants()}>
          {meta?.published ? "Published" : "Save & publish"}
        </button>
      )}
    </div>
  )
}
