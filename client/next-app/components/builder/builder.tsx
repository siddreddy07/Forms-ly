"use client"

import * as React from "react"
import { CheckIcon, CircleDotIcon, CloudOffIcon, CopyIcon, EyeIcon, HardDriveIcon, PlusIcon, Redo2Icon, Undo2Icon } from "lucide-react"

import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle"
import { Check } from "@/components/animate-ui/icons/check"
import { Trash2 } from "@/components/animate-ui/icons/trash-2"
import { BlockLibrary } from "@/components/builder/block-library"
import { BuilderProvider, useBuilder, useHistory } from "@/components/builder/builder-context"
import { Canvas } from "@/components/builder/canvas"
import { Hint } from "@/components/builder/hint"
import { BuilderDnd } from "@/components/builder/dnd"
import { PreviewPane } from "@/components/builder/preview"
import { PersistenceProvider, useSave } from "@/components/builder/persistence"
import { PropertiesPanel } from "@/components/builder/properties-panel"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { useFormGate } from "@/components/workspace/form-gate"
import { HEADER_ID } from "@/lib/builder/store"
import { cn } from "@/lib/utils"
import type { FormDocument } from "@/lib/schema"

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  )
}

const saveLabel = { saved: "All changes saved", dirty: "Saving soon", drafted: "Saving soon", saving: "Saving...", error: "Couldn't save" } as const
const saveHint = {
  saved: "Everything you've done is saved.",
  dirty: "Your changes save by themselves in a moment.",
  drafted: "Your changes are safe on this device and save by themselves in a moment.",
  saving: "Saving your form...",
  error: "We'll keep trying. Your changes are still here. You can also click Save to try now.",
} as const

function SaveControls() {
  const { status, backupFailed, save, publish, publishing, version } = useSave()
  const { publishInfo } = useFormGate()
  const unsaved = status !== "saved"
  const live = publishInfo.published
  const upToDate = live && !unsaved && publishInfo.publishedVersion === version
  const publishLabel = upToDate ? "Published" : live ? "Save & update" : "Save & publish"
  const Icon = { saved: CheckIcon, dirty: CircleDotIcon, drafted: HardDriveIcon, saving: CircleDotIcon, error: CloudOffIcon }[status]
  return (
    <div className="ml-auto flex items-center gap-2">
      <Hint title={saveLabel[status]} description={saveHint[status]}>
        <span role="status" className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {status === "saving" ? (
            <LoaderCircle animate size={16} className="size-4" aria-hidden="true" />
          ) : status === "saved" ? (
            <Check animate size={16} className="size-4" aria-hidden="true" />
          ) : (
            <Icon className="size-4" aria-hidden="true" />
          )}
          <span className="max-sm:sr-only">{backupFailed ? "Close this page and you may lose changes" : saveLabel[status]}</span>
        </span>
      </Hint>
      <Hint title="Save" description="Keep your changes." shortcut="Ctrl S">
        <Button size="sm" variant="outline" onClick={save} disabled={status === "saved" || status === "saving"} className={cn(!unsaved && "max-sm:hidden")}>
          Save
        </Button>
      </Hint>
      <Hint title={publishLabel} description={live ? "Make your latest changes live." : "Save, then get a link you can share."}>
        <Button size="sm" onClick={publish} disabled={upToDate || publishing || status === "saving"} className={cn(unsaved && "max-sm:hidden")}>
          {publishing ? "Publishing" : publishLabel}
        </Button>
      </Hint>
    </div>
  )
}

