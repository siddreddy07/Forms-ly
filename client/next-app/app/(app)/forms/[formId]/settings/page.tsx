import type { Metadata } from "next"

import { SettingsView } from "@/components/forms/settings-view"

export const metadata: Metadata = { title: "Settings" }

export default async function Page({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params
  return <SettingsView formId={formId} />
}
