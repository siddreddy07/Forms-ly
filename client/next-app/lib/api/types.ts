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
  /* The top of the form, so the dashboard can draw a small picture of it. */
  preview?: FormPreview
  archived: boolean
}

export type FormPreview = {
  title: string
  description: string
  blocks: { id: string; type: string; label: string; content: string; options: string[] }[]
  design: unknown
}
