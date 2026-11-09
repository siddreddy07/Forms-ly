"use client"

import * as React from "react"
import { useStore } from "zustand"

import { createBuilderStore, type BuilderActions, type BuilderState, type BuilderStore } from "@/lib/builder/store"
import type { FormDocument } from "@/lib/schema"

const Ctx = React.createContext<BuilderStore | null>(null)

export function BuilderProvider({ initial, children }: { initial: FormDocument; children: React.ReactNode }) {
  const [store] = React.useState(() => createBuilderStore(initial))
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

function useStoreApi() {
  const store = React.useContext(Ctx)
  if (!store) throw new Error("useBuilder must be used inside BuilderProvider")
  return store
}

export function useBuilderStore() {
  return useStoreApi()
}

export function useBuilder<T>(selector: (s: BuilderState & BuilderActions) => T): T {
  return useStore(useStoreApi(), selector)
}

export function useHistory() {
  const store = useStoreApi()
  const canUndo = useStore(store.temporal, (t) => t.pastStates.length > 0)
  const canRedo = useStore(store.temporal, (t) => t.futureStates.length > 0)
  return {
    canUndo,
    canRedo,
    undo: () => store.temporal.getState().undo(),
    redo: () => store.temporal.getState().redo(),
  }
}