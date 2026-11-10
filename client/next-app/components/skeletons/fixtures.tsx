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

/* The public form page while it loads: a form on the page background. */
export function PublicFormFixture() {
  return (
    <div className="mx-auto w-full max-w-xl px-3 py-6 sm:py-10">
      <FormRenderer form={createClientIntake()} />
    </div>
  )
}

/* The Design tab's controls panel (a colour swatch grid and a couple of option rows). The heading and the tab
   strip above it are plain UI, so they are not part of it. */
export function DesignPanelFixture() {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <h3 className="text-sm font-medium">Page background</h3>
        <p className="text-sm text-muted-foreground">Pick a colour for the page behind your form.</p>
      </div>
      <div className="grid grid-cols-6 gap-2">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="aspect-square rounded-lg bg-muted" />
        ))}
      </div>
      <div className="grid gap-2">
        <h3 className="text-sm font-medium">Colour strength</h3>
        <p className="text-sm text-muted-foreground">How strong the colour looks on the page.</p>
      </div>
    </div>
  )
}

/* Analytics: heading, four number tiles, a wide chart card, then two question cards. */
export function AnalyticsFixture() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <div className="grid gap-1.5">
        <h2 className="font-display text-2xl font-medium tracking-tight">Analytics</h2>
        <p className="text-sm text-muted-foreground">How your form is doing.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {["Responses", "Last 7 days", "Per day", "Time to complete"].map((l) => (
          <div key={l} className="rounded-xl border bg-card p-4 sm:p-5">
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className="mt-1 font-display text-3xl font-medium tracking-tight">128</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border bg-card p-4 sm:p-5">
        <h3 className="mb-3 text-sm font-medium">Responses over time</h3>
        <div className="h-56 w-full rounded-lg bg-muted sm:h-64" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map((n) => (
          <div key={n} className="grid content-start gap-3 rounded-xl border bg-card p-4 sm:p-5">
            <h3 className="text-sm font-medium">A question from your form</h3>
            <p className="text-xs text-muted-foreground">84 of 128 answered</p>
            <div className="h-32 w-full rounded-lg bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}

/* Share: one card with the link and embed fields. */
export function ShareFixture() {
  return (
    <div className="mx-auto grid max-w-2xl gap-5 rounded-xl border p-6">
      <div className="grid gap-1 rounded-lg border p-3">
        <p className="text-sm font-medium">Public</p>
        <p className="text-sm text-muted-foreground">Anyone with the link can fill it in.</p>
      </div>
      <div className="grid gap-1.5">
        <p className="text-sm font-medium">Link</p>
        <div className="h-10 w-full rounded-lg bg-muted" />
      </div>
      <div className="grid gap-1.5">
        <p className="text-sm font-medium">Embed on your website</p>
        <div className="h-20 w-full rounded-lg bg-muted" />
      </div>
    </div>
  )
}

/* Responses: heading, then a table of rows. */
export function ResponsesFixture() {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <div className="grid gap-1.5">
        <h2 className="font-display text-2xl font-medium tracking-tight">Responses</h2>
        <p className="text-sm text-muted-foreground">128 responses</p>
      </div>
      <div className="grid gap-3 rounded-xl border bg-card p-4">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="h-9 w-full rounded-md bg-muted" />
        ))}
      </div>
    </div>
  )
}

/* Settings: the file storage card (heading, a line of text, a status box and a button). The page heading above
   it is plain UI, so it is not part of it. */
export function StorageFixture() {
  return (
    <div className="grid gap-4 rounded-xl border bg-card p-5">
      <div className="grid gap-1.5">
        <h3 className="text-base font-medium">File uploads</h3>
        <p className="text-sm text-muted-foreground">Where files are kept when people attach them to your forms. Each file can be up to 3 MB.</p>
      </div>
      <div className="grid gap-2 rounded-lg border p-3">
        <p className="text-sm font-medium">Free storage on the service</p>
        <div className="h-1.5 w-full rounded-full bg-muted" />
        <p className="text-xs text-muted-foreground">A small free allowance to try file uploads.</p>
      </div>
      <div className="h-9 w-44 rounded-lg bg-muted" />
    </div>
  )
}
