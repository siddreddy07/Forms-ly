"use client"

import * as React from "react"
import { CloudIcon } from "lucide-react"
import { toast } from "sonner"

import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle"
import { ConnectStorageDialog } from "@/components/forms/connect-storage-dialog"
import { StorageSkeleton } from "@/components/skeletons/tab-skeletons"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useApi } from "@/lib/api/http"
import type { OwnStorage, StorageStatus } from "@/lib/api/storage"
import { brand } from "@/lib/brand"
import { MAX_UPLOAD_MB } from "@/lib/uploads"

/* Where files people attach to your forms are kept. It applies to all your forms, not just this one. */
export function StorageSettings() {
  const api = useApi()
  const [status, setStatus] = React.useState<StorageStatus | null>(null)
  const [failed, setFailed] = React.useState(false)
  const [attempt, setAttempt] = React.useState(0)
  const [connecting, setConnecting] = React.useState(false)
  const [disconnecting, setDisconnecting] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await api<StorageStatus>("/storage")
        if (!cancelled) setStatus(data)
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api, attempt])

  function connected(own: OwnStorage) {
    setStatus((s) => (s ? { ...s, own } : s))
    toast.success("ImageKit connected")
  }

  async function disconnect() {
    setBusy(true)
    try {
      await api("/storage/imagekit", { method: "DELETE" })
      /* Our free count only matters once you are back on our storage, so ask again. */
      setStatus(null)
      setAttempt((n) => n + 1)
      setDisconnecting(false)
      toast("ImageKit disconnected")
    } catch {
      toast.error("Couldn't disconnect. Try again.")
    } finally {
      setBusy(false)
    }
  }

  if (failed) {
    return (
      <section className="grid gap-3 rounded-xl border bg-card p-5">
        <h3 className="text-base font-medium">File uploads</h3>
        <p className="text-sm text-muted-foreground">Couldn&apos;t load your storage settings. Check your connection and try again.</p>
        <Button
          variant="outline"
          className="w-fit"
          onClick={() => {
            setFailed(false)
            setAttempt((n) => n + 1)
          }}
        >
          Try again
        </Button>
      </section>
    )
  }

  if (!status) return <StorageSkeleton />

  const { own, platform } = status
  const full = platform.used >= platform.limit

  return (
    <section className="grid gap-4 rounded-xl border bg-card p-5">
      <div>
        <h3 className="text-base font-medium">File uploads</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Where files are kept when people attach them to your forms. Each file can be up to {MAX_UPLOAD_MB} MB. This applies to all your forms.
        </p>
      </div>

      {own ? (
        <div className="grid gap-3">
          <div className="flex items-start gap-3 rounded-lg border p-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background">
              <CloudIcon className="size-4 text-muted-foreground" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">Your ImageKit</p>
              <p className="truncate text-sm text-muted-foreground" title={own.urlEndpoint}>
                {own.urlEndpoint}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Uploads go straight to your account, with no limit from us.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setConnecting(true)}>
              Change keys
            </Button>
            <Button variant="ghost" onClick={() => setDisconnecting(true)}>
              Disconnect
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Free storage on {brand.name}</p>
              <p className="text-sm tabular-nums text-muted-foreground">
                {platform.used} of {platform.limit} files
              </p>
            </div>
            <div
              role="progressbar"
              aria-label="Free files used"
              aria-valuemin={0}
              aria-valuemax={platform.limit}
              aria-valuenow={Math.min(platform.used, platform.limit)}
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
            >
              <div
                className={full ? "h-full rounded-full bg-destructive" : "h-full rounded-full bg-foreground"}
                style={{ width: `${platform.limit ? Math.min(100, (platform.used / platform.limit) * 100) : 0}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {!platform.available
                ? "Free storage isn't available right now. Connect your own ImageKit to accept files."
                : full
                  ? "You've used the free files. Connect your own ImageKit to keep accepting uploads."
                  : "A small free allowance to try file uploads. Connect your own ImageKit for no limit."}
            </p>
          </div>
          <Button className="w-fit" variant={full || !platform.available ? "default" : "outline"} onClick={() => setConnecting(true)}>
            Connect your ImageKit
          </Button>
        </div>
      )}

      <ConnectStorageDialog open={connecting} onOpenChange={setConnecting} onConnected={connected} />

      <Dialog open={disconnecting} onOpenChange={(next) => !busy && setDisconnecting(next)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Disconnect ImageKit?</DialogTitle>
            <DialogDescription>
              New uploads will use the free storage on {brand.name} ({platform.limit} files). Files already in your ImageKit account stay there.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" disabled={busy} onClick={() => setDisconnecting(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={busy} onClick={disconnect}>
              {busy && <LoaderCircle animate size={16} className="size-4" aria-hidden="true" />}
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
