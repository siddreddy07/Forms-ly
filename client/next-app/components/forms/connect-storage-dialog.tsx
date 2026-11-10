"use client"

import * as React from "react"

import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiError, useApi } from "@/lib/api/http"
import type { OwnStorage } from "@/lib/api/storage"

type FieldErrors = { urlEndpoint?: string[]; publicKey?: string[]; privateKey?: string[] }

/* Connects your own ImageKit account. The server tries a real upload with these keys before saving them,
   and keeps the private key encrypted. It is never shown again. */
export function ConnectStorageDialog({
  open,
  onOpenChange,
  onConnected,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConnected: (own: OwnStorage) => void
}) {
  const api = useApi()
  const [urlEndpoint, setUrlEndpoint] = React.useState("")
  const [publicKey, setPublicKey] = React.useState("")
  const [privateKey, setPrivateKey] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string>()
  const [fields, setFields] = React.useState<FieldErrors>({})

  /* Start empty every time it opens, so a private key is never left sitting in the page. */
  React.useEffect(() => {
    if (open) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setUrlEndpoint("")
      setPublicKey("")
      setPrivateKey("")
      setError(undefined)
      setFields({})
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open])

  const canSubmit = urlEndpoint.trim() !== "" && publicKey.trim() !== "" && privateKey.trim() !== "" && !busy

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    setError(undefined)
    setFields({})
    try {
      const res = await api<{ own: OwnStorage }>("/storage/imagekit", {
        method: "PUT",
        body: { urlEndpoint, publicKey, privateKey },
      })
      setPrivateKey("")
      onConnected(res.own)
      onOpenChange(false)
    } catch (err) {
      if (err instanceof ApiError) {
        const body = (err.body ?? {}) as { error?: string; fields?: FieldErrors }
        if (err.status === 429) setError("Too many attempts. Wait a minute and try again.")
        else setError(body.error ?? "Couldn't connect. Try again.")
        if (body.fields) setFields(body.fields)
      } else {
        setError("Couldn't reach the server. Check your connection and try again.")
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4" autoComplete="off">
          <DialogHeader>
            <DialogTitle>Connect your ImageKit</DialogTitle>
            <DialogDescription>
              Files people upload to your forms go to your own ImageKit account. Find these three values in ImageKit under Developer options.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 px-6 pb-4">
            <div className="grid gap-1.5">
              <Label htmlFor="ik-url">URL endpoint</Label>
              <Input
                id="ik-url"
                value={urlEndpoint}
                onChange={(e) => setUrlEndpoint(e.target.value)}
                placeholder="https://ik.imagekit.io/your_id"
                inputMode="url"
                spellCheck={false}
                autoFocus
                aria-invalid={!!fields.urlEndpoint}
                className="h-10 rounded-lg"
              />
              {fields.urlEndpoint?.[0] && <p className="text-xs text-destructive">{fields.urlEndpoint[0]}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ik-public">Public key</Label>
              <Input
                id="ik-public"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                placeholder="public_..."
                spellCheck={false}
                className="h-10 rounded-lg"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ik-private">Private key</Label>
              <Input
                id="ik-private"
                type="password"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                placeholder="private_..."
                spellCheck={false}
                autoComplete="new-password"
                className="h-10 rounded-lg"
              />
              <p className="text-xs text-muted-foreground">It is stored encrypted and is never shown again.</p>
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {busy && <LoaderCircle animate size={16} className="size-4" aria-hidden="true" />}
              {busy ? "Checking your keys" : "Connect"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
