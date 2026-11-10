"use client"

import { SettingsIcon } from "lucide-react"
import { usePathname } from "next/navigation"

import { DesignLoading } from "@/components/design/design-loading"
import { AnalyticsFixture, FormCanvasFixture, ResponsesFixture, ShareFixture } from "@/components/skeletons/fixtures"
import { Skeleton } from "@/components/skeletons/skeleton"
import { SectionPlaceholder } from "@/components/workspace/section-placeholder"

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

/* Settings has no data to wait for, so it simply shows its page. */
export function SettingsSkeleton() {
  return <SectionPlaceholder icon={SettingsIcon} title="Settings" hint="More form settings are coming soon." />
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
