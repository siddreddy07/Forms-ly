"use client"

import { Button } from "@/components/ui/button"

/* The backend couldn't be reached. The link itself may be fine, so offer another try. */
export default function PublicFormError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto grid min-h-svh max-w-sm content-center gap-3 px-4 text-center">
      <h1 className="font-display text-2xl font-medium">We couldn&apos;t open this form</h1>
      <p className="text-sm text-muted-foreground">Check your connection and try again.</p>
      <div className="flex justify-center">
        <Button onClick={reset}>Try again</Button>
      </div>
    </main>
  )
}
