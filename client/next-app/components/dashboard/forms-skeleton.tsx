import { Skeleton } from "@/components/ui/skeleton"

/* The loading state for the dashboard's grid of forms. It is built from the same boxes, sizes and columns as the
   real FormCard and the grid in dashboard-view.tsx (a short row on phones, a small card with a picture on top from
   tablets up), so nothing jumps when the real forms arrive. The columns follow the width of the box it sits
   in, like the real grid. */

const widths = ["w-3/5", "w-4/5", "w-1/2", "w-2/3", "w-3/4", "w-2/5", "w-3/5", "w-4/5", "w-1/2", "w-2/3"]

function CardSkeleton({ titleWidth }: { titleWidth: string }) {
  return (
    <div className="flex h-[5.25rem] flex-row overflow-hidden rounded-xl border bg-card @min-[592px]:h-full @min-[592px]:flex-col">
      {/* The picture panel: a muted box with a hint of the form inside it. */}
      <div className="relative w-24 shrink-0 overflow-hidden border-r bg-muted/60 px-[14%] pt-[12%] @min-[592px]:aspect-[16/9] @min-[592px]:w-auto @min-[592px]:border-r-0 @min-[592px]:border-b @min-[592px]:px-[22%] @min-[592px]:pt-[8%]">
        <div className="grid gap-1.5 rounded-t-md border border-b-0 bg-card p-2">
          <Skeleton className="h-1.5 w-2/3 rounded-sm" />
          <Skeleton className="h-3 w-full rounded-sm" />
          <Skeleton className="h-1.5 w-1/2 rounded-sm" />
          <Skeleton className="h-3 w-full rounded-sm" />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 px-3 py-2 @min-[592px]:justify-start @min-[592px]:gap-2.5 @min-[592px]:p-2.5 lg:p-3">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className={`h-3.5 ${titleWidth}`} />
          <Skeleton className="size-5 shrink-0 rounded-full" />
        </div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-16 rounded-md @min-[592px]:hidden" />
        </div>
        <Skeleton className="mt-auto hidden h-5 w-16 rounded-md @min-[592px]:block" />
      </div>
    </div>
  )
}

export function FormsGridSkeleton() {
  return (
    <ul
      aria-hidden="true"
      className="grid gap-2.5 @min-[592px]:grid-cols-2 @min-[592px]:gap-3 @min-[760px]:grid-cols-3 @min-[1024px]:grid-cols-4 @min-[1024px]:gap-4 @min-[1200px]:grid-cols-5 @max-[591px]:[&>li:nth-child(n+5)]:hidden @max-[1023px]:[&>li:nth-child(n+7)]:hidden @max-[1199px]:[&>li:nth-child(n+9)]:hidden"
    >
      {widths.map((w, i) => (
        <li key={i} className="h-full">
          <CardSkeleton titleWidth={w} />
        </li>
      ))}
    </ul>
  )
}
