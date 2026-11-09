import { AppHeader } from "@/components/app-shell/app-header"

export default function MainLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <AppHeader />
      <main>{children}</main>
    </>
  )
}
