"use client"

import Link from "next/link"
import { CopyIcon, ExternalLinkIcon, LockIcon } from "lucide-react"
import { toast } from "sonner"

import { useFormMeta, useOrigin } from "@/components/forms/use-form-meta"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { publishForm, unpublishForm } from "@/lib/api/mock-meta"
import { getFormDocument } from "@/lib/api/mock-schemas"
import { readServerRecord } from "@/lib/api/mock-server"
import { readDraft } from "@/lib/builder/draft"
import { createEmptyForm } from "@/lib/schema"

function CopyField({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success("Copied")
    } catch {
      toast.error("Couldn't copy. Select the text and copy it.")
    }
  }
  return (
    <div className="grid gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex gap-2">
        {multiline ? (
          <textarea readOnly value={value} rows={3} className="min-w-0 flex-1 resize-none rounded-lg border bg-muted/30 p-2.5 font-mono text-xs" />
        ) : (
          <Input readOnly value={value} className="h-10 rounded-lg" />
        )}
        <Button variant="outline" onClick={copy} className="h-10">
          <CopyIcon /> Copy
        </Button>
      </div>
    </div>
  )
}

export function ShareView({ formId }: { formId: string }) {
  const meta = useFormMeta(formId)
  const origin = useOrigin()
  if (!meta) return <div className="mx-auto h-40 max-w-2xl animate-pulse rounded-xl border bg-muted/30" />

  const url = `${origin}/f/${formId}`
  const embed = `<iframe src="${url}" width="100%" height="700" style="border:0"></iframe>`

  function publishNow() {
    if (readDraft(formId)?.dirty) {
      toast.message("You have unsaved changes. Save them in the builder first.")
      return
    }
    const rec = readServerRecord(formId, getFormDocument(formId) ?? createEmptyForm())
    publishForm(formId, rec.doc, rec.version)
    toast.success("Published. Your form is live.")
  }

  if (!meta.published) {
    return (
      <div className="mx-auto grid max-w-2xl gap-4 rounded-xl border p-6">
        <div>
          <h2 className="font-display text-xl font-medium">Publish to get a link</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your form needs to be saved and published before anyone can fill it in.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={publishNow}>Save &amp; publish</Button>
          <Link href={`/forms/${formId}/build`} className={buttonVariants({ variant: "outline" })}>
            Open the builder
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto grid max-w-2xl gap-5 rounded-xl border p-6">
      {meta.access === "private" && (
        <p className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
          <LockIcon className="mt-0.5 size-4 shrink-0" />
          <span>
            This form is private, so the link won&apos;t open for others.{" "}
            <Link href={`/forms/${formId}/settings`} className="underline">
              Change in Settings
            </Link>
          </span>
        </p>
      )}
      <CopyField label="Link" value={url} />
      <Link href={`/f/${formId}`} target="_blank" className={buttonVariants({ variant: "outline", className: "w-fit" })}>
        <ExternalLinkIcon /> Open form
      </Link>
      <CopyField label="Embed on your website" value={embed} multiline />
      <div className="border-t pt-4">
        <Button
          variant="ghost"
          onClick={() => {
            unpublishForm(formId)
            toast("Form unpublished", { action: { label: "Undo", onClick: publishNow } })
          }}
        >
          Unpublish
        </Button>
      </div>
    </div>
  )
}
