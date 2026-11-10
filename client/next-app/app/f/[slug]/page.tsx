import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { PublicFormView } from "@/components/forms/public-form-view"
import { API_URL } from "@/lib/api/config"
import type { PublicFormResponse } from "@/lib/api/forms"

/* Asks the backend what this link is. Never cached: the owner can unpublish or make it private at any moment.
   Next only sends this request once per page even though both the title and the page ask for it. */
async function load(slug: string): Promise<PublicFormResponse | null> {
  const res = await fetch(`${API_URL}/public/forms/${encodeURIComponent(slug)}`, { cache: "no-store" })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`The backend answered ${res.status}`)
  return (await res.json()) as PublicFormResponse
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const data = await load(slug)
  return { title: data?.state === "live" ? data.title : "Form" }
}

/* Public form page. No account, no app shell. */
export default async function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await load(slug)
  if (!data) notFound()
  return <PublicFormView slug={slug} data={data} />
}
