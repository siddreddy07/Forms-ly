import type { Metadata } from "next"

import { ShareView } from "@/components/forms/share-view"

export const metadata: Metadata = { title: "Share" }

export default async function Page({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params
  return <ShareView formId={formId} />
}
