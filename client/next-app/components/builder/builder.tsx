"use client"

import * as React from "react"
import { PlusIcon, Redo2Icon, Trash2Icon, Undo2Icon } from "lucide-react"

import { BlockLibrary } from "@/components/builder/block-library"
import { BuilderProvider, useBuilder, useHistory } from "@/components/builder/builder-context"
import { Canvas } from "@/components/builder/canvas"
import { PropertiesPanel } from "@/components/builder/properties-panel"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import type { FormDocument } from "@/lib/schema"

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  )
}

function Toolbar() {
  const { canUndo, canRedo, undo, redo } = useHistory()
  const selectedId = useBuilder((s) => s.selectedId)
  const deleteBlock = useBuilder((s) => s.deleteBlock)
  const btn = "size-9"

  return (
    <div className="sticky top-14 z-20 flex items-center gap-1 border-b bg-background/85 px-3 py-2 backdrop-blur-xl lg:top-0">
      <Button variant="ghost" size="icon" className={btn} onClick={undo} disabled={!canUndo} aria-label="Undo" title="Undo (Ctrl+Z)">
        <Undo2Icon />
      </Button>
      <Button variant="ghost" size="icon" className={btn} onClick={redo} disabled={!canRedo} aria-label="Redo" title="Redo (Ctrl+Shift+Z)">
        <Redo2Icon />
      </Button>
      <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
      <Button
        variant="ghost"
        size="icon"
        className={btn}
        disabled={!selectedId}
        onClick={() => selectedId && deleteBlock(selectedId)}
        aria-label="Delete block"
        title="Delete block (Delete)"
      >
        <Trash2Icon />
      </Button>
    </div>
  )
}

function BuilderShell() {
  const addBlock = useBuilder((s) => s.addBlock)
  const selectedId = useBuilder((s) => s.selectedId)
  const deleteBlock = useBuilder((s) => s.deleteBlock)
  const { undo, redo } = useHistory()
  const select = useBuilder((s) => s.select)
  const hasSelection = useBuilder((s) => s.doc.steps.some((st) => st.blocks.some((b) => b.id === s.selectedId)))
  const [libraryOpen, setLibraryOpen] = React.useState(false)

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isTyping(e.target)) return
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault()
        redo()
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault()
        deleteBlock(selectedId)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [undo, redo, selectedId, deleteBlock])

  return (
    <div className="lg:grid lg:h-[calc(100svh-6.5rem)] lg:grid-cols-[15rem_minmax(0,1fr)_18rem]">
      <aside aria-label="Blocks" className="hidden overflow-y-auto border-r lg:block">
        <BlockLibrary onPick={addBlock} />
      </aside>

      <div className="min-w-0 lg:overflow-y-auto">
        <Toolbar />
        <div className={cn("bg-muted/40 px-3 py-4 pb-28 max-lg:min-h-[calc(100svh-7.5rem)] sm:px-6 sm:py-8 lg:min-h-[calc(100%-3.25rem)] lg:pb-8", hasSelection && "max-lg:pb-[46svh]")}>
          <Canvas />
        </div>
      </div>

      <aside aria-label="Properties" className="hidden overflow-y-auto border-l lg:block">
        <PropertiesPanel />
      </aside>

      {/* Phones and tablets: editing panel docks above the tab bar so the canvas stays visible */}
      <div
        role="region"
        aria-label="Block properties"
        aria-hidden={!hasSelection}
        inert={!hasSelection}
        className={cn(
          "fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 flex max-h-[42svh] flex-col overflow-hidden rounded-t-xl border-t bg-background shadow-[0_-8px_30px_-12px_rgb(0_0_0/0.25)] transition-[transform,visibility] duration-300 ease-out lg:hidden",
          hasSelection ? "translate-y-0" : "invisible translate-y-full"
        )}
      >
        <PropertiesPanel compact onClose={() => select(null)} onDelete={() => selectedId && deleteBlock(selectedId)} />
      </div>

      {/* Add button floats above the bottom tab bar */}
      <Button
        size="lg"
        className={cn("fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 h-11 shadow-lg lg:hidden", hasSelection && "invisible")}
        onClick={() => setLibraryOpen(true)}
      >
        <PlusIcon data-icon="inline-start" />
        Add block
      </Button>
      <Sheet open={libraryOpen} onOpenChange={setLibraryOpen}>
        <SheetContent side="bottom" showCloseButton={false} className="data-[side=bottom]:rounded-t-2xl max-h-[80svh] gap-0 p-0">
          <SheetTitle className="sr-only">Add a block</SheetTitle>
          <SheetDescription className="sr-only">Choose a block to add to your form</SheetDescription>
          <div aria-hidden="true" className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-border" />
          <div className="overflow-y-auto pb-[env(safe-area-inset-bottom)]">
            <BlockLibrary
              onPick={(t) => {
                addBlock(t)
                setLibraryOpen(false)
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function Builder({ initial }: { initial: FormDocument }) {
  return (
    <BuilderProvider initial={initial}>
      <BuilderShell />
    </BuilderProvider>
  )
}

export { Builder }