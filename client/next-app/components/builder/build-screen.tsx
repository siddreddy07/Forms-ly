"use client"

import { Builder } from "@/components/builder/builder"
import { useFormGate } from "@/components/workspace/form-gate"

/* The form is already loaded by the workspace, so the builder starts from the saved copy. */
export function BuildScreen({ formId }: { formId: string }) {
  const { doc } = useFormGate()
  return <Builder formId={formId} initial={doc} />
}
