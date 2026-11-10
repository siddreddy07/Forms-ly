import {
  createClientIntake,
  createCafeApplication,
  createEmptyForm,
  createWebsiteFeedback,
  type FormDocument,
} from "@/lib/schema"

/* Shapes of what the backend sends for /forms (see server/src/routes/forms.routes.ts). */
export type FormListResponse = { forms: import("@/lib/api/types").FormSummary[] }
export type FormResponse = { form: import("@/lib/api/types").FormSummary }
/* Is the form live, which link, and has it been edited since it went live? */
export type PublishInfo = {
  published: boolean
  slug: string | null
  /* The saved version that is live. */
  publishedVersion: number | null
  publishedAt: string | null
  hasChanges: boolean
}
export type FormWithDocument = {
  form: import("@/lib/api/types").FormSummary
  document: unknown
  version: number
  design: unknown
  publish: PublishInfo
}
export type PublishResponse = { form: import("@/lib/api/types").FormSummary; publish: PublishInfo }

/* What GET /public/forms/:slug answers (no sign-in). Never includes the owner or the form's id. */
export type PublicFormResponse =
  | { state: "unpublished" }
  | { state: "private" }
  | { state: "live"; title: string; document: unknown; design: unknown; version: number }
export type SaveResponse = { version: number; updatedAt: string; title?: string }
export type ConflictResponse = { document: unknown; version: number; updatedAt: string }

/* The starting document for each template in the New form dialog.
   Only a few real templates exist so far; the rest start blank. */
export function documentForTemplate(templateId: string): FormDocument {
  switch (templateId) {
    case "client-intake":
      return createClientIntake()
    case "job-application":
      return createCafeApplication()
    case "website-feedback":
      return createWebsiteFeedback()
    default:
      return createEmptyForm()
  }
}
