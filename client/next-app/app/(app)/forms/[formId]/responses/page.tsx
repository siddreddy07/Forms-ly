import type { Metadata } from "next"
import { InboxIcon } from "lucide-react"

import { SectionPlaceholder } from "@/components/workspace/section-placeholder"

export const metadata: Metadata = { title: "Responses" }

export default function Page() {
  return <SectionPlaceholder icon={InboxIcon} title="Responses" hint="Every submission, with filters and CSV export." />
}