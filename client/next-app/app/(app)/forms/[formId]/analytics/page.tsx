import type { Metadata } from "next"

import { AnalyticsLoader } from "@/components/analytics/analytics-loader"

export const metadata: Metadata = { title: "Analytics" }

export default async function Page({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params
  return <AnalyticsLoader formId={formId} />
}
