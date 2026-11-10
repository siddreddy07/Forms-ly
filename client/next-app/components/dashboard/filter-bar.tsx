"use client"

import * as React from "react"
import {
  ArchiveIcon,
  ArrowUpDownIcon,
  CheckIcon,
  LayoutGridIcon,
  SlidersHorizontalIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export type SortKey = "recent" | "name" | "responses"
export const sortLabels: Record<SortKey, string> = {
  recent: "Last edited",
  name: "Name",
  responses: "Most responses",
}

export type FolderFilter = "all" | "archived"

function FilterBar({
  filter,
  onFilter,
  counts,
  sort,
  onSort,
}: {
  filter: FolderFilter
  onFilter: (f: FolderFilter) => void
  counts: { all: number; archived: number }
  sort: SortKey
  onSort: (s: SortKey) => void
}) {
  const chips: { key: FolderFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "archived", label: "Archived", count: counts.archived },
  ]

  return (
    <div className="hidden items-center gap-2 lg:flex">
      <div
        role="tablist"
        aria-label="Forms"
        className="-mx-4 flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {chips.map((c) => {
          const active = c.key === filter
          return (
            <button
              key={c.key}
              role="tab"
              aria-selected={active}
              onClick={() => onFilter(c.key)}
              className={cn(
                "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              {c.label}
              <span className={cn("text-xs", active ? "text-background/70" : "text-muted-foreground")}>
                {c.count}
              </span>
            </button>
          )
        })}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Sort: ${sortLabels[sort]}`}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border bg-background px-2.5 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ArrowUpDownIcon className="size-4" />
          <span className="hidden sm:inline">{sortLabels[sort]}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          {(Object.keys(sortLabels) as SortKey[]).map((k) => (
            <DropdownMenuItem key={k} onClick={() => onSort(k)}>
              {sortLabels[k]}
              {k === sort && <CheckIcon className="ml-auto" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

type FilterProps = Parameters<typeof FilterBar>[0]

/* Phone and tablet: filters and sorting live in a bottom drawer, within thumb reach. */
function FilterDrawer({ filter, onFilter, counts, sort, onSort }: FilterProps) {
  const [open, setOpen] = React.useState(false)
  const active = filter !== "all" || sort !== "recent"

  const rows: { key: FolderFilter; label: string; count: number; icon: typeof LayoutGridIcon }[] = [
    { key: "all", label: "All forms", count: counts.all, icon: LayoutGridIcon },
    { key: "archived", label: "Archived", count: counts.archived, icon: ArchiveIcon },
  ]

  const rowClass = (on: boolean) =>
    cn(
      "flex h-11 w-full items-center gap-3 rounded-lg px-2.5 text-left text-[0.95rem] outline-none transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring",
      on && "bg-muted font-medium"
    )

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Filter and sort"
        className="relative inline-flex size-10 shrink-0 items-center justify-center rounded-lg border bg-background outline-none transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <SlidersHorizontalIcon className="size-4" />
        {active && (
          <span
            aria-hidden="true"
            className="absolute top-1.5 right-1.5 size-2 rounded-full bg-foreground ring-2 ring-background"
          />
        )}
      </SheetTrigger>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="data-[side=bottom]:rounded-t-2xl gap-0 p-0"
      >
        <SheetTitle className="sr-only">Filter and sort</SheetTitle>
        <SheetDescription className="sr-only">Choose which forms to show and a sort order</SheetDescription>
        <div aria-hidden="true" className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-border" />

        <div className="max-h-[70svh] overflow-y-auto px-3 pt-3 pb-2">
          <p className="px-2.5 pb-1 text-xs font-medium text-muted-foreground">Show</p>
          <ul>
            {rows.map((r) => {
              const on = r.key === filter
              return (
                <li key={r.key}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => onFilter(r.key)}
                    className={rowClass(on)}
                  >
                    <r.icon className="size-[18px] text-muted-foreground" aria-hidden="true" />
                    <span className="flex-1 truncate">{r.label}</span>
                    <span className="text-xs text-muted-foreground">{r.count}</span>
                    <CheckIcon className={cn("size-4", on ? "opacity-100" : "opacity-0")} aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ul>

          <p className="mt-3 px-2.5 pb-1 text-xs font-medium text-muted-foreground">Sort by</p>
          <ul>
            {(Object.keys(sortLabels) as SortKey[]).map((k) => {
              const on = k === sort
              return (
                <li key={k}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => onSort(k)}
                    className={rowClass(on)}
                  >
                    <ArrowUpDownIcon className="size-[18px] text-muted-foreground" aria-hidden="true" />
                    <span className="flex-1">{sortLabels[k]}</span>
                    <CheckIcon className={cn("size-4", on ? "opacity-100" : "opacity-0")} aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        <SheetFooter className="border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <SheetClose render={<Button size="lg" className="w-full" />}>Done</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export { FilterBar, FilterDrawer }

