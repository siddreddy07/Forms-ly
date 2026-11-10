import type { Metadata } from "next"

import { BuildScreen } from "@/components/builder/build-screen"

export const metadata: Metadata = { title: "Build" }

export default async function BuildPage({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params
  return <BuildScreen formId={formId} />
}