function Toolbar({ onPreview }: { onPreview: () => void }) {
  const { canUndo, canRedo, undo, redo } = useHistory()
  const picked = useBuilder((s) => s.selectedId)
  const selectedId = picked === HEADER_ID ? null : picked
  const deleteBlock = useBuilder((s) => s.deleteBlock)
  const duplicateBlock = useBuilder((s) => s.duplicateBlock)
  const btn = "size-9"

  return (
    <div className="sticky top-14 z-5 flex items-center gap-1 border-b bg-background/85 px-3 py-2 backdrop-blur-xl lg:top-0">
      <Hint title="Undo" description="Step back one change." shortcut="Ctrl Z">
        <Button variant="ghost" size="icon" className={btn} onClick={undo} disabled={!canUndo} aria-label="Undo">
          <Undo2Icon />
        </Button>
      </Hint>
      <Hint title="Redo" description="Bring back what you undid." shortcut="Ctrl Shift Z">
        <Button variant="ghost" size="icon" className={btn} onClick={redo} disabled={!canRedo} aria-label="Redo">
          <Redo2Icon />
        </Button>
      </Hint>
      <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
      <Hint title="Duplicate" description="Copy the selected block right below it." shortcut="Ctrl D">
        <Button variant="ghost" size="icon" className={btn} disabled={!selectedId} onClick={() => selectedId && duplicateBlock(selectedId)} aria-label="Duplicate block">
          <CopyIcon />
        </Button>
      </Hint>
      <Hint title="Delete" description="Remove the selected block. Undo brings it back." shortcut="Del">
        <Button variant="ghost" size="icon" className={btn} disabled={!picked} onClick={() => picked && deleteBlock(picked)} aria-label="Delete block">
          <Trash2 animateOnHover size={16} className="size-4" />
        </Button>
      </Hint>
      <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
      <Hint title="Preview" description="Try the form as a visitor would. Nothing is sent." shortcut="P">
        <Button variant="ghost" size="icon" className={btn} onClick={onPreview} aria-label="Preview form">
          <EyeIcon />
        </Button>
      </Hint>
      <SaveControls />
    </div>
  )
}

function BuilderShell() {
  const { formId } = useSave()
  const addBlock = useBuilder((s) => s.addBlock)
  const picked = useBuilder((s) => s.selectedId)
  const selectedId = picked === HEADER_ID ? null : picked
  const deleteBlock = useBuilder((s) => s.deleteBlock)
  const { undo, redo } = useHistory()
  const select = useBuilder((s) => s.select)
  const duplicateBlock = useBuilder((s) => s.duplicateBlock)
  const moveBlock = useBuilder((s) => s.moveBlock)
  const hasSelection = useBuilder((s) => s.selectedId === HEADER_ID || s.doc.steps.some((st) => st.blocks.some((b) => b.id === s.selectedId)))
  const [libraryOpen, setLibraryOpen] = React.useState(false)
  const [previewing, setPreviewing] = React.useState(false)

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isTyping(e.target)) return
      if (previewing) {
        if (e.key === "Escape") setPreviewing(false)
        return
      }
      if (e.key.toLowerCase() === "p" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        setPreviewing(true)
        return
      }
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault()
        redo()
      } else if (mod && e.key.toLowerCase() === "d" && selectedId) {
        e.preventDefault()
        duplicateBlock(selectedId)
      } else if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown") && selectedId) {
        e.preventDefault()
        moveBlock(selectedId, e.key === "ArrowUp" ? -1 : 1)
      } else if ((e.key === "Delete" || e.key === "Backspace") && picked) {
        e.preventDefault()
        deleteBlock(picked)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [undo, redo, selectedId, picked, deleteBlock, duplicateBlock, moveBlock, previewing])

  if (previewing) return <PreviewPane formId={formId} onExit={() => setPreviewing(false)} />

  return (
    <div className="lg:grid lg:h-[calc(100svh-6.5rem)] lg:grid-cols-[15rem_minmax(0,1fr)_18rem]">
      <aside aria-label="Blocks" className="hidden overflow-y-auto border-r lg:block">
        <BlockLibrary onPick={addBlock} draggable />
      </aside>

      <div className="min-w-0 lg:overflow-y-auto">
        <Toolbar onPreview={() => setPreviewing(true)} />
        <div className={cn("bg-muted/40 px-2 py-3 pb-28 max-lg:min-h-[calc(100svh-7.5rem)] sm:px-5 sm:py-6 lg:min-h-[calc(100%-3.25rem)] lg:pb-8", hasSelection && "max-lg:pb-[46svh]")}>
          <Canvas />
        </div>
      </div>

      <aside aria-label="Properties" className="hidden overflow-y-auto border-l lg:block">
        <PropertiesPanel onDelete={() => picked && deleteBlock(picked)} />
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
        <PropertiesPanel compact onClose={() => select(null)} onDelete={() => picked && deleteBlock(picked)} />
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
              onHeader={() => setLibraryOpen(false)}
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

function Builder({ formId, initial }: { formId: string; initial: FormDocument }) {
  return (
    <BuilderProvider initial={initial}>
      <PersistenceProvider formId={formId} initial={initial}>
        <BuilderDnd>
          <BuilderShell />
        </BuilderDnd>
      </PersistenceProvider>
    </BuilderProvider>
  )
}

export { Builder }