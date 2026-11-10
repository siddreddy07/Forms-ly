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
import { exportResponsesCsv, useResponses } from "@/lib/api/responses"
import { activeCount, emptyFilter, fieldToBlock, type ResponseFilter } from "@/lib/responses/filter"
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
  return <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-6 sm:px-6 sm:py-8">{children}</div>
}

/* Like a spreadsheet: one row per response, one column per question. The server does the searching, filtering and
   paging, so what is on screen and what the CSV holds are built the same way. */
export function ResponsesView({ formId }: { formId: string }) {
  const [query, setQuery] = React.useState("")
  const [search, setSearch] = React.useState("")
  const [filter, setFilter] = React.useState<ResponseFilter>(emptyFilter)
  const [exporting, setExporting] = React.useState(false)
  const { getToken } = useAuth()
  const { state, retry, remove, loadMore, loadingMore } = useResponses(formId, { q: search, filter })

  /* Wait for a pause in typing before asking the server, so every letter is not a request. */
  React.useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 300)
    return () => clearTimeout(timer)
  }, [query])

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
        <div className="flex min-h-[50svh] flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center">
          <h2 className="font-display text-2xl font-medium tracking-tight">Couldn&apos;t load responses</h2>
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
        <div className="flex min-h-[50svh] flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-xl border bg-card">
            <InboxIcon className="size-5 text-muted-foreground" aria-hidden="true" />
          </span>
          <h2 className="mt-4 font-display text-2xl font-medium tracking-tight">No responses yet</h2>
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-medium tracking-tight">Responses</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {narrowed
              ? `Showing ${state.items.length} of ${state.total} matching`
              : `${state.allTotal} ${state.allTotal === 1 ? "response" : "responses"}`}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search answers"
              aria-label="Search answers"
              className="h-9 w-full pl-9 sm:w-64"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <ResponseFilters columns={filterColumns} filter={filter} onChange={setFilter} shown={state.total} />
            <Button variant="outline" className={"text-sm md:text-lg"} onClick={exportCsv} disabled={exporting}>
              <DownloadIcon /> {exporting ? "Exporting…" : "Export CSV"}
            </Button>
          </div>
        </div>
      </div>

      {/* One table at every size: on a phone it scrolls sideways instead of turning into cards. */}
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-11 w-14 px-4 text-xs text-muted-foreground">#</TableHead>
              <TableHead className="h-11 px-4 text-xs text-muted-foreground">Submitted</TableHead>
              {columns.map((c) => (
                <TableHead key={c.id} className="h-11 min-w-40 px-4">
                  {c.label || "Untitled question"}
                </TableHead>
              ))}
              <TableHead className="h-11 w-14 px-4">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ r, number, cells }) => (
              <TableRow key={r.id}>
                <TableCell className="px-4 py-3 text-xs tabular-nums text-muted-foreground">{number}</TableCell>
                <TableCell className="px-4 py-3 text-muted-foreground">{when(r.submittedAt)}</TableCell>
                {cells.map((text, ci) => (
                  <TableCell key={columns[ci].id} className="max-w-72 truncate px-4 py-3" title={text}>
                    <Answer block={columns[ci]} value={r.answers[columns[ci].id]} text={text} />
                  </TableCell>
                ))}
                <TableCell className="px-4 py-2 text-right">
                  <DeleteButton onDelete={() => remove(r.id)} />
                </TableCell>
              </TableRow>
            ))}
            {nothingMatches && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length + 3} className="px-4 py-12 text-center text-muted-foreground">
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
