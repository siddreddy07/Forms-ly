"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export const MAX_FORM_NAME = 200

/* Asks for a new name. The name can't be empty. onSave throws (or rejects) if saving fails. */
export function RenameFormDialog({
  open,
  onOpenChange,
  currentName,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentName: string
  onSave: (name: string) => Promise<void>
}) {
  const [name, setName] = React.useState(currentName)
  const [busy, setBusy] = React.useState(false)
  const [failed, setFailed] = React.useState(false)

  /* Start from the current name every time the dialog opens. */
  React.useEffect(() => {
    if (open) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setName(currentName)
      setFailed(false)
    }
  }, [open, currentName])

  const trimmed = name.trim()
  const canSave = trimmed.length > 0 && trimmed !== currentName && !busy

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave) return
    setBusy(true)
    setFailed(false)
    try {
      await onSave(trimmed)
      onOpenChange(false)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Rename form</DialogTitle>
            <DialogDescription>The name only you see, in your list of forms. It doesn&apos;t change the heading people see on the form.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 px-6 pb-4">
            <Label htmlFor="rename-form">Name</Label>
            <Input
              id="rename-form"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_FORM_NAME}
              required
              autoFocus
              aria-invalid={trimmed.length === 0}
              className="h-10 rounded-lg"
            />
            {trimmed.length === 0 && <p className="text-xs text-destructive">A form needs a name.</p>}
            {failed && <p className="text-xs text-destructive">Couldn&apos;t rename. Check your connection and try again.</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSave}>
              {busy ? "Saving" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
