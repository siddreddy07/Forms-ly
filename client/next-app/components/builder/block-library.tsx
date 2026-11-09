"use client"

import { blockIcons } from "@/components/builder/block-icons"
import { blockGroups, blockRegistry, type BlockType } from "@/lib/schema"

function BlockLibrary({ onPick }: { onPick: (type: BlockType) => void }) {
  return (
    <div className="p-3">
      {blockGroups.map((group) => {
        const items = Object.values(blockRegistry).filter((b) => b.group === group.id)
        return (
          <section key={group.id} className="mb-4 last:mb-0">
            <h3 className="px-1 pb-1.5 text-xs font-medium text-muted-foreground">{group.label}</h3>
            <ul className="grid grid-cols-2 gap-1.5 lg:grid-cols-1">
              {items.map((b) => {
                const Icon = blockIcons[b.type]
                return (
                  <li key={b.type}>
                    <button
                      type="button"
                      onClick={() => onPick(b.type)}
                      title={b.description}
                      className="flex h-10 w-full items-center gap-2.5 rounded-lg border bg-background px-2.5 text-left text-sm outline-none transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="truncate">{b.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

export { BlockLibrary }