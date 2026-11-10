"use client"

import * as React from "react"
import Link from "next/link"
import { CheckIcon, CopyIcon, ExternalLinkIcon, EyeIcon, GlobeIcon, LockIcon } from "lucide-react"
import { toast } from "sonner"

import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle"
import { useFormGate, type PublishResult } from "@/components/workspace/form-gate"
import { Button, buttonVariants } from "@/components/ui/button"
import { PendingLock, hold } from "@/components/ui/pending-lock"
import { readDraft } from "@/lib/builder/draft"
import { timeAgo } from "@/lib/time"
import { cn } from "@/lib/utils"
import { useOrigin } from "@/lib/use-origin"

/* Copies text and shows "Copied" for a moment, so the click visibly did something. */
function useCopy(value: string) {
  const [copied, setCopied] = React.useState(false)
  React.useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1800)
    return () => clearTimeout(t)
  }, [copied])
  const copy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      toast.error("Couldn't copy. Select the text and copy it.")
    }
  }, [value])
  return { copied, copy }
}

function CopyButton({ value, label, variant = "outline" }: { value: string; label: string; variant?: "default" | "outline" | "secondary" }) {
  const { copied, copy } = useCopy(value)
  return (
    <Button variant={variant} onClick={copy} disabled={!value} className="min-w-28">
      {copied ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />}
      {copied ? "Copied" : label}
    </Button>
  )
}

function publishError(result: Extract<PublishResult, { ok: false }>) {
  if (result.reason === "archived") return "Restore this form before publishing it."
  if (result.reason === "conflict") return "This form changed somewhere else. Reload the page and try again."
  return "Couldn't publish. Check your connection and try again."
}

/* What the link will start with, so it makes sense before it exists (the real one ends in random letters). */
function previewSlug(title: string) {
  const base = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "")
  return base || "form"
}

const dateTime = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })

