"use client"

import { GlobeIcon, LockIcon } from "lucide-react"

import { useFormMeta } from "@/components/forms/use-form-meta"
import { setAccess, type Access } from "@/lib/api/mock-meta"
import { cn } from "@/lib/utils"

const options: { value: Access; label: string; text: string; icon: typeof GlobeIcon }[] = [
  { value: "public", label: "Public", text: "Anyone with the link can fill it in.", icon: GlobeIcon },
  { value: "private", label: "Private", text: "Nobody can open the link. Only you can preview.", icon: LockIcon },
]

export function SettingsView({ formId }: { formId: string }) {
  const meta = useFormMeta(formId)
  if (!meta) return <div className="mx-auto h-40 max-w-2xl animate-pulse rounded-xl border bg-muted/30" />
  return (
    <section className="mx-auto grid max-w-2xl gap-3 rounded-xl border p-6">
      <div>
        <h2 className="font-display text-xl font-medium">Who can fill it in</h2>
        <p className="mt-1 text-sm text-muted-foreground">{meta.published ? "Your form is published." : "Your form isn't published yet. This applies once it is."}</p>
      </div>
      <div role="radiogroup" aria-label="Visibility" className="grid gap-2 sm:grid-cols-2">
        {options.map(({ value, label, text, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={meta.access === value}
            onClick={() => setAccess(formId, value)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-lg border p-3 text-left outline-none focus-visible:outline-2 focus-visible:outline-ring",
              meta.access === value ? "border-foreground bg-muted/50" : "hover:bg-muted/30"
            )}
          >
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <Icon className="size-4" /> {label}
            </span>
            <span className="text-sm text-muted-foreground">{text}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
