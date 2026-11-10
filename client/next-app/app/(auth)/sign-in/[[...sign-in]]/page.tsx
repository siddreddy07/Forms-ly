import type { Metadata } from "next"
import { Suspense } from "react"
import { WarmGlow } from "@/components/ui/warm-glow"
import { SignIn } from "@clerk/nextjs"

export const metadata: Metadata = { title: "Sign in" }

export default function Page() {
  return (
    <div className="relative isolate flex min-h-svh items-center justify-center px-4 py-12">
      <WarmGlow />
      <Suspense>
        <SignIn />
      </Suspense>
    </div>
  )
}
