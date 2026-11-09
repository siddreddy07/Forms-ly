export type FormStatus = "draft" | "published" | "closed"

export type FormSummary = {
  id: string
  title: string
  status: FormStatus
  responses: number
  updatedAt: string
  folder?: string
  archived: boolean
}
