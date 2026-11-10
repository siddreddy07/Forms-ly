"use client"

import * as React from "react"
import { CloudIcon } from "lucide-react"
import { toast } from "sonner"

import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle"
import { ConnectStorageDialog } from "@/components/forms/connect-storage-dialog"
import { SettingRow } from "@/components/forms/setting-row"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
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
      <SettingRow title="File uploads" hint="Couldn't load this. Check your connection.">
        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() => {
            setFailed(false)
            setAttempt((n) => n + 1)
          }}
        >
          Try again
        </Button>
      </SettingRow>
    )
  }

  if (!status) {
    return (
      <section className="grid gap-2.5 p-4" aria-busy="true">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-9 w-full rounded-lg" />
      </section>
    )
  }

  const { own, platform } = status
  const full = platform.used >= platform.limit

  return (
    <SettingRow title="File uploads" hint={`Where files people attach to your forms are kept. Up to ${MAX_UPLOAD_MB} MB each.`}>
      {own ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <CloudIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-medium">Your ImageKit</p>
              <p className="truncate text-xs text-muted-foreground" title={own.urlEndpoint}>
                {own.urlEndpoint}
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => setConnecting(true)}>
              Change
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDisconnecting(true)}>
              Disconnect
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4">
          <div className="grid gap-1.5 rounded-lg border px-3 py-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">Free storage</span>
              <span className="tabular-nums text-muted-foreground">
                {platform.used} of {platform.limit} files
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Free files used"
              aria-valuemin={0}
              aria-valuemax={platform.limit}
              aria-valuenow={Math.min(platform.used, platform.limit)}
              className="h-1 overflow-hidden rounded-full bg-muted"
            >
              <div
                className={full ? "h-full rounded-full bg-destructive" : "h-full rounded-full bg-foreground"}
                style={{ width: `${platform.limit ? Math.min(100, (platform.used / platform.limit) * 100) : 0}%` }}
              />
            </div>
            {(full || !platform.available) && (
              <p className="text-xs text-muted-foreground">
                {!platform.available ? "Free storage isn't available right now." : "Free files used up."} Connect your own ImageKit to keep accepting files.
              </p>
            )}
          </div>
          <Button size="sm" className="h-9" variant={full || !platform.available ? "default" : "outline"} onClick={() => setConnecting(true)}>
            Connect ImageKit
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
    </SettingRow>
  )
}
