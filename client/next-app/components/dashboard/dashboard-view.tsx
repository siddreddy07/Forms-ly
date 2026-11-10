"use client"

import * as React from "react"
import { SearchIcon } from "lucide-react"
import { toast } from "sonner"

import { EmptyState } from "@/components/dashboard/empty-state"
import { FilterBar, FilterDrawer, type FolderFilter, type SortKey } from "@/components/dashboard/filter-bar"
import type { FormActions } from "@/components/dashboard/form-actions-menu"
import { FormCard } from "@/components/dashboard/form-card"
import { NewFormDialog } from "@/components/dashboard/new-form-dialog"
import { Skeleton } from "@/components/skeletons/skeleton"

import { DashboardFormsFixture } from "@/components/skeletons/fixtures"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { documentForTemplate, type FormListResponse, type FormResponse } from "@/lib/api/forms"
import { useApi } from "@/lib/api/http"
import type { FormSummary } from "@/lib/api/types"
import { clearLocalForm } from "@/lib/local-form"

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
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        aria-label="Search forms"
        placeholder="Search forms"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-lg bg-background pl-9"
      />
    </div>
  )
}

function DashboardView() {
  const api = useApi()
  const [query, setQuery] = React.useState("")
  const searchRef = React.useRef<HTMLDivElement>(null)
  const [dockVisible, setDockVisible] = React.useState(false)
  const [all, setAll] = React.useState<FormSummary[]>([])
  const [loadState, setLoadState] = React.useState<"loading" | "ready" | "error">("loading")
  const [attempt, setAttempt] = React.useState(0)
  const [filter, setFilter] = React.useState<FolderFilter>("all")
  const [sort, setSort] = React.useState<SortKey>("recent")

  /* Load every form (live and archived) from the backend. */
  React.useEffect(() => {
    let cancelled = false
    api<FormListResponse>("/forms?archived=all")
      .then((res) => {
        if (cancelled) return
        setAll(res.forms)
        setLoadState("ready")
      })
      .catch(() => {
        if (!cancelled) setLoadState("error")
      })
    return () => {
      cancelled = true
    }
  }, [api, attempt])

  const replace = (form: FormSummary) => setAll((prev) => prev.map((f) => (f.id === form.id ? { ...f, ...form } : f)))
  const failed = (what: string) => toast.error(`Couldn't ${what}. Check your connection and try again.`)

  async function createForm({ title, templateId }: { title: string; templateId: string }) {
    try {
      const { form } = await api<FormResponse>("/forms", { method: "POST", body: { title, document: documentForTemplate(templateId) } })
      setAll((prev) => [form, ...prev])
      setFilter("all")
      toast.success("Form created")
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
        const { form } = await api<FormResponse>(`/forms/${id}/duplicate`, { method: "POST" })
        setAll((prev) => [form, ...prev])
        toast.success("Form duplicated")
      } catch {
        failed("duplicate the form")
      }
    },
    async onArchive(id) {
      const src = all.find((f) => f.id === id)
      if (!src) return
      const archiving = !src.archived
      const change = async (archive: boolean) => {
        const { form } = await api<FormResponse>(`/forms/${id}/${archive ? "archive" : "restore"}`, { method: "POST" })
        replace(form)
      }
      try {
        await change(archiving)
        toast(archiving ? "Form archived" : "Form restored", {
          action: { label: "Undo", onClick: () => void change(!archiving).catch(() => failed("undo")) },
        })
      } catch {
        failed(archiving ? "archive the form" : "restore the form")
      }
    },
    onDelete(id) {
      const index = all.findIndex((f) => f.id === id)
      if (index < 0) return
      const removed = all[index]
      setAll((prev) => prev.filter((f) => f.id !== id))
      /* Deleting is permanent, so we wait a few seconds first. Undo cancels it. */
      const timer = setTimeout(() => {
        api(`/forms/${id}`, { method: "DELETE" })
          .then(() => clearLocalForm(id))
          .catch(() => {
            setAll((prev) => (prev.some((f) => f.id === id) ? prev : [removed, ...prev]))
            failed("delete the form")
          })
      }, 5000)
      toast("Form deleted", {
        duration: 5000,
        action: {
          label: "Undo",
          onClick: () => {
            clearTimeout(timer)
            setAll((prev) => {
              const copy = [...prev]
              copy.splice(Math.min(index, copy.length), 0, removed)
              return copy
            })
          },
        },
      })
    },
  }

  const live = all.filter((f) => !f.archived)
  const counts = {
    all: live.length,
    archived: all.length - live.length,
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

  const q = query.trim().toLowerCase()
  const forms = all
    .filter((f) =>
      filter === "archived" ? f.archived : !f.archived
    )
    .filter((f) => f.title.toLowerCase().includes(q))
    .sort((a, b) =>
      sort === "name"
        ? a.title.localeCompare(b.title)
        : sort === "responses"
          ? b.responses - a.responses
          : b.updatedAt.localeCompare(a.updatedAt)
    )

  return (
    <div className="min-h-[calc(100svh+8rem)] lg:min-h-0">
      <div className="mx-auto w-full max-w-7xl px-4 pt-6 pb-5 sm:px-6 sm:pt-10 sm:pb-6 lg:pb-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
              Your forms
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{counts.all} forms</p>
          </div>
          <div className="lg:hidden">
            <NewFormDialog onCreate={createForm} />
          </div>
        </div>
        <div ref={searchRef} className="mt-5 flex items-center gap-2 lg:hidden">
          <SearchField value={query} onChange={setQuery} className="flex-1" />
          <FilterDrawer {...filterProps} />
        </div>
      </div>

      {/* Desktop: toolbar sticks under the app header while the grid scrolls */}
      <div className="sticky top-14 z-20 hidden border-y bg-background/85 backdrop-blur-xl lg:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
          <SearchField value={query} onChange={setQuery} className="w-full max-w-sm" />
          <NewFormDialog onCreate={createForm} />
        </div>
      </div>

      <div className="@container mx-auto w-full max-w-7xl px-4 pb-28 sm:px-6 lg:pt-2 lg:pb-12">
        <FilterBar {...filterProps} />
        {loadState === "loading" ? (
          <div className="mt-4" aria-busy="true" aria-label="Loading your forms">
            <Skeleton name="dashboard-forms" loading fixture={<DashboardFormsFixture />}>
              <DashboardFormsFixture />
            </Skeleton>
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
        ) : forms.length > 0 ? (
          <ul className="mt-0 grid gap-3 lg:mt-4 @min-[592px]:grid-cols-2 @min-[592px]:gap-5 @min-[976px]:grid-cols-3 @min-[1232px]:grid-cols-4">
            {forms.map((form) => (
              <li key={form.id} className="h-full">
                <FormCard form={form} actions={actions} />
              </li>
            ))}
          </ul>
        ) : q ? (
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







