"use client"

import dynamic from "next/dynamic"

/* Charts are heavy, so they load only when this tab is opened. */
const AnalyticsView = dynamic(() => import("@/components/analytics/analytics-view").then((m) => m.AnalyticsView), {
  ssr: false,
  loading: () => <div className="mx-auto h-64 max-w-6xl animate-pulse px-4 py-8" />,
})

export function AnalyticsLoader({ formId }: { formId: string }) {
  return <AnalyticsView formId={formId} />
}
