"use client"

import * as React from "react"
import { SearchIcon } from "lucide-react"
import { toast } from "sonner"

import { EmptyState } from "@/components/dashboard/empty-state"
import { FilterBar, FilterDrawer, type FolderFilter, type SortKey } from "@/components/dashboard/filter-bar"
import type { FormActions } from "@/components/dashboard/form-actions-menu"
import { FormCard } from "@/components/dashboard/form-card"
import { NewFormDialog } from "@/components/dashboard/new-form-dialog"

import { FormsGridSkeleton } from "@/components/dashboard/forms-skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { documentForTemplate, type FormListResponse, type FormResponse } from "@/lib/api/forms"
import { useApi } from "@/lib/api/http"
import type { FormSummary } from "@/lib/api/types"
import { clearLocalForm } from "@/lib/local-form"

/* How many forms to ask for at a time. The "Load more" button fetches the next batch. */
const PAGE_SIZE = 24

function SearchField({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground lg:left-2.5 lg:size-3.5" />
      <Input
        type="search"
        aria-label="Search forms"
        placeholder="Search forms"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-lg bg-background pl-9 text-[0.85rem] lg:h-8 lg:text-[0.8rem]"
      />
    </div>
  )
}

function DashboardView() {
  const api = useApi()
  const [query, setQuery] = React.useState("")
  const searchRef = React.useRef<HTMLDivElement>(null)
  const [dockVisible, setDockVisible] = React.useState(false)
  const [items, setItems] = React.useState<FormSummary[]>([])
  const [total, setTotal] = React.useState(0)
  const [counts, setCounts] = React.useState({ all: 0, archived: 0 })
  const [nextCursor, setNextCursor] = React.useState<string | null>(null)
  const [loadingMore, setLoadingMore] = React.useState(false)
  const [loadState, setLoadState] = React.useState<"loading" | "ready" | "error">("loading")
  const [attempt, setAttempt] = React.useState(0)
  const [filter, setFilter] = React.useState<FolderFilter>("all")
  const [sort, setSort] = React.useState<SortKey>("recent")

  /* Wait for a pause in typing before asking the server, so every letter is not a request. */
  const [search, setSearch] = React.useState("")
  React.useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 300)
    return () => clearTimeout(timer)
  }, [query])

  /* One page of forms. The server does the searching, sorting and filtering; we keep the cursor it sends back. */
  const pagePath = React.useCallback(
    (cursor?: string | null) => {
      const params = new URLSearchParams({
        archived: filter === "archived" ? "true" : "all",
        sort,
        limit: String(PAGE_SIZE),
      })
      if (search) params.set("q", search)
      if (cursor) params.set("cursor", cursor)
      return `/forms?${params.toString()}`
    },
    [filter, sort, search]
  )

  const failed = (what: string) => toast.error(`Couldn't ${what}. Check your connection and try again.`)

  /* Loads the first page again (after a change, or when the search or filters change). */
  const refresh = React.useCallback(async () => {
    try {
      const res = await api<FormListResponse>(pagePath())
      setItems(res.forms)
      setTotal(res.total)
      setCounts(res.counts)
      setNextCursor(res.nextCursor)
      setLoadState("ready")
    } catch {
      failed("refresh your forms")
    }
  }, [api, pagePath])

  React.useEffect(() => {
    let cancelled = false
    api<FormListResponse>(pagePath())
      .then((res) => {
        if (cancelled) return
        setItems(res.forms)
        setTotal(res.total)
        setCounts(res.counts)
        setNextCursor(res.nextCursor)
        setLoadState("ready")
      })
      .catch(() => {
        if (!cancelled) setLoadState("error")
      })
    return () => {
      cancelled = true
    }
  }, [api, pagePath, attempt])

  async function loadMore() {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const res = await api<FormListResponse>(pagePath(nextCursor))
      setItems((prev) => {
        const seen = new Set(prev.map((f) => f.id))
        return [...prev, ...res.forms.filter((f) => !seen.has(f.id))]
      })
      setTotal(res.total)
      setCounts(res.counts)
      setNextCursor(res.nextCursor)
    } catch {
      failed("load more forms")
    } finally {
      setLoadingMore(false)
    }
  }

  const replace = (form: FormSummary) => setItems((prev) => prev.map((f) => (f.id === form.id ? { ...f, ...form } : f)))
  const bumpCounts = (archived: boolean, delta: number) =>
    setCounts((c) => (archived ? { ...c, archived: c.archived + delta } : { ...c, all: c.all + delta }))

  async function createForm({ title, templateId }: { title: string; templateId: string }) {
    try {
      const { form } = await api<FormResponse>("/forms", { method: "POST", body: { title, document: documentForTemplate(templateId) } })
      /* A new form is live, so show the live tab and load it. */
      if (filter === "archived") setFilter("all")
      else await refresh()
      toast.success("Form created")
      void form
    } catch {
      failed("create the form")
    }
  }

  const actions: FormActions = {
    /* Throws when it fails, so the rename dialog can show the error and stay open. */
    async onRename(id, name) {
      const { form } = await api<FormResponse>(`/forms/${id}`, { method: "PATCH", body: { title: name } })
      replace(form)
      toast.success("Form renamed")
    },
    async onDuplicate(id) {
      try {
        await api<FormResponse>(`/forms/${id}/duplicate`, { method: "POST" })
        if (filter === "archived") setFilter("all")
        else await refresh()
        toast.success("Form duplicated")
      } catch {
        failed("duplicate the form")
      }
    },
    async onArchive(id) {
      const src = items.find((f) => f.id === id)
      if (!src) return
      const archiving = !src.archived
      const change = async (archive: boolean) => {
        const { form } = await api<FormResponse>(`/forms/${id}/${archive ? "archive" : "restore"}`, { method: "POST" })
        replace(form)
        bumpCounts(archive, -1)
        bumpCounts(!archive, 1)
      }
      try {
        await change(archiving)
        await refresh()
        toast(archiving ? "Form archived" : "Form restored", {
          action: { label: "Undo", onClick: () => void change(!archiving).then(refresh).catch(() => failed("undo")) },
        })
      } catch {
        failed(archiving ? "archive the form" : "restore the form")
      }
    },
    onDelete(id) {
      const index = items.findIndex((f) => f.id === id)
      if (index < 0) return
      const removed = items[index]!
      setItems((prev) => prev.filter((f) => f.id !== id))
      setTotal((n) => Math.max(0, n - 1))
      bumpCounts(removed.archived, -1)
      /* Deleting is permanent, so we wait a few seconds first. Undo cancels it. */
      const timer = setTimeout(() => {
        api(`/forms/${id}`, { method: "DELETE" })
          .then(() => {
            clearLocalForm(id)
            void refresh()
          })
          .catch(() => {
            setItems((prev) => {
              if (prev.some((f) => f.id === id)) return prev
              const copy = [...prev]
              copy.splice(Math.min(index, copy.length), 0, removed)
              return copy
            })
            setTotal((n) => n + 1)
            bumpCounts(removed.archived, 1)
            failed("delete the form")
          })
      }, 5000)
      toast("Form deleted", {
        duration: 5000,
        action: {
          label: "Undo",
          onClick: () => {
            clearTimeout(timer)
            setItems((prev) => {
              const copy = [...prev]
              copy.splice(Math.min(index, copy.length), 0, removed)
              return copy
            })
            setTotal((n) => n + 1)
            bumpCounts(removed.archived, 1)
          },
        },
      })
    },
  }

  /* Show the bottom dock only once the inline search has scrolled out of view. */
  React.useEffect(() => {
    const el = searchRef.current
    if (!el) return
    const update = () => {
      /* 56px app header + 8px: the search is hidden once it reaches the header. */
      setDockVisible(el.getBoundingClientRect().top < 64)
    }
    update()
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [])

  const filterProps = { filter, onFilter: setFilter, counts, sort, onSort: setSort }

  return (
    <div className="min-h-[calc(100svh+8rem)] lg:min-h-0">
      <div className="mx-auto w-full max-w-7xl px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4 lg:pt-5 lg:pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-medium tracking-tight sm:text-2xl lg:text-xl">
              Your forms
            </h1>
            <p className="text-xs text-muted-foreground">{counts.all} {counts.all === 1 ? "form" : "forms"}</p>
          </div>
          <div className="lg:hidden">
            <NewFormDialog onCreate={createForm} />
          </div>
        </div>
        <div ref={searchRef} className="mt-3 flex items-center gap-2 lg:hidden">
          <SearchField value={query} onChange={setQuery} className="flex-1" />
          <FilterDrawer {...filterProps} />
        </div>
      </div>

      {/* Desktop: toolbar sticks under the app header while the grid scrolls */}
      <div className="sticky top-12 z-20 hidden border-y bg-background/85 backdrop-blur-xl lg:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-2">
          <SearchField value={query} onChange={setQuery} className="w-full max-w-xs" />
          <NewFormDialog onCreate={createForm} />
        </div>
      </div>

      <div className="@container mx-auto w-full max-w-7xl px-4 pb-24 sm:px-6 lg:pt-3 lg:pb-8">
        <FilterBar {...filterProps} />
        {loadState === "loading" ? (
          <div className="mt-4" aria-busy="true" aria-label="Loading your forms">
            <FormsGridSkeleton />
          </div>
        ) : loadState === "error" ? (
          <div className="mt-16 grid justify-items-center gap-3 text-center">
            <p className="text-muted-foreground">Couldn&apos;t load your forms. Check your connection.</p>
            <Button
              variant="outline"
              onClick={() => {
                setLoadState("loading")
                setAttempt((n) => n + 1)
              }}
            >
              Try again
            </Button>
          </div>
        ) : items.length > 0 ? (
          <>
            <ul className="mt-0 grid gap-2.5 lg:mt-3 @min-[592px]:grid-cols-2 @min-[592px]:gap-3 @min-[760px]:grid-cols-3 @min-[1024px]:grid-cols-4 @min-[1024px]:gap-4 @min-[1200px]:grid-cols-5">
              {items.map((form) => (
                <li key={form.id} className="h-full">
                  <FormCard form={form} actions={actions} />
                </li>
              ))}
            </ul>
            {nextCursor ? (
              <div className="mt-6 grid justify-items-center gap-2">
                <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? "Loading…" : "Load more"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Showing {items.length} of {total}
                </p>
              </div>
            ) : null}
          </>
        ) : search ? (
          <p className="mt-16 text-center text-muted-foreground">
            No forms match &ldquo;{query}&rdquo;.
          </p>
        ) : (
          <EmptyState
            kind={filter === "archived" ? "archived" : "none"}
            onCreate={createForm}
          />
        )}
      </div>

      {/* Phone and tablet: dock slides in once the inline search is out of view */}
      <div
        aria-hidden={!dockVisible}
        inert={!dockVisible}
        className={`fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-[transform,opacity,visibility] duration-300 ease-out lg:hidden ${
          dockVisible ? "translate-y-0 opacity-100" : "invisible translate-y-6 opacity-0"
        }`}
      >
        <div className="mx-auto flex max-w-md items-center gap-2 rounded-xl border bg-background/90 p-2 shadow-lg backdrop-blur-xl">
          <SearchField value={query} onChange={setQuery} className="flex-1" />
          <FilterDrawer {...filterProps} />
          <NewFormDialog onCreate={createForm} compact />
        </div>
      </div>
    </div>
  )
}

export { DashboardView }







