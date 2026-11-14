"use client"

import { AnalyticsSkeleton } from "@/components/skeletons/tab-skeletons"

import * as React from "react"
import { BarChart3Icon } from "lucide-react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { Button } from "@/components/ui/button"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { formatDuration, useAnalytics, type Question, type Range } from "@/lib/api/analytics"
import { cn } from "@/lib/utils"

const ranges: { id: Range; label: string }[] = [
  { id: "7", label: "7 days" },
  { id: "30", label: "30 days" },
  { id: "all", label: "All time" },
]

const countConfig = { count: { label: "Responses", color: "var(--foreground)" } } satisfies ChartConfig

function Card({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border bg-card p-2.5 sm:p-5", className)}>
      {title && <h3 className="mb-2 text-xs font-medium sm:mb-3 sm:text-sm">{title}</h3>}
      {children}
    </section>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 rounded-xl border bg-card p-2.5 sm:p-5">
      <p className="truncate text-[0.6875rem] text-muted-foreground sm:text-xs">{label}</p>
      <p className="mt-0.5 font-display text-xl font-medium tracking-tight tabular-nums sm:mt-1 sm:text-3xl">{value}</p>
      {hint && <p className="mt-0.5 truncate text-[0.625rem] text-muted-foreground sm:text-xs">{hint}</p>}
    </div>
  )
}

const dayLabel = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })

function OverTime({ data }: { data: { date: string; count: number }[] }) {
  return (
    <ChartContainer config={countConfig} className="aspect-auto h-40 w-full sm:h-80">
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickFormatter={dayLabel} tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
        <YAxis width={28} tickLine={false} axisLine={false} allowDecimals={false} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" labelFormatter={(v) => dayLabel(String(v))} />} />
        <Area dataKey="count" type="monotone" stroke="var(--color-count)" fill="var(--color-count)" fillOpacity={0.12} strokeWidth={2} />
      </AreaChart>
    </ChartContainer>
  )
}

function Bars({ bars, vertical }: { bars: { label: string; count: number }[]; vertical?: boolean }) {
  if (vertical) {
    return (
      <ChartContainer config={countConfig} className="aspect-auto h-32 w-full sm:h-44">
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
    <ChartContainer config={countConfig} className="aspect-auto w-full" style={{ height: bars.length * 30 + 10 }}>
      <BarChart data={bars} layout="vertical" margin={{ left: 0, right: 16 }}>
        <YAxis
          dataKey="label"
          type="category"
          width={84}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: string) => (v.length > 14 ? `${v.slice(0, 13)}…` : v)}
        />
        <XAxis type="number" hide />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={4} barSize={14} />
      </BarChart>
    </ChartContainer>
  )
}

/* Choice, rating and number questions get their own small chart. */
function QuestionCard({ q, total }: { q: Exclude<Question, { kind: "other" }>; total: number }) {
  return (
    <Card className="grid content-start gap-2 sm:gap-3">
      <div>
        <h3 className="text-[0.8125rem] font-medium sm:text-sm">{q.label || "Untitled question"}</h3>
        <p className="text-xs text-muted-foreground">
          {q.answered} of {total} answered
        </p>
      </div>
      {q.kind === "choice" && <Bars bars={q.bars} />}
      {q.kind === "rating" && (
        <>
          <p className="font-display text-xl font-medium tabular-nums sm:text-2xl">
            {q.average.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">average</span>
          </p>
          <Bars bars={q.bars} vertical />
        </>
      )}
      {q.kind === "number" && (
        <dl className="grid grid-cols-3 gap-1.5 text-center sm:gap-2">
          {[
            ["Average", q.average.toFixed(1)],
            ["Lowest", String(q.min)],
            ["Highest", String(q.max)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-muted/50 p-2">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="font-display text-xl tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  )
}

export function AnalyticsView({ formId }: { formId: string }) {
  const [range, setRange] = React.useState<Range>("30")
  const { state, retry } = useAnalytics(formId, range)

  if (state.status === "loading") return <AnalyticsSkeleton />

  if (state.status === "error") {
    return (
      <div className="mx-auto grid w-full max-w-6xl px-2.5 py-3 sm:px-6 sm:py-8">
        <div className="flex min-h-[40svh] sm:min-h-[50svh] flex-col items-center justify-center rounded-xl border border-dashed px-4 text-center sm:px-6">
          <h3 className="font-display text-xl font-medium tracking-tight sm:text-2xl">Couldn&apos;t load analytics</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">Check your connection and try again.</p>
          <Button variant="outline" className="mt-4" onClick={retry}>
            Try again
          </Button>
        </div>
      </div>
    )
  }

  const a = state.data
  const charted = a.questions.filter((q): q is Exclude<Question, { kind: "other" }> => q.kind !== "other")

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-3 px-2.5 py-3 sm:gap-5 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <h2 className="font-display text-lg font-medium tracking-tight sm:text-2xl">Analytics</h2>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">How your form is doing. Only numbers are shown here; read answers in Responses.</p>
        </div>
        <div role="radiogroup" aria-label="Date range" className="grid grid-cols-3 rounded-lg bg-muted p-0.5">
          {ranges.map((r) => (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={range === r.id}
              onClick={() => setRange(r.id)}
              className={cn(
                "h-7 rounded-md px-3 text-xs font-medium sm:h-8 sm:text-sm outline-none focus-visible:outline-2 focus-visible:outline-ring",
                range === r.id ? "bg-background shadow-sm" : "text-muted-foreground"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {a.total === 0 ? (
        <div className="flex min-h-[40svh] sm:min-h-[50svh] flex-col items-center justify-center rounded-xl border border-dashed px-4 text-center sm:px-6">
          <span className="inline-flex size-12 items-center justify-center rounded-xl border bg-card">
            <BarChart3Icon className="size-5 text-muted-foreground" aria-hidden="true" />
          </span>
          <h3 className="mt-4 font-display text-xl font-medium tracking-tight sm:text-2xl">No data yet</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">Charts appear once people submit your form.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Stat label="Responses" value={String(a.total)} hint={range === "all" ? "All time" : `${a.inRange} in the last ${range} days`} />
            <Stat label="Days active" value={String(a.daysActive)} hint={`Since ${new Date(a.since).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`} />
            <Stat label="Time to complete" value={formatDuration(a.avgDurationMs)} hint="Average" />
          </div>

          <Card title="Responses per day">
            <OverTime data={a.series} />
          </Card>

          {charted.length > 0 && (
            <div className="grid gap-2.5 sm:gap-4 md:grid-cols-2">
              {charted.map((q) => (
                <QuestionCard key={q.id} q={q} total={a.inRange} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
