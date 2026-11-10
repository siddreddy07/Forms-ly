import type { Metadata } from "next"
import { Suspense } from "react"
import { SignUp } from "@clerk/nextjs"

export const metadata: Metadata = { title: "Sign up" }

export default function Page() {
  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-12">
      <Suspense>
        <SignUp />
      </Suspense>
    </div>
  )
}
