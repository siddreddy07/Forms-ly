import type { FormSummary } from "./types"

/* MOCK DATA: replaced by the real API later. */
export const mockForms: FormSummary[] = [
  { id: "f_01", title: "Café job application", status: "published", responses: 128, updatedAt: "2026-11-08T14:20:00Z", archived: false },
  { id: "f_02", title: "Client intake brief", status: "published", responses: 46, updatedAt: "2026-11-07T09:05:00Z", archived: false },
  { id: "f_03", title: "Website feedback", status: "draft", responses: 0, updatedAt: "2026-11-06T17:40:00Z", archived: false },
  { id: "f_04", title: "Pop-up event signup", status: "closed", responses: 312, updatedAt: "2026-10-28T11:00:00Z", archived: false },
  { id: "f_06", title: "Spring menu survey", status: "closed", responses: 87, updatedAt: "2026-09-14T10:00:00Z", archived: true },
  { id: "f_05", title: "Project kickoff questions", status: "draft", responses: 3, updatedAt: "2026-10-22T08:15:00Z", archived: false },
]

