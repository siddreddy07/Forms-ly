export type FormTemplate = {
  id: string
  name: string
  description: string
  category: "Clients" | "Hiring" | "Events" | "Feedback"
  fields: number
}

/* Placeholder catalogue. Real templates will be schema JSON files in this folder. */
export const templates: FormTemplate[] = [
  { id: "blank", name: "Blank form", description: "Start from nothing.", category: "Clients", fields: 0 },
  { id: "client-intake", name: "Client intake", description: "Goals, budget and timeline for a new client.", category: "Clients", fields: 9 },
  { id: "project-brief", name: "Project brief", description: "Scope, deliverables and who signs off.", category: "Clients", fields: 12 },
  { id: "job-application", name: "Job application", description: "Contact details, experience and a CV upload.", category: "Hiring", fields: 8 },
  { id: "event-signup", name: "Event signup", description: "Name, ticket type and dietary needs.", category: "Events", fields: 6 },
  { id: "website-feedback", name: "Website feedback", description: "A rating and a short note from visitors.", category: "Feedback", fields: 4 },
]
