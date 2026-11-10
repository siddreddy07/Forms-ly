import { Navbar } from "@/components/marketing/navbar"
import { WarmGlow } from "@/components/ui/warm-glow"

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative isolate">
      <WarmGlow size="hero" />
      <Navbar />
      {/* Cards that fly out of the template stack must never make the page wider than the screen. */}
      <main className="overflow-x-clip">{children}</main>
    </div>
  )
}
