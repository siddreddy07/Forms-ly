import { timingSafeEqual } from "node:crypto"

import { and, eq } from "drizzle-orm"
import { Router } from "express"
import rateLimit, { ipKeyGenerator } from "express-rate-limit"
import { z } from "zod"

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

type Form = typeof forms.$inferSelect

function isOpen(form: Form) {
  return form.status === "published" && form.publishedVersion !== null && form.archivedAt === null
}

// The frozen copy made at publish, so edits after publishing do not show until published again
async function liveBody(form: Form) {
  const [published] = await db
    .select()
    .from(formVersions)
    .where(and(eq(formVersions.formId, form.id), eq(formVersions.version, form.publishedVersion!)))
  if (!published) return { state: "unpublished" as const }
  return { state: "live" as const, title: form.title, document: published.document, design: form.design, version: published.version }
}

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

  if (!isOpen(form)) {
    res.json({ state: "unpublished" })
    return
  }
  if (form.access === "private") {
    res.json({ state: "private" })
    return
  }
  res.json(await liveBody(form))
})

// ---------- POST /public/forms/:slug/unlock : open a private form with its 4 digit code ----------
// Body: { code }
// 200 { state: "live", ... }  the right code (the same answer a public form gives)
// 403 { error }               the wrong code
// 4 digits are easy to guess, so guesses are limited hard: a few a minute for each visitor, and a cap for the form as
// a whole so many visitors cannot add up to a brute force.

const unlockPerVisitor = rateLimit({
  windowMs: 60_000,
  limit: 6,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? "")}:${String(req.params.slug)}`,
  handler: (_req, res) => {
    res.status(429).json({ error: "Too many tries. Wait a minute." })
  },
})

const unlockPerForm = rateLimit({
  windowMs: 10 * 60_000,
  limit: 40,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => String(req.params.slug),
  handler: (_req, res) => {
    res.status(429).json({ error: "Too many tries on this form. Try again later." })
  },
})

const unlockSchema = z.object({ code: z.string().regex(/^\d{4}$/) })

function sameCode(a: string, b: string) {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

router.post("/forms/:slug/unlock", unlockPerVisitor, unlockPerForm, async (req, res) => {
  res.set("Cache-Control", "no-store")

  const slug = String(req.params.slug).toLowerCase()
  const body = unlockSchema.safeParse(req.body)
  if (!isSlug(slug) || !body.success) {
    res.status(403).json({ error: "Wrong code" })
    return
  }

  const [form] = await db.select().from(forms).where(eq(forms.slug, slug))
  if (!form) {
    res.status(404).json({ error: "Form not found" })
    return
  }
  if (!isOpen(form)) {
    res.json({ state: "unpublished" })
    return
  }
  if (form.access === "private" && !(form.accessCode && sameCode(form.accessCode, body.data.code))) {
    res.status(403).json({ error: "Wrong code" })
    return
  }
  res.json(await liveBody(form))
})

export default router
