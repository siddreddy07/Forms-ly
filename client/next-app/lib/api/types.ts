export type FormStatus = "draft" | "published" | "closed"

export type FormSummary = {
  id: string
  title: string
  status: FormStatus
  responses: number
  access?: "public" | "private"
  /* The public link, once the form has been published: /f/<slug>. */
  slug?: string | null
  updatedAt: string
  folder?: string
  archived: boolean
}
