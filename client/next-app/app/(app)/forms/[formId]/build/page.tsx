import type { Metadata } from "next"
import { PencilRulerIcon } from "lucide-react"

import { SectionPlaceholder } from "@/components/workspace/section-placeholder"

export const metadata: Metadata = { title: "Build" }

export default function Page() {
  return <SectionPlaceholder icon={PencilRulerIcon} title="Build" hint="Drag blocks into place. The builder arrives in the next phase." />
}