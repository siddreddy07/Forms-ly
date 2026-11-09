"use client"

import { useDraggable } from "@dnd-kit/core"
import { CheckIcon, LayoutTemplateIcon } from "lucide-react"

import { blockIcons } from "@/components/builder/block-icons"
import { useBuilder } from "@/components/builder/builder-context"
import { blockGroups, blockRegistry, type BlockType } from "@/lib/schema"

function LibraryItem({ type, onPick, draggable }: { type: BlockType; onPick: (type: BlockType) => void; draggable: boolean }) {
  const def = blockRegistry[type]
  const Icon = blockIcons[type]
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `lib:${type}`, disabled: !draggable })
  return (
    <button
      type="button"
      ref={setNodeRef}
      {...(draggable ? { ...attributes, ...listeners } : {})}
      onClick={() => onPick(type)}
      title={draggable ? `${def.description}. Click to add, or drag onto the form.` : def.description}
      className={`flex h-10 w-full items-center gap-2.5 rounded-lg border bg-background px-2.5 text-left text-sm outline-none transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${draggable ? "cursor-grab active:cursor-grabbing" : ""} ${isDragging ? "opacity-40" : ""}`}
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="truncate">{def.label}</span>
    </button>
  )
}

/* Not a question: the banner, title and description, always placed at the very top. */
function HeaderItem({ onDone }: { onDone?: () => void }) {
  const has = useBuilder((s) => !!s.doc.header)
  const addHeader = useBuilder((s) => s.addHeader)
  return (
    <button
      type="button"
      onClick={() => {
        addHeader()
        onDone?.()
      }}
      title="Banner, title and description at the top of the form"
      className="flex h-10 w-full items-center gap-2.5 rounded-lg border bg-background px-2.5 text-left text-sm outline-none transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <LayoutTemplateIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="truncate">Form header</span>
      {has && <CheckIcon className="ml-auto size-4 shrink-0 text-muted-foreground" aria-label="Added" />}
    </button>
  )
}

function BlockLibrary({ onPick, draggable = false, onHeader }: { onPick: (type: BlockType) => void; draggable?: boolean; onHeader?: () => void }) {
  return (
    <div className="p-3">
      {blockGroups.map((group) => {
        const items = Object.values(blockRegistry).filter((b) => b.group === group.id)
        return (
          <section key={group.id} className="mb-4 last:mb-0">
            <h3 className="px-1 pb-1.5 text-xs font-medium text-muted-foreground">{group.label}</h3>
            <ul className="grid grid-cols-2 gap-1.5 lg:grid-cols-1">
              {group.id === "layout" && (
                <li>
                  <HeaderItem onDone={onHeader} />
                </li>
              )}
              {items.map((b) => (
                <li key={b.type}>
                  <LibraryItem type={b.type} onPick={onPick} draggable={draggable} />
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

export { BlockLibrary }