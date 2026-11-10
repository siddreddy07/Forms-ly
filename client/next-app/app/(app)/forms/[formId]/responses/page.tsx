import type { Metadata } from "next"

import { ResponsesView } from "@/components/responses/responses-view"

export const metadata: Metadata = { title: "Responses" }

export default async function Page({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params
  return <ResponsesView formId={formId} />
}
