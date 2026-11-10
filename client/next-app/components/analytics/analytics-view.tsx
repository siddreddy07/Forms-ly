"use client"

import * as React from "react"
import { BarChart3Icon } from "lucide-react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { useResponses } from "@/components/responses/use-responses"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Switch } from "@/components/ui/switch"
import { demoResponses } from "@/lib/analytics/demo"
import { averageDurationMs, formatDuration, inRange, perDay, summarize, type QuestionSummary, type Range } from "@/lib/analytics/compute"
import { readPublishedDoc } from "@/lib/api/mock-meta"
import { getFormDocument } from "@/lib/api/mock-schemas"
import { readServerRecord } from "@/lib/api/mock-server"
import { createEmptyForm, isAnswerBlock, type Block } from "@/lib/schema"
import { cn } from "@/lib/utils"

const ranges: { id: Range; label: string }[] = [
  { id: "7", label: "7 days" },
  { id: "30", label: "30 days" },
  { id: "all", label: "All time" },
]

const countConfig = { count: { label: "Responses", color: "var(--foreground)" } } satisfies ChartConfig

function Card({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border bg-card p-4 sm:p-5", className)}>
      {title && <h3 className="mb-3 text-sm font-medium">{title}</h3>}
      {children}
    </section>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 sm:p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl font-medium tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function OverTime({ data }: { data: { label: string; count: number }[] }) {
  return (
    <ChartContainer config={countConfig} className="aspect-auto h-56 w-full sm:h-64">
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
        <YAxis width={28} tickLine={false} axisLine={false} allowDecimals={false} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
        <Area dataKey="count" type="monotone" stroke="var(--color-count)" fill="var(--color-count)" fillOpacity={0.12} strokeWidth={2} />
      </AreaChart>
    </ChartContainer>
  )
}

function Bars({ bars, vertical }: { bars: { label: string; count: number }[]; vertical?: boolean }) {
  if (vertical) {
    return (
      <ChartContainer config={countConfig} className="aspect-auto h-44 w-full">
        <BarChart data={bars} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis width={28} tickLine={false} axisLine={false} allowDecimals={false} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
          <Bar dataKey="count" fill="var(--color-count)" radius={4} />
        </BarChart>
      </ChartContainer>
    )
  }
  return (
    <ChartContainer config={countConfig} className="aspect-auto w-full" style={{ height: bars.length * 38 + 12 }}>
      <BarChart data={bars} layout="vertical" margin={{ left: 0, right: 24 }}>
        <YAxis
          dataKey="label"
          type="category"
          width={96}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: string) => (v.length > 14 ? `${v.slice(0, 13)}…` : v)}
        />
        <XAxis type="number" hide />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={4} barSize={18} />
      </BarChart>
    </ChartContainer>
  )
}

function QuestionCard({ s, total }: { s: QuestionSummary; total: number }) {
  const skipped = total ? Math.round(((total - s.answered) / total) * 100) : 0
  return (
    <Card className="grid content-start gap-3">
      <div>
        <h3 className="text-sm font-medium">{s.block.label || "Untitled question"}</h3>
        <p className="text-xs text-muted-foreground">
          {s.answered} of {total} answered{skipped > 0 ? ` · ${skipped}% skipped` : ""}
        </p>
      </div>
      {s.kind === "choice" && <Bars bars={s.bars} />}
      {s.kind === "rating" && (
        <>
          <p className="font-display text-2xl font-medium tabular-nums">
            {s.average.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">average</span>
          </p>
          <Bars bars={s.bars} vertical />
        </>
      )}
      {s.kind === "number" && (
        <dl className="grid grid-cols-3 gap-2 text-center">
          {[
            ["Average", s.average.toFixed(1)],
            ["Lowest", String(s.min)],
            ["Highest", String(s.max)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-muted/50 p-2">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="font-display text-xl tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {s.kind === "text" && (
        <ul className="grid gap-1.5">
          {s.recent.map((t, i) => (
            <li key={i} className="truncate rounded-lg bg-muted/50 px-3 py-1.5 text-sm" title={t}>
              {t}
            </li>
          ))}
          {s.recent.length === 0 && <li className="text-sm text-muted-foreground">No answers yet.</li>}
        </ul>
      )}
      {s.kind === "other" && <p className="text-sm text-muted-foreground">{s.answered} answers.</p>}
    </Card>
  )
}

export function AnalyticsView({ formId }: { formId: string }) {
  const real = useResponses(formId)
  const [demo, setDemo] = React.useState(true)
  const [range, setRange] = React.useState<Range>("30")
  const [now] = React.useState(() => Date.now())

  const blocks: Block[] = React.useMemo(() => {
    if (real === null) return []
    const doc = readPublishedDoc(formId) ?? readServerRecord(formId, getFormDocument(formId) ?? createEmptyForm()).doc
    return doc.steps.flatMap((s) => s.blocks).filter((b) => isAnswerBlock(b.type))
  }, [formId, real])

  const all = React.useMemo(() => (demo ? demoResponses(formId, blocks, now) : (real ?? [])), [demo, formId, blocks, now, real])
  const rows = React.useMemo(() => inRange(all, range, now), [all, range, now])
  const series = React.useMemo(() => perDay(rows, range, now), [rows, range, now])
  const questions = React.useMemo(() => blocks.map((b) => summarize(b, rows)), [blocks, rows])
  const last7 = React.useMemo(() => inRange(all, "7", now).length, [all, now])
  const days = Math.max(series.length, 1)

  if (real === null) return <div className="mx-auto h-64 max-w-6xl animate-pulse px-4 py-8" />

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-medium tracking-tight">Analytics</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">How your form is doing.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch size="sm" checked={demo} onCheckedChange={setDemo} aria-label="Show demo data" /> Demo data
          </label>
          <div role="radiogroup" aria-label="Date range" className="grid grid-cols-3 rounded-lg bg-muted p-0.5">
            {ranges.map((r) => (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={range === r.id}
                onClick={() => setRange(r.id)}
                className={cn(
                  "h-8 rounded-md px-3 text-sm font-medium outline-none focus-visible:outline-2 focus-visible:outline-ring",
                  range === r.id ? "bg-background shadow-sm" : "text-muted-foreground"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {all.length === 0 ? (
        <div className="flex min-h-[50svh] flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-xl border bg-card">
            <BarChart3Icon className="size-5 text-muted-foreground" aria-hidden="true" />
          </span>
          <h3 className="mt-4 font-display text-2xl font-medium tracking-tight">No data yet</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">Charts appear once people submit your form. Turn on demo data to preview them.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Responses" value={String(rows.length)} hint={range === "all" ? "All time" : `Last ${range} days`} />
            <Stat label="Last 7 days" value={String(last7)} />
            <Stat label="Per day" value={(rows.length / days).toFixed(1)} hint="Average" />
            <Stat label="Time to complete" value={formatDuration(averageDurationMs(rows))} hint="Average" />
          </div>

          <Card title="Responses over time">
            <OverTime data={series} />
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {questions.map((s) => (
              <QuestionCard key={s.block.id} s={s} total={rows.length} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
