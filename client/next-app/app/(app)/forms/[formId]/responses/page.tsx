import type { Metadata } from "next"

import { ResponsesView } from "@/components/responses/responses-view"

export const metadata: Metadata = { title: "Responses" }

/* The search text and filters live in the address (?q=...&f=...), so a refresh, a shared link or Back keeps them. */
export default async function Page({ params, searchParams }: { params: Promise<{ formId: string }>; searchParams: Promise<{ q?: string | string[]; f?: string | string[] }> }) {
  const { formId } = await params
  const { q, f } = await searchParams
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  return <ResponsesView formId={formId} initialQuery={first(q) ?? ""} initialFilter={first(f) ?? ""} />
}
