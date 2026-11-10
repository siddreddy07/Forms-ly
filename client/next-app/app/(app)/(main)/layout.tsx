import { AppHeader } from "@/components/app-shell/app-header"
import { WarmGlow } from "@/components/ui/warm-glow"

export default function MainLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative isolate">
      <WarmGlow />
      <AppHeader />
      <main>{children}</main>
    </div>
  )
}
