import type { Metadata } from "next"

import { DesignView } from "@/components/design/design-view"

export const metadata: Metadata = { title: "Design" }

export default async function Page({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params
  return <DesignView formId={formId} />
}
