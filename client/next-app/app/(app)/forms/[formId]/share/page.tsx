import type { Metadata } from "next"
import { Share2Icon } from "lucide-react"

import { SectionPlaceholder } from "@/components/workspace/section-placeholder"

export const metadata: Metadata = { title: "Share" }

export default function Page() {
  return <SectionPlaceholder icon={Share2Icon} title="Share" hint="Publish, copy the link, and embed the form." />
}