"use client"

import * as React from "react"
import { PencilIcon } from "lucide-react"

import { RenameFormDialog } from "@/components/forms/rename-form-dialog"
import { useFormState } from "@/components/workspace/form-gate"
import { useApi } from "@/lib/api/http"
import type { FormResponse } from "@/lib/api/forms"

/* The form's name in the header. Click it to rename. The name comes from the backend, so until it
   arrives a small placeholder stands in; the rest of the header never waits. */
export function FormTitle({ formId }: { formId: string }) {
  const { loaded, setTitle } = useFormState()
  const api = useApi()
  const [open, setOpen] = React.useState(false)

  if (!loaded) return <span aria-hidden="true" className="h-5 w-36 animate-pulse rounded-md bg-muted sm:w-48" />
  const { form } = loaded

  async function rename(name: string) {
    const res = await api<FormResponse>(`/forms/${formId}`, { method: "PATCH", body: { title: name } })
    setTitle(res.form.title)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Rename form"
        aria-label={`${form.title}. Rename form`}
        className="group/title -mx-1 flex min-w-0 items-center gap-1.5 rounded-md px-1 text-left outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
      >
        <span className="min-w-0 truncate">{form.title}</span>
        <PencilIcon className="size-3.5 shrink-0 text-muted-foreground opacity-60 group-hover/title:opacity-100 max-sm:hidden" aria-hidden="true" />
      </button>
      <RenameFormDialog open={open} onOpenChange={setOpen} currentName={form.title} onSave={rename} />
    </>
  )
}
