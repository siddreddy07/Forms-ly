import type { Metadata } from "next"
import { Settings2Icon } from "lucide-react"

import { SectionPlaceholder } from "@/components/workspace/section-placeholder"

export const metadata: Metadata = { title: "Settings" }

export default function Page() {
  return <SectionPlaceholder icon={Settings2Icon} title="Settings" hint="Name, link address, limits and notifications." />
}