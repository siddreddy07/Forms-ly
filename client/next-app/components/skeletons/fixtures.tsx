"use client"

import { FormRenderer } from "@/components/renderer/form-renderer"
import { createClientIntake } from "@/lib/schema"

/* Mock content for boneyard. These are only drawn by `npx boneyard-js build` (on the /bones page) so it can
   measure the real layout and turn it into loading skeletons. They never run for real users. */

/* One form card, drawn with simple blocks: a thumbnail, then a title and two small lines. The real card has
   borders and nested boxes, which would turn into loose strips; blocks turn into clean card-shaped bones.
   Widths are set on purpose so the lines are different lengths, like real text. */
function CardFixture({ title, line1, line2 }: { title: string; line1: string; line2: string }) {
  return (
    <div className="flex h-[6.75rem] gap-3 @min-[592px]:h-auto @min-[592px]:flex-col">
      <div className="w-24 shrink-0 rounded-xl bg-muted @min-[592px]:aspect-[16/10] @min-[592px]:w-auto" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 @min-[592px]:justify-start @min-[592px]:px-1 @min-[592px]:pb-1">
        <h2 className="w-4/5 font-display text-base leading-tight font-medium tracking-tight @min-[592px]:text-lg">{title}</h2>
        <p className="w-2/5 text-xs">{line1}</p>
        <p className="w-1/3 text-xs">{line2}</p>
      </div>
    </div>
  )
}

const sampleCards = [
  { title: "Client intake brief", line1: "46 responses", line2: "2 days ago" },
  { title: "Website feedback", line1: "No responses", line2: "5 days ago" },
  { title: "Job application", line1: "128 responses", line2: "1 week ago" },
  { title: "Event signup", line1: "3 responses", line2: "2 weeks ago" },
  { title: "Project kickoff", line1: "12 responses", line2: "3 weeks ago" },
  { title: "Spring menu survey", line1: "87 responses", line2: "1 month ago" },
  { title: "Customer interview", line1: "9 responses", line2: "1 month ago" },
  { title: "Newsletter signup", line1: "301 responses", line2: "2 months ago" },
]

/* The grid of form cards on the dashboard. Columns follow the width of the box it sits in (not the screen),
   with the same widths as the real dashboard, so the skeleton always matches. It shows one or two rows. */
export function DashboardFormsFixture() {
  return (
    <div className="@container">
      <ul className="grid gap-3 @min-[592px]:grid-cols-2 @min-[592px]:gap-x-5 @min-[592px]:gap-y-7 @min-[976px]:grid-cols-3 @min-[1232px]:grid-cols-4 @max-[975px]:[&>li:nth-child(n+5)]:hidden @max-[1231px]:[&>li:nth-child(n+7)]:hidden">
        {sampleCards.map((card) => (
          <li key={card.title}>
            <CardFixture {...card} />
          </li>
        ))}
      </ul>
    </div>
  )
}

/* The form on the page, shown while a form opens in Build or Design. The header and tabs are plain UI and
   are not part of it. */
export function FormCanvasFixture() {
  return (
    <div className="bg-muted/40 px-3 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-xl">
        <FormRenderer form={createClientIntake()} />
      </div>
    </div>
  )
}

/* The inside of a tab (Design, Share, Analytics, Responses) while its data gets ready:
   a heading, a short line, and a card with a few rows. */
export function TabContentFixture() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:px-6">
      <div className="grid gap-1.5">
        <h2 className="font-display text-2xl font-medium tracking-tight">Page title goes here</h2>
        <p className="text-sm text-muted-foreground">A short line that explains what this page is for.</p>
      </div>
      <div className="grid gap-4 rounded-xl border bg-card p-5">
        <h3 className="text-base font-medium">Section heading</h3>
        <p className="text-sm text-muted-foreground">A sentence or two of detail sits under every section heading here.</p>
        <p className="text-sm text-muted-foreground">Another line of supporting text, a little shorter than that.</p>
        <p className="text-sm text-muted-foreground">One more line so the card has some height to it.</p>
      </div>
    </div>
  )
}

/* The public form page while it loads: a form on the page background. */
export function PublicFormFixture() {
  return (
    <div className="mx-auto w-full max-w-xl px-3 py-6 sm:py-10">
      <FormRenderer form={createClientIntake()} />
    </div>
  )
}
