import { FormGate } from "@/components/workspace/form-gate"
import { WorkspaceHeader } from "@/components/workspace/workspace-header"
import { WorkspaceBottomBar, WorkspaceTabs } from "@/components/workspace/workspace-nav"

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ formId: string }>
}) {
  const { formId } = await params

  return (
    <FormGate formId={formId}>
      <div className="flex min-h-svh flex-col">
        <WorkspaceHeader formId={formId} />
        <WorkspaceTabs formId={formId} />
        <main className="flex-1 pb-20 lg:pb-0">{children}</main>
        <WorkspaceBottomBar formId={formId} />
      </div>
    </FormGate>
  )
}