/* Publish, update, unpublish and public/private. All of it lives on the server; this page only asks and shows. */
export function ShareView({ formId }: { formId: string }) {
  const { form, version, publishInfo: info, publish, unpublish, setAccess } = useFormGate()
  const origin = useOrigin()
  const [busy, setBusy] = React.useState<"publish" | "unpublish" | "access" | null>(null)

  const access = form.access ?? "public"
  const url = info.slug ? `${origin}/f/${info.slug}` : ""
  const embed = `<iframe src="${url}" width="100%" height="700" style="border:0"></iframe>`

  async function publishNow(wasLive: boolean) {
    /* The builder keeps unsaved edits on this device until they are saved; those would not be in what we publish. */
    if (readDraft(formId)?.dirty) {
      toast.message("You have unsaved changes. Save them in the builder first.")
      return
    }
    setBusy("publish")
    await hold()
    const result = await publish(version)
    setBusy(null)
    if (result.ok) toast.success(wasLive ? "Updated. Your changes are live." : "Published. Your form is live.")
    else toast.error(publishError(result))
  }

  async function unpublishNow() {
    setBusy("unpublish")
    await hold()
    const ok = await unpublish()
    setBusy(null)
    if (ok) toast("Form unpublished.")
    else toast.error("Couldn't unpublish. Try again.")
  }

  async function chooseAccess(next: "public" | "private") {
    if (next === access) return
    setBusy("access")
    await hold()
    const ok = await setAccess(next)
    setBusy(null)
    if (!ok) toast.error("Couldn't change that. Try again.")
  }

  const pageClass = "mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8"

  /* ---------- Not published yet ---------- */
  if (!info.published) {
    return (
      <div className={pageClass}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-12 lg:py-10">
          <div className="grid gap-5">
            <div className="grid gap-2">
              <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">Publish to get a link</h2>
              <p className="max-w-md text-muted-foreground">
                Your form saves as you build it. Publishing makes it live at a link anyone can open. It starts out public, and you can change that any time.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <PendingLock pending={busy === "publish" || busy === "unpublish"} className="rounded-lg">
                <Button size="lg" onClick={() => void publishNow(false)} disabled={busy !== null}>
                  {busy === "publish" && <LoaderCircle animate size={16} className="size-4" aria-hidden="true" />}
                  {busy === "publish" ? "Publishing" : "Publish"}
                </Button>
              </PendingLock>
              <Link href={`/preview/${formId}`} target="_blank" className={buttonVariants({ variant: "outline", size: "lg" })}>
                <EyeIcon data-icon="inline-start" />
                Preview first
              </Link>
            </div>
          </div>

          {/* What you will get: the link starts with the form's own name. */}
          <div className="grid gap-3 rounded-xl border border-dashed p-5 sm:p-6" aria-hidden="true">
            <p className="text-sm text-muted-foreground">Your link will look like this</p>
            <p className="break-all font-display text-xl font-medium tracking-tight text-muted-foreground/80 sm:text-2xl">
              {origin ? origin.replace(/^https?:\/\//, "") : "yourdomain.com"}/f/{previewSlug(form.title)}-
              <span className="tracking-widest">••••••</span>
            </p>
            <p className="text-sm text-muted-foreground">Once it exists, the link stays the same even if you rename the form.</p>
          </div>
        </div>
      </div>
    )
  }

  /* ---------- Published ---------- */
  const isPublic = access === "public"
  const accessOptions = [
    { id: "public", title: "Public", text: "Anyone with the link can fill it in.", Icon: GlobeIcon },
    { id: "private", title: "Private", text: "Nobody can open the link. Only you can preview it.", Icon: LockIcon },
  ] as const

  return (
    <div className={pageClass}>
      <header className="mb-6 grid gap-1">
        <h2 className="font-display text-2xl font-medium tracking-tight">Share</h2>
        <p className="text-sm text-muted-foreground">Send people the link, or put the form on your own website.</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start">
        {/* Phones: the status comes first, so "changes not live yet" is never buried at the bottom. */}
        <aside aria-label="Status" className="grid content-start gap-4 rounded-xl bg-muted/40 p-5 max-lg:order-first lg:sticky lg:top-24">
          <div className="flex items-center gap-2.5">
            <span aria-hidden="true" className={cn("size-2.5 rounded-full", isPublic ? "bg-emerald-500" : "bg-amber-500")} />
            <p className="font-display text-xl font-medium tracking-tight">{isPublic ? "Live" : "Private"}</p>
          </div>
          <p className="-mt-2 text-sm text-muted-foreground">
            {isPublic ? "People can open the link and fill the form in." : "The link is switched off for visitors."}
          </p>

          {info.publishedAt && (
            <dl className="grid gap-0.5 text-sm">
              <dt className="text-muted-foreground">Last published</dt>
              <dd className="font-medium">{dateTime(info.publishedAt)}</dd>
              <dd className="text-xs text-muted-foreground">{timeAgo(info.publishedAt)}</dd>
            </dl>
          )}

          {info.hasChanges ? (
            <div className="grid gap-3 border-t pt-4">
              <div>
                <p className="text-sm font-medium">You have changes that aren&apos;t live yet</p>
                <p className="mt-0.5 text-sm text-muted-foreground">People still see the version you last published.</p>
              </div>
              <PendingLock pending={busy === "publish" || busy === "unpublish"} className="rounded-lg">
                <Button className="w-full" onClick={() => void publishNow(true)} disabled={busy !== null}>
                  {busy === "publish" && <LoaderCircle animate size={16} className="size-4" aria-hidden="true" />}
                  {busy === "publish" ? "Updating" : "Update live form"}
                </Button>
              </PendingLock>
            </div>
          ) : (
            <p className="flex items-center gap-1.5 border-t pt-4 text-sm text-muted-foreground">
              <CheckIcon className="size-4" aria-hidden="true" />
              Everything you built is live
            </p>
          )}
        </aside>

        <div className="divide-y rounded-xl border bg-card">
          {/* The link: the thing people came here for, so it is the biggest text on the page. */}
          <section className="grid gap-4 p-5 sm:p-6">
            <h3 className="text-sm font-medium">Link</h3>
            <p className={cn("break-all font-display text-xl font-medium tracking-tight sm:text-2xl", !isPublic && "text-muted-foreground")}>{url || "…"}</p>
            <div className="flex flex-wrap gap-2">
              <CopyButton value={url} label="Copy link" variant="default" />
              <Link
                href={`/f/${info.slug}`}
                target="_blank"
                className={cn(buttonVariants({ variant: "outline" }), !isPublic && "pointer-events-none opacity-50")}
                aria-disabled={!isPublic}
                tabIndex={isPublic ? undefined : -1}
              >
                <ExternalLinkIcon data-icon="inline-start" />
                Open
              </Link>
              <Link href={`/preview/${formId}`} target="_blank" className={buttonVariants({ variant: "ghost" })}>
                <EyeIcon data-icon="inline-start" />
                Preview
              </Link>
            </div>
            {!isPublic && <p className="text-sm text-muted-foreground">Make the form public to let people open this link.</p>}
          </section>

          <section className="grid gap-4 p-5 sm:p-6">
            <div className="grid gap-0.5">
              <h3 className="text-sm font-medium">Who can fill it in</h3>
              <p className="text-sm text-muted-foreground">The link stays the same when you switch.</p>
            </div>
            <PendingLock pending={busy === "access"} className="rounded-lg">
            <div role="radiogroup" aria-label="Who can fill it in" className="grid gap-3 sm:grid-cols-2">
              {accessOptions.map(({ id, title, text, Icon }) => (
                <label
                  key={id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring",
                    access === id ? "border-foreground bg-muted/50 ring-1 ring-foreground" : "hover:bg-muted/30",
                    busy !== null && "cursor-not-allowed opacity-60"
                  )}
                >
                  <input
                    type="radio"
                    name="access"
                    value={id}
                    checked={access === id}
                    disabled={busy !== null}
                    onChange={() => void chooseAccess(id)}
                    className="sr-only"
                  />
                  <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span className="grid gap-0.5">
                    <span className="text-sm font-medium">{title}</span>
                    <span className="text-sm text-muted-foreground">{text}</span>
                  </span>
                </label>
              ))}
            </div>
            </PendingLock>
          </section>

          <section className="grid gap-4 p-5 sm:p-6">
            <div className="grid gap-0.5">
              <h3 className="text-sm font-medium">Embed on your website</h3>
              <p className="text-sm text-muted-foreground">
                {isPublic ? "Paste this where you want the form to appear." : "Make the form public to embed it on a website."}
              </p>
            </div>
            {isPublic && (
              <div className="grid gap-2">
                <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-muted/50 p-3.5 font-mono text-xs leading-relaxed">{embed}</pre>
                <div>
                  <CopyButton value={embed} label="Copy code" />
                </div>
              </div>
            )}
          </section>

          <section className="flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
            <div className="grid gap-0.5">
              <h3 className="text-sm font-medium">Take it offline</h3>
              <p className="text-sm text-muted-foreground">The link stays yours. Until you publish again, it shows &ldquo;not open yet&rdquo;.</p>
            </div>
            <PendingLock pending={busy === "publish" || busy === "unpublish"} className="rounded-lg">
              <Button variant="destructive" onClick={() => void unpublishNow()} disabled={busy !== null}>
                {busy === "unpublish" && <LoaderCircle animate size={16} className="size-4" aria-hidden="true" />}
                Unpublish
              </Button>
            </PendingLock>
          </section>
        </div>
      </div>
    </div>
  )
}
