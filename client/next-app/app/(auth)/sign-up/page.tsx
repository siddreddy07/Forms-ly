import Link from "next/link"
import type { Metadata } from "next"

import { Logo } from "@/components/brand/logo"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export const metadata: Metadata = { title: "Create account" }

/* Static for now: real auth (provider not chosen yet) plugs in behind lib/auth later. */
export default function Page() {
  return (
    <div className="flex min-h-svh flex-col items-center px-4 pt-8 pb-16">
      <Logo />
      <div className="mt-16 w-full max-w-sm">
        <h1 className="font-display text-4xl font-medium tracking-tight">Create your account</h1>
        <form className="mt-8 grid gap-5">
          <div className="grid gap-2"><Label htmlFor="name">Name</Label><Input id="name" name="name" autoComplete="name" className="h-11 rounded-xl" /></div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" className="h-11 rounded-xl" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" className="h-11 rounded-xl" />
          </div>
          <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
            Create account
          </Link>
        </form>
        <p className="mt-6 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-medium text-foreground underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
