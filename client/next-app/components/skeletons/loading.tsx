"use client"

import { PublicFormFixture, TabContentFixture } from "@/components/skeletons/fixtures"
import { Skeleton } from "@/components/skeletons/skeleton"

/* Loading screens. The bones come from `npx boneyard-js build` (see app/bones/page.tsx). */

/* Inside a form tab (Design, Share, Analytics, Responses) while its data gets ready. */
export function TabSkeleton() {
  return (
    <Skeleton name="tab-content" loading fixture={<TabContentFixture />}>
      <TabContentFixture />
    </Skeleton>
  )
}

/* The public form page while it loads. */
export function PublicFormSkeleton() {
  return (
    <Skeleton name="public-form" loading fixture={<PublicFormFixture />}>
      <PublicFormFixture />
    </Skeleton>
  )
}
