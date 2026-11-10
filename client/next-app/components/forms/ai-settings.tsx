"use client"

import * as React from "react"
import { ChevronDownIcon, ExternalLinkIcon } from "lucide-react"
import { toast } from "sonner"

import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle"
import { ProviderIcon } from "@/components/brand/provider-icon"
import { SettingRow } from "@/components/forms/setting-row"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import type { AiConnection, AiProviderId, AiStatus } from "@/lib/api/ai"
import { ApiError, useApi } from "@/lib/api/http"

/* The closed look of the company dropdown: it reads like the text field next to it. */
const triggerClass =
  "flex h-9 w-full items-center justify-between gap-2 rounded-lg border bg-background px-2.5 text-left text-sm outline-none transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring aria-expanded:bg-muted/50 disabled:pointer-events-none disabled:opacity-50"

/* The AI company and key to use for AI features. It belongs to you, not to one form. The key is tried with the company
   before it is saved, kept encrypted, and never shown again. The model is picked by the server. */
export function AiSettings() {
  const api = useApi()
  const [status, setStatus] = React.useState<AiStatus | null>(null)
  const [failed, setFailed] = React.useState(false)
  const [attempt, setAttempt] = React.useState(0)
  const [editing, setEditing] = React.useState(false)
  const [removing, setRemoving] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  const [provider, setProvider] = React.useState<AiProviderId>("openai")
  const [apiKey, setApiKey] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await api<AiStatus>("/ai")
        if (cancelled) return
        setStatus(data)
        setProvider(data.connection?.provider ?? data.providers[0]?.id ?? "openai")
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [api, attempt])

  if (failed) {
    return (
      <SettingRow title="AI" hint="Couldn't load this. Check your connection.">
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
        <Skeleton className="h-4 w-10" />
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-9 w-full rounded-lg" />
      </section>
    )
  }

  const { providers, connection } = status
  const info = providers.find((p) => p.id === provider)
  const saved = connection ? providers.find((p) => p.id === connection.provider) : undefined
  const showForm = !connection || editing

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (busy || !apiKey.trim()) return
    setBusy(true)
    setError(null)
    try {
      const res = await api<{ connection: AiConnection }>("/ai", { method: "PUT", body: { provider, apiKey: apiKey.trim() } })
      setStatus((s) => (s ? { ...s, connection: res.connection } : s))
      setApiKey("")
      setEditing(false)
      toast.success("AI key saved")
    } catch (err) {
      const body = err instanceof ApiError ? (err.body as { error?: string } | null) : null
      setError(body?.error ?? "Couldn't save. Check your connection and try again.")
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    try {
      await api("/ai", { method: "DELETE" })
      setStatus((s) => (s ? { ...s, connection: null } : s))
      setRemoving(false)
      setEditing(false)
      setApiKey("")
      toast("AI key removed")
    } catch {
      toast.error("Couldn't remove it. Try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <SettingRow title="AI" hint="Use your own key. It's saved encrypted and never shown again.">
      {connection && !editing && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <ProviderIcon id={connection.provider} className="size-5" />
            <span className="truncate text-sm font-medium">{saved?.label ?? connection.provider}</span>
            <span className="font-mono text-xs text-muted-foreground">{connection.keyHint}</span>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              Change
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setRemoving(true)}>
              Remove
            </Button>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={save} className="grid gap-2" noValidate>
          <div className="grid gap-2 sm:grid-cols-[11rem_1fr_auto]">
            <DropdownMenu>
              <DropdownMenuTrigger aria-label="AI company" disabled={busy} className={triggerClass}>
                <span className="flex min-w-0 items-center gap-2">
                  <ProviderIcon id={provider} className="size-4" />
                  <span className="truncate">{info?.label}</span>
                </span>
                <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-48">
                <DropdownMenuRadioGroup
                  value={provider}
                  onValueChange={(v) => {
                    setProvider(v as AiProviderId)
                    setApiKey("")
                    setError(null)
                  }}
                >
                  {providers.map((p) => (
                    <DropdownMenuRadioItem key={p.id} value={p.id}>
                      <ProviderIcon id={p.id} className="size-4" />
                      {p.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <Input
              aria-label={`${info?.label ?? "AI"} API key`}
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="Paste your API key"
              className="h-9 font-mono"
              disabled={busy}
            />

            <div className="flex gap-2">
              <Button type="submit" size="sm" className="h-9 max-sm:flex-1" disabled={busy || !apiKey.trim()}>
                {busy && <LoaderCircle animate size={16} className="size-4" aria-hidden="true" />}
                {busy ? "Testing" : "Save"}
              </Button>
              {connection && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9"
                  disabled={busy}
                  onClick={() => {
                    setEditing(false)
                    setError(null)
                    setApiKey("")
                    setProvider(connection.provider)
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>

          {error ? (
            <p role="alert" className="text-xs text-destructive sm:text-[0.8rem]">
              {error}
            </p>
          ) : (
            info && (
              <a
                href={info.keyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Get a key from {info.label}
                <ExternalLinkIcon className="size-3" aria-hidden="true" />
              </a>
            )
          )}
        </form>
      )}

      <Dialog open={removing} onOpenChange={(next) => !busy && setRemoving(next)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove your AI key?</DialogTitle>
            <DialogDescription>AI features stop working until you add a key again. Nothing else changes.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" disabled={busy} onClick={() => setRemoving(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={busy} onClick={remove}>
              {busy && <LoaderCircle animate size={16} className="size-4" aria-hidden="true" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingRow>
  )
}
