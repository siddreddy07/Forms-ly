import type { MetadataRoute } from "next"

import { siteUrl } from "@/lib/brand"

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/sign-in", "/sign-up"].map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
  }))
}
