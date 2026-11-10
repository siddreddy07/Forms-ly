import { and, eq } from "drizzle-orm"
import { Router } from "express"
import rateLimit from "express-rate-limit"

import { db } from "../config/db.js"
import { isSlug } from "../libs/slug.js"
import { formVersions, forms } from "../schema.js"

// Everything here is open to anyone, with no sign-in. So it only ever sends what a person filling in the form
// needs: the published copy, the design and the title. Never the owner, the id or the unpublished draft.
const router = Router()

const publicLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: "Too many requests. Try again in a moment." })
  },
})

// ---------- GET /public/forms/:slug : the form people fill in ----------
// 404                       no form has this link
// { state: "unpublished" }  not open (unpublished, archived)
// { state: "private" }      the owner made it private
// { state: "live", title, document, design, version }

router.get("/forms/:slug", publicLimiter, async (req, res) => {
  // Access can change at any moment, so nobody should keep an old answer
  res.set("Cache-Control", "no-store")

  const slug = String(req.params.slug).toLowerCase()
  if (!isSlug(slug)) {
    res.status(404).json({ error: "Form not found" })
    return
  }

  const [form] = await db.select().from(forms).where(eq(forms.slug, slug))
  if (!form) {
    res.status(404).json({ error: "Form not found" })
    return
  }

  const open = form.status === "published" && form.publishedVersion !== null && form.archivedAt === null
  if (!open) {
    res.json({ state: "unpublished" })
    return
  }
  if (form.access === "private") {
    res.json({ state: "private" })
    return
  }

  // The frozen copy made at publish, so edits after publishing do not show until published again
  const [published] = await db
    .select()
    .from(formVersions)
    .where(and(eq(formVersions.formId, form.id), eq(formVersions.version, form.publishedVersion!)))
  if (!published) {
    res.json({ state: "unpublished" })
    return
  }

  res.json({ state: "live", title: form.title, document: published.document, design: form.design, version: published.version })
})

export default router
