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
export type FormWithDocument = { form: import("@/lib/api/types").FormSummary; document: unknown; version: number }
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
