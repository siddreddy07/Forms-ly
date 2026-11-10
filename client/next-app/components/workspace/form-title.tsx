"use client"

import { useFormGate } from "@/components/workspace/form-gate"

export function FormTitle() {
  const { form } = useFormGate()
  return <>{form.title}</>
}
