"use client"

import { MousePointerClickIcon } from "lucide-react"

import { blockIcons } from "@/components/builder/block-icons"
import { useBuilder } from "@/components/builder/builder-context"
import { blockRegistry } from "@/lib/schema"

function PropertiesPanel() {
  const block = useBuilder((s) => s.doc.steps.flatMap((st) => st.blocks).find((b) => b.id === s.selectedId))

  if (!block) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <MousePointerClickIcon className="size-5 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Select a block to edit it.</p>
      </div>
    )
  }

  const def = blockRegistry[block.type]
  const Icon = blockIcons[block.type]
  return (
    <div className="p-4">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-sm font-medium">{def.label}</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{def.description}</p>
      <p className="mt-6 text-sm text-muted-foreground">Editing options arrive in the next step.</p>
    </div>
  )
}

export { PropertiesPanel }