import { Navbar } from "@/components/marketing/navbar"
import { WarmGlow } from "@/components/ui/warm-glow"

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative isolate">
      <WarmGlow size="hero" />
      <Navbar />
      <main>{children}</main>
    </div>
  )
}
