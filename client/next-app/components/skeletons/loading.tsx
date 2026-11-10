"use client"

import { PublicFormFixture } from "@/components/skeletons/fixtures"
import { Skeleton } from "@/components/skeletons/skeleton"

/* Loading screens. The bones come from `npx boneyard-js build` (see app/bones/page.tsx). */

/* The public form page while it loads. */
export function PublicFormSkeleton() {
  return (
    <Skeleton name="public-form" loading fixture={<PublicFormFixture />}>
      <PublicFormFixture />
    </Skeleton>
  )
}
