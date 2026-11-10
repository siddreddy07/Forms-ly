"use client"

import { StorageSettings } from "@/components/forms/storage-settings"
import { ThemePicker } from "@/components/theme-switcher"

/* Public/private lives in Share. This is where the rest of the settings go: how the app looks, and file storage. */
export function SettingsView({ formId }: { formId: string }) {
  void formId
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <h2 className="font-display text-2xl font-medium tracking-tight">Settings</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Options for your forms.</p>
      </div>

      <section className="grid gap-4 rounded-xl border bg-card p-5">
        <div className="grid gap-1.5">
          <h3 className="text-base font-medium">Appearance</h3>
          <p className="text-sm text-muted-foreground">Choose light or dark, or follow your device. It only changes how you see the app, not how your forms look to others.</p>
        </div>
        <ThemePicker className="max-w-sm" />
      </section>

      <StorageSettings />
    </div>
  )
}
