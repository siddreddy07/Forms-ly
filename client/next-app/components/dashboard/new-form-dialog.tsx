"use client"

import * as React from "react"
import {
  BriefcaseIcon,
  CalendarDaysIcon,
  CheckIcon,
  ClipboardListIcon,
  FileIcon,
  MessageSquareTextIcon,
  PlusIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { templates } from "@/lib/templates"
import { cn } from "@/lib/utils"

const templateIcons: Record<string, LucideIcon> = {
  blank: FileIcon,
  "client-intake": UsersIcon,
  "project-brief": ClipboardListIcon,
  "job-application": BriefcaseIcon,
  "event-signup": CalendarDaysIcon,
  "website-feedback": MessageSquareTextIcon,
}

function NewFormDialog({
  onCreate,
  compact = false,
}: {
  onCreate: (input: { title: string; templateId: string }) => void
  compact?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [templateId, setTemplateId] = React.useState("blank")
  const [title, setTitle] = React.useState("")

  const selected = templates.find((t) => t.id === templateId)!

  const trimmed = title.trim()
  const [touched, setTouched] = React.useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!trimmed) return
    onCreate({ title: trimmed, templateId })
    setOpen(false)
    setTitle("")
    setTouched(false)
    setTemplateId("blank")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          compact ? (
            <Button size="icon-lg" aria-label="New form" className="size-9" />
          ) : (
            <Button size="lg" className="h-9 px-3.5 text-[0.85rem] lg:h-8 lg:px-3 lg:text-[0.8rem]" />
          )
        }
      >
        <PlusIcon data-icon={compact ? undefined : "inline-start"} />
        {!compact && "New form"}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="p-5 pb-3">
            <DialogTitle className="text-xl">New form</DialogTitle>
            <DialogDescription className="sr-only">Pick a template to start from.</DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
            <div className="grid gap-2 pb-5">
              <Label htmlFor="new-form-title">Name</Label>
              <Input
                id="new-form-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`For example, ${selected.name}`}
                maxLength={200}
                required
                aria-invalid={touched && !trimmed}
                aria-describedby="new-form-title-error"
                className="h-10 rounded-lg"
              />
              {touched && !trimmed && (
                <p id="new-form-title-error" role="alert" className="text-xs text-destructive">
                  Give your form a name to continue.
                </p>
              )}
            </div>

            <fieldset>
              <legend className="mb-2 text-xs font-medium text-muted-foreground">Template</legend>
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
                {templates.map((t) => {
                  const active = t.id === templateId
                  return (
                    <label
                      key={t.id}
                      className={cn(
                        "relative flex cursor-pointer flex-col gap-2 rounded-xl border bg-card p-3 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring",
                        active ? "border-foreground" : "hover:bg-muted"
                      )}
                    >
                      <input
                        type="radio"
                        name="template"
                        value={t.id}
                        checked={active}
                        onChange={() => setTemplateId(t.id)}
                        className="sr-only"
                      />
                      {(() => {
                        const Icon = templateIcons[t.id] ?? FileIcon
                        return <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
                      })()}
                      <span className="text-sm leading-tight font-medium">{t.name}</span>
                      <span className="hidden text-xs text-muted-foreground sm:block">{t.description}</span>
                      {active && (
                        <CheckIcon className="absolute top-3 right-3 size-4" aria-hidden="true" />
                      )}
                    </label>
                  )
                })}
              </div>
            </fieldset>
          </div>

          <DialogFooter>
            <Button type="submit" size="lg" disabled={!trimmed && touched}>Create form</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { NewFormDialog }





