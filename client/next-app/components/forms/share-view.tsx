"use client"

import * as React from "react"
import Link from "next/link"
import { CheckIcon, CopyIcon, ExternalLinkIcon, EyeIcon, GlobeIcon, LockIcon } from "lucide-react"
import { toast } from "sonner"

import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle"
import { useFormGate, type PublishResult } from "@/components/workspace/form-gate"
import { Button, buttonVariants } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
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
    <Button variant={variant} onClick={copy} disabled={!value} className="shrink-0">
      {copied ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />}
      <span className={label === "Copy" ? "max-sm:sr-only" : undefined}>{copied ? "Copied" : label}</span>
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

  /* Chosen before the first publish: off means public. */
  const [startPrivate, setStartPrivate] = React.useState(false)

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
    /* The first publish follows the switch. After that, the Public / Private buttons decide. */
    if (!wasLive && !info.published && startPrivate !== (form.access === "private")) {
      const set = await setAccess(startPrivate ? "private" : "public")
      if (!set) {
        setBusy(null)
        toast.error("Couldn't publish. Check your connection and try again.")
        return
      }
    }
    /* Every publish keeps the saved choices for the form. */
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

  /* ---------- Not published yet ---------- */
  if (!info.published) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-5 sm:px-6 sm:py-8">
        <div className="divide-y rounded-xl border bg-card">
          <section className="grid gap-1.5 p-4 sm:p-5">
            <h2 className="font-display text-xl font-medium tracking-tight sm:text-2xl">Publish to get a link</h2>
            <p className="text-sm text-muted-foreground">Your form saves as you build it. Publishing puts it live at a link you can share.</p>
          </section>

          {/* What you will get: the link starts with the form's own name. */}
          <section className="grid gap-2 p-4 sm:p-5">
            <h3 className="text-sm font-medium">Your link will look like this</h3>
            <p
              className="truncate rounded-lg border border-dashed bg-muted/30 px-3 py-2 font-mono text-sm text-muted-foreground"
              aria-hidden="true"
            >
              {origin ? origin.replace(/^https?:\/\//, "") : "yourdomain.com"}/f/{previewSlug(form.title)}-••••••
            </p>
            <p className="text-sm text-muted-foreground">It stays the same even if you rename the form.</p>
          </section>

          {/* Public unless this is switched on. */}
          <section className="flex items-center justify-between gap-4 p-4 sm:p-5">
            <label htmlFor="start-private" className="grid cursor-pointer gap-0.5">
              <span className="text-sm font-medium">Make it private</span>
              <span className="text-sm text-muted-foreground">
                {startPrivate ? "Private: people need a 4 digit code to open the link. You'll see the code after you publish." : "Public: anyone with the link can fill it in."}
              </span>
            </label>
            <Switch id="start-private" checked={startPrivate} onCheckedChange={setStartPrivate} disabled={busy !== null} />
          </section>

          <section className="flex flex-wrap items-center gap-2 p-4 sm:p-5">
            <PendingLock pending={busy === "publish" || busy === "unpublish"} className="max-sm:w-full rounded-lg">
              <Button size="lg" className="max-sm:w-full" onClick={() => void publishNow(false)} disabled={busy !== null}>
                {busy === "publish" && <LoaderCircle animate size={16} className="size-4" aria-hidden="true" />}
                {busy === "publish" ? "Publishing" : "Publish"}
              </Button>
            </PendingLock>
            <Link href={`/preview/${formId}`} target="_blank" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "max-sm:w-full")}>
              <EyeIcon data-icon="inline-start" />
              Preview first
            </Link>
          </section>
        </div>
      </div>
    )
  }

  /* ---------- Published ---------- */
  const isPublic = access === "public"
  const accessOptions = [
    { id: "public", title: "Public", Icon: GlobeIcon },
    { id: "private", title: "Private", Icon: LockIcon },
  ] as const
  const working = busy === "publish" || busy === "unpublish"

  /* One narrow column that fits a phone as it is: status, link, who can fill it in, embed, unpublish. */
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-5 sm:px-6 sm:py-8">
      <div className="divide-y rounded-xl border bg-card">
        {/* Status, and the one thing that needs doing when there are changes. */}
        <section className="grid gap-3 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-full", isPublic ? "bg-emerald-500" : "bg-amber-500")} />
              <h2 className="font-display text-lg font-medium tracking-tight">{isPublic ? "Live" : "Private"}</h2>
              {info.publishedAt && (
                <span className="truncate text-sm text-muted-foreground" title={dateTime(info.publishedAt)}>
                  · published {timeAgo(info.publishedAt)}
                </span>
              )}
            </div>
            <Link href={`/preview/${formId}`} target="_blank" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              <EyeIcon data-icon="inline-start" />
              Preview
            </Link>
          </div>

          {info.hasChanges && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-500/10 px-3 py-2.5">
              <p className="text-sm">You have changes that aren&apos;t live yet.</p>
              <PendingLock pending={working} className="rounded-lg">
                <Button size="sm" onClick={() => void publishNow(true)} disabled={busy !== null}>
                  {busy === "publish" && <LoaderCircle animate size={16} className="size-4" aria-hidden="true" />}
                  {busy === "publish" ? "Updating" : "Update live form"}
                </Button>
              </PendingLock>
            </div>
          )}
        </section>

        {/* The link: shown as one line you can read, copy or open. */}
        <section className="grid gap-2 p-4 sm:p-5">
          <h3 className="text-sm font-medium">Link</h3>
          <div className="flex items-center gap-2">
            <p
              className={cn(
                "min-w-0 flex-1 truncate rounded-lg border bg-muted/40 px-3 py-2 font-mono text-sm",
                !isPublic && "text-muted-foreground"
              )}
              title={url}
            >
              {url || "…"}
            </p>
            <CopyButton value={url} label="Copy" variant="default" />
            <Link
              href={`/f/${info.slug}`}
              target="_blank"
              aria-label="Open the live form"
              className={buttonVariants({ variant: "outline", size: "icon" })}
            >
              <ExternalLinkIcon />
            </Link>
          </div>
          {!isPublic && <p className="text-sm text-muted-foreground">Visitors will be asked for the access code.</p>}
        </section>

        {/* Public / private: two buttons side by side, one sentence under them. */}
        <section className="grid gap-2 p-4 sm:p-5">
          <h3 className="text-sm font-medium">Who can fill it in</h3>
          <PendingLock pending={busy === "access"} className="rounded-lg">
            <div role="radiogroup" aria-label="Who can fill it in" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              {accessOptions.map(({ id, title, Icon }) => (
                <label
                  key={id}
                  className={cn(
                    "flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring",
                    access === id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
                    busy !== null && "cursor-not-allowed"
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
                  <Icon className="size-4" aria-hidden="true" />
                  {title}
                </label>
              ))}
            </div>
          </PendingLock>
          <p className="text-sm text-muted-foreground">
            {isPublic ? "Anyone with the link can fill it in." : "People need the access code below to open the link."}
          </p>
        </section>

        {/* The code that opens a private form. A new one is made each time the form is switched to private. */}
        {!isPublic && info.accessCode && (
          <section className="flex items-center justify-between gap-3 p-4 sm:p-5">
            <div className="grid gap-1">
              <h3 className="text-sm font-medium">Access code</h3>
              <p className="text-sm text-muted-foreground">Give this code to people you want to let in. It changes if you switch to private again.</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span aria-label={`Code ${info.accessCode.split("").join(" ")}`} className="rounded-lg border bg-muted/40 px-3 py-1.5 font-mono text-xl font-medium tracking-[0.3em]">
                {info.accessCode}
              </span>
              <CopyButton value={info.accessCode} label="Copy" />
            </div>
          </section>
        )}

        {/* Embed: one line of code with its own copy button. */}
        {isPublic && (
          <section className="flex items-center justify-between gap-3 p-4 sm:p-5">
            <div className="grid gap-0.5">
              <h3 className="text-sm font-medium">Embed on your website</h3>
              <p className="text-sm text-muted-foreground">Copy the code and paste it into your page.</p>
            </div>
            <CopyButton value={embed} label="Copy code" />
          </section>
        )}

        {/* Taking it offline keeps the link yours. */}
        <section className="flex items-center justify-between gap-3 p-4 sm:p-5">
          <p className="text-sm text-muted-foreground">Unpublish to take the form offline. The link stays yours.</p>
          <PendingLock pending={working} className="shrink-0 rounded-lg">
            <Button variant="destructive" size="sm" onClick={() => void unpublishNow()} disabled={busy !== null}>
              {busy === "unpublish" && <LoaderCircle animate size={16} className="size-4" aria-hidden="true" />}
              Unpublish
            </Button>
          </PendingLock>
        </section>
      </div>
    </div>
  )
}
