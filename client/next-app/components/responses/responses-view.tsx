"use client"

import { ResponsesSkeleton } from "@/components/skeletons/tab-skeletons"

import * as React from "react"
import { DownloadIcon, InboxIcon, PaperclipIcon, SearchIcon } from "lucide-react"
import { Trash2 } from "@/components/animate-ui/icons/trash-2"
import { toast } from "sonner"

import { csvEscape, answerText } from "@/components/responses/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useResponses } from "@/lib/api/responses"
import { useFormGate } from "@/components/workspace/form-gate"
import { isAnswerBlock, type Block } from "@/lib/schema"

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })

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

/* Like a spreadsheet: one row per response, one column per question. */
export function ResponsesView({ formId }: { formId: string }) {
  const { state, retry, remove } = useResponses(formId)
  const responses = state.status === "ready" ? state.items : null
  const [query, setQuery] = React.useState("")
  const { doc } = useFormGate()

  /* Columns: the questions saved with each response (newest first), then any question the form has now that
     they miss, so the headers are always there. */
  const columns: Block[] = React.useMemo(() => {
    if (responses === null) return []
    const seen = new Map<string, Block>()
    for (const r of responses) for (const f of r.fields ?? []) if (!seen.has(f.id)) seen.set(f.id, f)
    for (const b of doc.steps.flatMap((st) => st.blocks)) if (isAnswerBlock(b.type) && !seen.has(b.id)) seen.set(b.id, b)
    return [...seen.values()]
  }, [doc, responses])

  const rows = React.useMemo(() => {
    if (!responses) return []
    const q = query.trim().toLowerCase()
    return responses
      .map((r, i) => ({ r, number: responses.length - i, cells: columns.map((c) => answerText(c, r.answers[c.id])) }))
      .filter(({ r, cells }) => !q || cells.some((c) => c.toLowerCase().includes(q)) || when(r.submittedAt).toLowerCase().includes(q))
  }, [responses, columns, query])

  if (state.status === "loading") {
    return <ResponsesSkeleton />
  }

  if (state.status === "error" || responses === null) {
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

  if (responses.length === 0) {
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

  function exportCsv() {
    const head = ["Submitted", ...columns.map((c) => c.label || "Untitled question")]
    const lines = [head, ...rows.map(({ r, cells }) => [r.submittedAt, ...cells])].map((l) => l.map(csvEscape).join(","))
    const url = URL.createObjectURL(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }))
    const a = document.createElement("a")
    a.href = url
    a.download = `responses-${formId}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const total = state.total

  return (
    <Page>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-medium tracking-tight">Responses</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {rows.length === total ? `${total} ${total === 1 ? "response" : "responses"}` : `Showing ${rows.length} of ${total}`}
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
          <Button variant="outline" size="lg" onClick={exportCsv}>
            <DownloadIcon /> Export CSV
          </Button>
        </div>
      </div>

      {/* Phones: one card per response. */}
      <ul className="grid gap-3 sm:hidden">
        {rows.map(({ r, cells }) => (
          <li key={r.id} className="rounded-xl border bg-card">
            <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
              <span className="text-xs text-muted-foreground">{when(r.submittedAt)}</span>
              <DeleteButton onDelete={() => remove(r.id)} />
            </div>
            <dl className="grid gap-3 p-4">
              {columns.map((c, ci) =>
                cells[ci] ? (
                  <div key={c.id} className="grid gap-0.5">
                    <dt className="text-xs font-medium text-muted-foreground">{c.label || "Untitled question"}</dt>
                    <dd className="break-words text-sm"><Answer block={c} value={r.answers[c.id]} text={cells[ci]} /></dd>
                  </div>
                ) : null
              )}
            </dl>
          </li>
        ))}
        {rows.length === 0 && <li className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">Nothing matches your search.</li>}
      </ul>

      {/* Larger screens: a table that scrolls sideways when there are many questions. */}
      <div className="hidden overflow-hidden rounded-xl border bg-card sm:block">
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
            {rows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length + 3} className="px-4 py-12 text-center text-muted-foreground">
                  Nothing matches your search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
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
