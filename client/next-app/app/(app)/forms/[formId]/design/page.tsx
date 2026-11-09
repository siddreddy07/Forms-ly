import type { Metadata } from "next"
import { PaletteIcon } from "lucide-react"

import { SectionPlaceholder } from "@/components/workspace/section-placeholder"

export const metadata: Metadata = { title: "Design" }

export default function Page() {
  return <SectionPlaceholder icon={PaletteIcon} title="Design" hint="Colors, fonts and the look of this form." />
}