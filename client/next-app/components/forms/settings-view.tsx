"use client"

import { StorageSettings } from "@/components/forms/storage-settings"

/* Public/private lives in Share. This is where the rest of the settings go; for now, file storage. */
export function SettingsView({ formId }: { formId: string }) {
  void formId
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <h2 className="font-display text-2xl font-medium tracking-tight">Settings</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Options for your forms.</p>
      </div>
      <StorageSettings />
    </div>
  )
}
