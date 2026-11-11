"use client"

import { ResponsesSkeleton } from "@/components/skeletons/tab-skeletons"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { DownloadIcon, InboxIcon, PaperclipIcon, SearchIcon } from "lucide-react"
import { Trash2 } from "@/components/animate-ui/icons/trash-2"
import { toast } from "sonner"

import { answerText } from "@/components/responses/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ResponseFilters } from "@/components/responses/filters"
import { useApi } from "@/lib/api/http"
import { exportResponsesCsv, useResponses } from "@/lib/api/responses"
import { activeCount, fieldToBlock, filterFromParam, filterToParam, type ResponseFilter } from "@/lib/responses/filter"
import type { Block } from "@/lib/schema"

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })

/* A stable empty list, so the rows memo does not see a new array on every render while loading. */
const NO_COLUMNS: Block[] = []

type StoredFile = { name: string; url: string | null }

/* One answer in the table. Uploaded files are links that open in a new tab (they stop working after an hour; reload for fresh ones). */
function Answer({ block, value, text }: { block: Block; value: unknown; text: string }) {
  if (block.type !== "file_upload" || !Array.isArray(value)) return <>{text || <span className="text-muted-foreground/50">-</span>}</>
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1">
      {(value as StoredFile[]).map((f, i) =>
        f.url ? (
          <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 text-primary underline-offset-4 hover:underline">
            <PaperclipIcon className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{f.name}</span>
          </a>
        ) : (
          <span key={i} className="truncate text-muted-foreground" title="The file is no longer available">
            {f.name}
          </span>
        )
      )}
    </span>
  )
}

