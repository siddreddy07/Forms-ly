import { WorkspaceHeader } from "@/components/workspace/workspace-header"
import { WorkspaceBottomBar, WorkspaceTabs } from "@/components/workspace/workspace-nav"
import { mockForms } from "@/lib/api/mock-forms"

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ formId: string }>
}) {
  const { formId } = await params
  /* Forms created in the dashboard are not saved yet, so unknown ids fall back to a blank draft. */
  const form = mockForms.find((f) => f.id === formId)

  return (
    <div className="flex min-h-svh flex-col">
      <WorkspaceHeader title={form?.title ?? "Untitled form"} status={form?.status ?? "draft"} />
      <WorkspaceTabs formId={formId} />
      <main className="flex-1 pb-20 lg:pb-0">{children}</main>
      <WorkspaceBottomBar formId={formId} />
    </div>
  )
}