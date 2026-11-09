import {
  BarChart3Icon,
  InboxIcon,
  PencilRulerIcon,
  Settings2Icon,
  Share2Icon,
  type LucideIcon,
} from "lucide-react"

export type WorkspaceTab = {
  slug: string
  label: string
  icon: LucideIcon
}

export const workspaceTabs: WorkspaceTab[] = [
  { slug: "build", label: "Build", icon: PencilRulerIcon },
  { slug: "share", label: "Share", icon: Share2Icon },
  { slug: "responses", label: "Responses", icon: InboxIcon },
  { slug: "analytics", label: "Analytics", icon: BarChart3Icon },
  { slug: "settings", label: "Settings", icon: Settings2Icon },
]
