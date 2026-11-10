import { z } from "zod"

import type { Form } from "../schema.js"

/* The form's behaviour settings (Settings tab). They live in forms.settings:
   the top level is what the owner is editing, `published` is the copy that went live with the last publish.
   A settings change is therefore a change to publish, just like a document edit, without touching the form version. */

export const formSettingsSchema = z.object({
  /* Stop taking answers after this many. */
  responseLimit: z.number().int().min(1).max(100_000).nullable(),
  /* Stop taking answers at this moment (ISO 8601, with a time zone). */
  closeAt: z.iso.datetime({ offset: true }).nullable(),
  /* What the thank-you screen says. */
  thankYouMessage: z.string().max(1_000).nullable(),
  /* Where to send people after they send one. */
  redirectUrl: z.string().max(500).nullable(),
})

export type FormSettings = z.infer<typeof formSettingsSchema>

/* The current settings, with every field present even when the stored object is old or empty. */
export const emptySettings: FormSettings = {
  responseLimit: null,
  closeAt: null,
  thankYouMessage: null,
  redirectUrl: null,
}

type Stored = Partial<FormSettings> & { published?: Partial<FormSettings> | null }

function normalise(raw: unknown): FormSettings {
  const parsed = formSettingsSchema.partial().safeParse(raw ?? {})
  const value = parsed.success ? parsed.data : {}
  return {
    responseLimit: value.responseLimit ?? null,
    closeAt: value.closeAt ?? null,
    thankYouMessage: value.thankYouMessage ?? null,
    redirectUrl: value.redirectUrl ?? null,
  }
}

export function settingsOf(form: Pick<Form, "settings">): FormSettings {
  return normalise(form.settings)
}

/* What the live form uses. Before the first publish this is empty, so nothing closes early. */
export function publishedSettingsOf(form: Pick<Form, "settings">): FormSettings {
  const stored = (form.settings ?? {}) as Stored
  return normalise(stored.published)
}

/* Has a setting changed since the last publish? */
export function settingsChanged(form: Pick<Form, "settings">) {
  return JSON.stringify(settingsOf(form)) !== JSON.stringify(publishedSettingsOf(form))
}

/* Keep the published copy when the owner saves a new setting, so we still know what is live. */
export function withPublishedSnapshot(form: Pick<Form, "settings">, next: FormSettings): Stored {
  const stored = (form.settings ?? {}) as Stored
  return stored.published === undefined ? next : { ...next, published: stored.published }
}

/* The whole settings object that goes live with a publish. */
export function asPublished(settings: FormSettings): Stored {
  return { ...settings, published: settings }
}

/* Why the form stopped taking answers, or null while it is open. */
export function closedReason(settings: FormSettings, now = new Date()): "date" | null {
  if (!settings.closeAt) return null
  const at = new Date(settings.closeAt)
  return Number.isNaN(at.getTime()) || at.getTime() > now.getTime() ? null : "date"
}
