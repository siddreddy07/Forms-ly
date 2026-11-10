"use client"

import { SettingsIcon } from "lucide-react"

import { SectionPlaceholder } from "@/components/workspace/section-placeholder"

/* Public/private now lives in Share. More settings will land here later. */
export function SettingsView({ formId }: { formId: string }) {
  void formId
  return <SectionPlaceholder icon={SettingsIcon} title="Settings" hint="More form settings are coming soon." />
}
