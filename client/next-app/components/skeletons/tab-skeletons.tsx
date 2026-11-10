"use client"

import { usePathname } from "next/navigation"

import { DesignLoading } from "@/components/design/design-loading"
import { AnalyticsFixture, FormCanvasFixture, ResponsesFixture, ShareFixture, StorageFixture } from "@/components/skeletons/fixtures"
import { Skeleton } from "@/components/skeletons/skeleton"

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

/* Settings: the heading is plain UI and shows straight away; the storage card is the skeleton. */
export function SettingsSkeleton() {
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <h2 className="font-display text-2xl font-medium tracking-tight">Settings</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Options for your forms.</p>
      </div>
      <StorageSkeleton />
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
