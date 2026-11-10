import { ClerkProvider } from "@clerk/nextjs"
import { Funnel_Display, Geist_Mono, Manrope } from "next/font/google"
import type { Metadata } from "next"

import "./globals.css"
import { SyncUser } from "@/components/auth/sync-user"
import { ThemeProvider } from "@/components/theme-provider"
import { brand } from "@/lib/brand"
import { cn } from "@/lib/utils"

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" })
const funnel = Funnel_Display({
  subsets: ["latin"],
  variable: "--font-display",
})
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: { default: `${brand.name}: ${brand.tagline}`, template: `%s | ${brand.name}` },
  description: brand.description,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased font-sans",
        manrope.variable,
        funnel.variable,
        fontMono.variable
      )}
    >
      <body>
        <ClerkProvider>
          <SyncUser />
          <ThemeProvider>{children}</ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}

