"use client"

import dynamic from "next/dynamic"

import { AnalyticsSkeleton } from "@/components/skeletons/tab-skeletons"

/* Charts are heavy, so they load only when this tab is opened. */
const AnalyticsView = dynamic(() => import("@/components/analytics/analytics-view").then((m) => m.AnalyticsView), {
  ssr: false,
  loading: () => <AnalyticsSkeleton />,
})

export function AnalyticsLoader({ formId }: { formId: string }) {
  return <AnalyticsView formId={formId} />
}
