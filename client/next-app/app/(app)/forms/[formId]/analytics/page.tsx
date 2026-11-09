import type { Metadata } from "next"
import { BarChart3Icon } from "lucide-react"

import { SectionPlaceholder } from "@/components/workspace/section-placeholder"

export const metadata: Metadata = { title: "Analytics" }

export default function Page() {
  return <SectionPlaceholder icon={BarChart3Icon} title="Analytics" hint="Completion rate and where people drop off." />
}