function Page({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto grid w-full max-w-6xl gap-3 px-2.5 py-3 sm:gap-5 sm:px-6 sm:py-8">{children}</div>
}

/* Like a spreadsheet: one row per response, one column per question. The server does the searching, filtering and
   paging, so what is on screen and what the CSV holds are built the same way. */
/* Opens the table the way this user left it. A search or filter in the address (a shared link, or a refresh) wins;
   otherwise the last one they used on this form is loaded from the server, so it follows them to any device. */
export function ResponsesView({ formId, initialQuery = "", initialFilter = "" }: { formId: string; initialQuery?: string; initialFilter?: string }) {
  const api = useApi()
  const fromAddress = initialQuery !== "" || initialFilter !== ""
  const [saved, setSaved] = React.useState<{ query: string; filter: string } | null>(fromAddress ? { query: initialQuery, filter: initialFilter } : null)

  React.useEffect(() => {
    if (saved) return
    let cancelled = false
    api<{ query: string; filter: unknown }>(`/forms/${formId}/responses/view`)
      .then((v) => {
        if (!cancelled) setSaved({ query: v.query ?? "", filter: v.filter ? JSON.stringify(v.filter) : "" })
      })
      .catch(() => {
        if (!cancelled) setSaved({ query: "", filter: "" })
      })
    return () => {
      cancelled = true
    }
  }, [api, formId, saved])

  if (!saved) return <ResponsesSkeleton />
  return <ResponsesTable formId={formId} initialQuery={saved.query} initialFilter={saved.filter} />
}

function ResponsesTable({ formId, initialQuery, initialFilter }: { formId: string; initialQuery: string; initialFilter: string }) {
  const [query, setQuery] = React.useState(initialQuery)
  const [search, setSearch] = React.useState(initialQuery.trim())
  const [filter, setFilter] = React.useState<ResponseFilter>(() => filterFromParam(initialFilter))
  const [exporting, setExporting] = React.useState(false)
  const { getToken } = useAuth()
  const { state, retry, remove, loadMore, loadingMore } = useResponses(formId, { q: search, filter })

  /* Wait for a pause in typing before asking the server, so every letter is not a request. */
  React.useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 300)
    return () => clearTimeout(timer)
  }, [query])

  /* Keep the page address in step with the search and filters, so a refresh brings them back. This replaces the
     current history entry (no new Back step for every change) and does not reload the page. */
  React.useEffect(() => {
    const url = new URL(window.location.href)
    const f = filterToParam(filter)
    if (search) url.searchParams.set("q", search)
    else url.searchParams.delete("q")
    if (f) url.searchParams.set("f", f)
    else url.searchParams.delete("f")
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, "", url)
  }, [search, filter])

  /* Remember this view on the server, a moment after the last change, so it comes back on any device. Nothing is sent
     if it matches what was last saved or loaded, and a change still waiting is sent when the page is left. */
  const api = useApi()
  const lastSaved = React.useRef(JSON.stringify({ query: search, filter: filterToParam(filter) }))
  const waiting = React.useRef<string | null>(null)
  const send = React.useCallback(
    (keepalive: boolean) => {
      const body = waiting.current
      if (!body || body === lastSaved.current) return
      waiting.current = null
      lastSaved.current = body
      const { query: q, filter: f } = JSON.parse(body) as { query: string; filter: string }
      void api(`/forms/${formId}/responses/view`, { method: "PUT", body: { query: q, filter: f ? JSON.parse(f) : null }, keepalive }).catch(() => {
        /* Not kept this time; the next change tries again. */
        lastSaved.current = ""
      })
    },
    [api, formId]
  )
  React.useEffect(() => {
    waiting.current = JSON.stringify({ query: search, filter: filterToParam(filter) })
    const timer = setTimeout(() => send(false), 1000)
    return () => clearTimeout(timer)
  }, [search, filter, send])
  React.useEffect(() => {
    const onHide = () => send(true)
    window.addEventListener("pagehide", onHide)
    return () => {
      window.removeEventListener("pagehide", onHide)
      send(true)
    }
  }, [send])

  /* The questions as columns, from the server: current questions plus ones older responses still answer. */
  const columns = state.status === "ready" ? state.columns : NO_COLUMNS

  /* What the filter panel can filter by, from the server. */
  const filterColumns = React.useMemo(() => (state.status === "ready" ? state.filterFields.map(fieldToBlock) : []), [state])

  /* Rows are already filtered and searched by the server; number them from newest (the highest) down. */
  const rows = React.useMemo(() => {
    if (state.status !== "ready") return []
    return state.items.map((r, i) => ({
      r,
      number: state.total - i,
      cells: columns.map((c) => answerText(c, r.answers[c.id])),
    }))
  }, [state, columns])

  if (state.status === "loading") {
    return <ResponsesSkeleton />
  }

  if (state.status === "error") {
    return (
      <Page>
        <div className="flex min-h-[40svh] sm:min-h-[50svh] flex-col items-center justify-center rounded-xl border border-dashed px-4 text-center sm:px-6">
          <h2 className="font-display text-xl font-medium tracking-tight sm:text-2xl">Couldn&apos;t load responses</h2>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">Check your connection and try again.</p>
          <Button variant="outline" className="mt-4" onClick={retry}>
            Try again
          </Button>
        </div>
      </Page>
    )
  }

  if (state.allTotal === 0) {
    return (
      <Page>
        <div className="flex min-h-[40svh] sm:min-h-[50svh] flex-col items-center justify-center rounded-xl border border-dashed px-4 text-center sm:px-6">
          <span className="inline-flex size-12 items-center justify-center rounded-xl border bg-card">
            <InboxIcon className="size-5 text-muted-foreground" aria-hidden="true" />
          </span>
          <h2 className="mt-4 font-display text-xl font-medium tracking-tight sm:text-2xl">No responses yet</h2>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">Answers show up here as a table once people submit your form.</p>
        </div>
      </Page>
    )
  }

  const narrowed = activeCount(filter) > 0 || search !== ""
  const nothingMatches = rows.length === 0

  async function exportCsv() {
    setExporting(true)
    try {
      const token = await getToken()
      const result = await exportResponsesCsv(token, formId, { q: search, filter })
      if (!result.ok) toast.error(result.message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <Page>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <h2 className="font-display text-lg font-medium tracking-tight sm:text-2xl">Responses</h2>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            {narrowed
              ? `Showing ${state.items.length} of ${state.total} matching`
              : `${state.allTotal} ${state.allTotal === 1 ? "response" : "responses"}`}
          </p>
        </div>
        {/* Phones and tablets: search with small icon buttons beside it. Desktop: the buttons get their labels. */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search answers"
              aria-label="Search answers"
              className="h-9 w-full pl-9"
            />
          </div>
          <ResponseFilters columns={filterColumns} filter={filter} onChange={setFilter} shown={state.total} />
          <Button variant="outline" aria-label="Export CSV" title="Export CSV" className="max-lg:w-9 max-lg:px-0" onClick={exportCsv} disabled={exporting}>
            <DownloadIcon />
            <span className="max-lg:sr-only">{exporting ? "Exporting…" : "Export CSV"}</span>
          </Button>
        </div>
      </div>

      {/* One table at every size: on a phone it scrolls sideways instead of turning into cards. */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-8 w-10 px-2.5 text-xs text-muted-foreground sm:h-11 sm:w-14 sm:px-4">#</TableHead>
              <TableHead className="h-8 px-2.5 text-xs text-muted-foreground sm:h-11 sm:px-4">Submitted</TableHead>
              {columns.map((c) => (
                <TableHead key={c.id} className="h-8 min-w-32 px-2.5 text-xs sm:h-11 sm:min-w-40 sm:px-4 sm:text-sm">
                  {c.label || "Untitled question"}
                </TableHead>
              ))}
              <TableHead className="h-8 w-10 px-1.5 sm:h-11 sm:w-14 sm:px-4">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ r, number, cells }) => (
              <TableRow key={r.id}>
                <TableCell className="px-2.5 py-1.5 text-xs tabular-nums text-muted-foreground sm:px-4 sm:py-3">{number}</TableCell>
                <TableCell className="px-2.5 py-1.5 text-xs whitespace-nowrap text-muted-foreground sm:px-4 sm:py-3 sm:text-sm">{when(r.submittedAt)}</TableCell>
                {cells.map((text, ci) => (
                  <TableCell key={columns[ci].id} className="max-w-52 truncate px-2.5 py-1.5 text-xs sm:max-w-72 sm:px-4 sm:py-3 sm:text-sm" title={text}>
                    <Answer block={columns[ci]} value={r.answers[columns[ci].id]} text={text} />
                  </TableCell>
                ))}
                <TableCell className="px-1.5 py-1 text-right sm:px-4 sm:py-2">
                  <DeleteButton onDelete={() => remove(r.id)} />
                </TableCell>
              </TableRow>
            ))}
            {nothingMatches && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length + 3} className="px-4 py-8 text-center text-sm text-muted-foreground sm:py-12">
                  Nothing matches your search or filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {state.nextCursor ? (
        <div className="grid justify-items-center gap-2">
          <Button
            variant="outline"
            disabled={loadingMore}
            onClick={async () => {
              if (!(await loadMore())) toast.error("Couldn't load more responses")
            }}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Showing {state.items.length} of {state.total}
          </p>
        </div>
      ) : null}
    </Page>
  )
}

function DeleteButton({ onDelete }: { onDelete: () => Promise<boolean> }) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Delete this response"
      className="text-muted-foreground hover:text-destructive"
      onClick={async () => {
        if (await onDelete()) toast("Response deleted")
        else toast.error("Couldn't delete the response")
      }}
    >
      <Trash2 animateOnHover size={16} className="size-4" />
    </Button>
  )
}
