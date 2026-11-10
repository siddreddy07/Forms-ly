import { eq } from "drizzle-orm"
import { Router } from "express"
import rateLimit from "express-rate-limit"
import { z } from "zod"

import { aiLimits, aiProviders, providerInfo } from "../config/ai.js"
import { db } from "../config/db.js"
import { canEncrypt, decryptSecret, encryptSecret } from "../libs/crypto.js"
import { aiSettingsSchema, verifyAiSettings } from "../libs/ai.js"
import { aiConnections } from "../schema.js"

const router = Router()

// requireUser is added where this router is mounted (see server.ts), so req.user is always set here

// Saving tests the key with a real call to the provider, so keep it from being hammered
const connectLimiter = rateLimit({
  windowMs: 60_000,
  limit: aiLimits.connectsPerMinute,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => req.user!.id,
  message: { error: "Too many attempts. Try again in a minute." },
})

const providers = aiProviders.map((id) => ({ id, ...providerInfo[id] }))

// What the browser may know about a saved connection. The key itself is never in here, only its last 4 characters so
// the person can tell which key is saved.
type Row = typeof aiConnections.$inferSelect
function publicView(row: Row) {
  let keyHint = ""
  try {
    keyHint = `••••${decryptSecret(row.apiKeyEnc).slice(-4)}`
  } catch {
    // Unreadable: the app will ask for the key again when it is used
  }
  return { provider: row.provider, model: row.model, keyHint, connectedAt: row.createdAt, updatedAt: row.updatedAt }
}

// ---------- GET /ai : my AI settings and the providers to choose from ----------

router.get("/", async (req, res) => {
  const [row] = await db.select().from(aiConnections).where(eq(aiConnections.userId, req.user!.id))
  res.json({ providers, connection: row ? publicView(row) : null })
})

// ---------- PUT /ai : save my provider, model and key ----------
// Body: { provider, model, apiKey? }
// Leave out apiKey to keep the saved one and only change the model (same provider).
// The key is tried against the provider first, and only saved if it works.

const saveSchema = z.object({
  provider: aiSettingsSchema.shape.provider,
  model: aiSettingsSchema.shape.model,
  apiKey: aiSettingsSchema.shape.apiKey.optional(),
})

router.put("/", connectLimiter, async (req, res) => {
  if (!canEncrypt()) {
    res.status(503).json({ error: "Saving an AI key isn't set up on the server yet." })
    return
  }
  const body = saveSchema.safeParse(req.body)
  if (!body.success) {
    res.status(400).json({ error: "Check the provider, model and key and try again.", fields: z.flattenError(body.error).fieldErrors })
    return
  }
  const { provider, model } = body.data
  const userId = req.user!.id

  // No new key: keep the saved one, but only for the same provider (a key for one company is useless to another)
  let apiKey = body.data.apiKey
  if (!apiKey) {
    const [existing] = await db.select().from(aiConnections).where(eq(aiConnections.userId, userId))
    if (existing?.provider === provider) {
      try {
        apiKey = decryptSecret(existing.apiKeyEnc)
      } catch {
        // Falls through to asking for the key again
      }
    }
    if (!apiKey) {
      res.status(400).json({ error: "Add your API key.", fields: { apiKey: ["Required"] } })
      return
    }
  }

  const checked = await verifyAiSettings({ provider, model, apiKey })
  if (!checked.ok) {
    res.status(checked.status).json({ error: checked.message })
    return
  }

  const values = { userId, provider, model, apiKeyEnc: encryptSecret(apiKey) }
  const [saved] = await db.insert(aiConnections).values(values).onConflictDoUpdate({ target: aiConnections.userId, set: values }).returning()
  res.json({ connection: publicView(saved!) })
})

// ---------- DELETE /ai : forget my key ----------

router.delete("/", async (req, res) => {
  await db.delete(aiConnections).where(eq(aiConnections.userId, req.user!.id))
  res.status(204).end()
})

export default router
