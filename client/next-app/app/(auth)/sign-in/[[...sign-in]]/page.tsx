import type { Metadata } from "next"
import { Suspense } from "react"
import { SignIn } from "@clerk/nextjs"

export const metadata: Metadata = { title: "Sign in" }

export default function Page() {
  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-12">
      <Suspense>
        <SignIn />
      </Suspense>
    </div>
  )
}
