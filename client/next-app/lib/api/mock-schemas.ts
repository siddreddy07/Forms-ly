import { createCafeApplication, createClientIntake, createWebsiteFeedback, type FormDocument } from "@/lib/schema"

/* MOCK: stands in for loading a stored form. Built once so block ids stay stable. */
const documents: Record<string, FormDocument> = {
  f_01: createCafeApplication(),
  f_02: createClientIntake(),
  f_03: createWebsiteFeedback(),
}

export function getFormDocument(id: string): FormDocument | undefined {
  return documents[id]
}