"use client"

import Link from "next/link"
import { Show, SignUpButton } from "@clerk/nextjs"

import { authLinks } from "@/lib/brand"

/* A "Start for free" style call to action that knows who is looking. Signed out, it opens sign up (in a modal, or as a
   link). Signed in, there is nothing to sign up for, so the same button goes to the dashboard. Clerk refuses to open
   its sign-in and sign-up modals for someone who is already signed in, which is why this exists. */
export function StartLink({
  className,
  children,
  signedInChildren = "Go to dashboard",
  modal = false,
}: {
  className?: string
  children: React.ReactNode
  signedInChildren?: React.ReactNode
  /* Open sign up in a modal instead of going to the sign up page. */
  modal?: boolean
}) {
  return (
    <>
      <Show when="signed-out">
        {modal ? (
          <SignUpButton mode="modal">
            <button type="button" className={className}>
              {children}
            </button>
          </SignUpButton>
        ) : (
          <Link href={authLinks.signUp} className={className}>
            {children}
          </Link>
        )}
      </Show>
      <Show when="signed-in">
        <Link href="/dashboard" className={className}>
          {signedInChildren}
        </Link>
      </Show>
    </>
  )
}

/* The footer's "Sign in" link becomes "Dashboard" once you are signed in. */
export function SignInLink({ className, children }: { className?: string; children: (label: string) => React.ReactNode }) {
  return (
    <>
      <Show when="signed-out">
        <Link href={authLinks.signIn} className={className}>
          {children("Sign in")}
        </Link>
      </Show>
      <Show when="signed-in">
        <Link href="/dashboard" className={className}>
          {children("Dashboard")}
        </Link>
      </Show>
    </>
  )
}
