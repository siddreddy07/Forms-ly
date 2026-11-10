"use client"

import { usePathname } from "next/navigation"

import { DesignLoading } from "@/components/design/design-loading"
import { AnalyticsFixture, FormCanvasFixture, ResponsesFixture, ShareFixture, StorageFixture } from "@/components/skeletons/fixtures"
import { Skeleton } from "@/components/skeletons/skeleton"
import { Skeleton as PlainSkeleton } from "@/components/ui/skeleton"

/* One loading screen per form tab, each shaped like that tab's real layout. The bones come from
   `npx boneyard-js build` (see app/bones/page.tsx). */

export function BuildSkeleton() {
  return (
    <Skeleton name="form-canvas" loading fixture={<FormCanvasFixture />}>
      <FormCanvasFixture />
    </Skeleton>
  )
}

export function AnalyticsSkeleton() {
  return (
    <Skeleton name="analytics" loading fixture={<AnalyticsFixture />}>
      <AnalyticsFixture />
    </Skeleton>
  )
}

export function ShareSkeleton() {
  return (
    <Skeleton name="share" loading fixture={<ShareFixture />}>
      <ShareFixture />
    </Skeleton>
  )
}

export function ResponsesSkeleton() {
  return (
    <Skeleton name="responses" loading fixture={<ResponsesFixture />}>
      <ResponsesFixture />
    </Skeleton>
  )
}

/* Only the storage card waits for data. */
export function StorageSkeleton() {
  return (
    <Skeleton name="storage" loading fixture={<StorageFixture />}>
      <StorageFixture />
    </Skeleton>
  )
}

/* Settings: the heading shows straight away; the rows below are plain placeholders the same height as the real ones. */
export function SettingsSkeleton() {
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-3 px-4 py-4 sm:gap-4 sm:px-6 sm:py-8">
      <h2 className="font-display text-xl font-medium tracking-tight sm:text-2xl">Settings</h2>
      <div className="divide-y rounded-xl border bg-card" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <section key={i} className="grid gap-2.5 p-4">
            <div className="grid gap-1.5">
              <PlainSkeleton className="h-4 w-24" />
              <PlainSkeleton className="h-3.5 w-2/3" />
            </div>
            <PlainSkeleton className="h-9 w-full rounded-lg" />
          </section>
        ))}
      </div>
    </div>
  )
}

/* Picks the right one for the tab in the address bar (/forms/<id>/<tab>). */
export function TabLoading() {
  const tab = usePathname().split("/")[3]
  switch (tab) {
    case "build":
      return <BuildSkeleton />
    case "design":
      return <DesignLoading />
    case "analytics":
      return <AnalyticsSkeleton />
    case "share":
      return <ShareSkeleton />
    case "responses":
      return <ResponsesSkeleton />
    default:
      return <SettingsSkeleton />
  }
}
