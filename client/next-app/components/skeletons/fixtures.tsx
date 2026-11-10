"use client"

import type { FormActions } from "@/components/dashboard/form-actions-menu"
import { FormCard } from "@/components/dashboard/form-card"
import { FormRenderer } from "@/components/renderer/form-renderer"
import type { FormSummary } from "@/lib/api/types"
import { createClientIntake } from "@/lib/schema"

/* Mock content for boneyard. These are only drawn by `npx boneyard-js build` (on the /bones page) so it can
   measure the real layout and turn it into loading skeletons. They never run for real users. */

const noop = async () => {}
const actions: FormActions = { onRename: noop, onDuplicate: () => {}, onArchive: () => {}, onDelete: () => {}, onMove: () => {} }

const sampleForms: FormSummary[] = [
  { id: "a", title: "Client intake brief", status: "published", responses: 46, updatedAt: "2026-11-08T14:20:00Z", archived: false },
  { id: "b", title: "Website feedback", status: "draft", responses: 0, updatedAt: "2026-11-06T17:40:00Z", archived: false },
  { id: "c", title: "Job application", status: "published", responses: 128, updatedAt: "2026-11-05T09:05:00Z", archived: false },
  { id: "d", title: "Event signup", status: "draft", responses: 3, updatedAt: "2026-11-02T08:15:00Z", archived: false },
]

/* The grid of form cards on the dashboard. */
export function DashboardFormsFixture() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
      {sampleForms.map((form) => (
        <li key={form.id} className="h-full">
          <FormCard form={form} folders={[]} actions={actions} />
        </li>
      ))}
    </ul>
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
