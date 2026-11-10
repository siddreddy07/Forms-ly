"use client"

import { notFound } from "next/navigation"

import { Skeleton } from "@/components/skeletons/skeleton"

import { DashboardFormsFixture, FormCanvasFixture, PublicFormFixture, TabContentFixture } from "@/components/skeletons/fixtures"

/* Developer-only page for `npx boneyard-js build`. It shows each named skeleton's fixture so the tool can
   measure it. It does not exist in production. After changing a layout, run the build again. */
export default function BonesPage() {
  if (process.env.NODE_ENV === "production") notFound()
  return (
    <div className="grid gap-16">
      <Skeleton name="dashboard-forms" loading={false} fixture={<DashboardFormsFixture />}>
        <DashboardFormsFixture />
      </Skeleton>
      <Skeleton name="tab-content" loading={false} fixture={<TabContentFixture />}>
        <TabContentFixture />
      </Skeleton>
      <Skeleton name="public-form" loading={false} fixture={<PublicFormFixture />}>
        <PublicFormFixture />
      </Skeleton>
      <Skeleton name="form-canvas" loading={false} fixture={<FormCanvasFixture />}>
        <FormCanvasFixture />
      </Skeleton>
    </div>
  )
}
