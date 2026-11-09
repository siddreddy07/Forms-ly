"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { workspaceTabs } from "@/components/workspace/tabs"
import { cn } from "@/lib/utils"

/* Desktop: underline tabs under the header. */
function WorkspaceTabs({ formId }: { formId: string }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Form sections" className="hidden border-b bg-background lg:block">
      <ul className="mx-auto flex max-w-[1800px] gap-1 px-6">
        {workspaceTabs.map((t) => {
          const href = `/forms/${formId}/${t.slug}`
          const active = pathname.startsWith(href)
          return (
            <li key={t.slug}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-11 items-center gap-2 px-3 text-sm font-medium outline-none transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <t.icon className="size-4" aria-hidden="true" />
                {t.label}
                {active && (
                  <span aria-hidden="true" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-foreground" />
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/* Phone and tablet: bottom bar, always within thumb reach. */
function WorkspaceBottomBar({ formId }: { formId: string }) {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Form sections"
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-6">
        {workspaceTabs.map((t) => {
          const href = `/forms/${formId}/${t.slug}`
          const active = pathname.startsWith(href)
          return (
            <li key={t.slug}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-1 text-[10px] font-medium outline-none transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-6 w-10 items-center justify-center rounded-md transition-colors",
                    active && "bg-muted"
                  )}
                >
                  <t.icon className="size-[18px]" aria-hidden="true" />
                </span>
                {t.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export { WorkspaceTabs, WorkspaceBottomBar }
