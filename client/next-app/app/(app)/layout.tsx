import type { Metadata } from "next"

import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {children}
      <Toaster position="top-center" />
    </>
  )
}
