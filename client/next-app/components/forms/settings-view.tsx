"use client"

import { CloseAtPicker } from "@/components/forms/close-at-picker"
import { SettingRow } from "@/components/forms/setting-row"
import { StorageSettings } from "@/components/forms/storage-settings"
import { ThemePicker } from "@/components/theme-switcher"

/* Public/private lives in Share. This is where the rest go, as short rows in one card: when the form closes, how the
   app looks and file storage. Each row is a title, one line of help and its control. */
export function SettingsView({ formId }: { formId: string }) {
  void formId
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-3 px-4 py-4 sm:gap-4 sm:px-6 sm:py-8">
      <h2 className="font-display text-xl font-medium tracking-tight sm:text-2xl">Settings</h2>

      <div className="divide-y rounded-xl border bg-card">
        <SettingRow inline title="Closes" hint="Stop taking answers at a date and time. Publish the change to make it live.">
          <CloseAtPicker />
        </SettingRow>
        <SettingRow inline title="Appearance" hint="Light, dark, or follow your device.">
          <ThemePicker className="w-full sm:w-60 [&_button]:h-8" />
        </SettingRow>
        <StorageSettings />
      </div>
    </div>
  )
}
