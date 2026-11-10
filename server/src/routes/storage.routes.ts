import { eq } from "drizzle-orm"
import { Router } from "express"
import rateLimit from "express-rate-limit"
import { z } from "zod"

import { db } from "../config/db.js"
import { canEncrypt, encryptSecret } from "../libs/crypto.js"
import { storageConnections } from "../schema.js"
import { MAX_FILE_BYTES, PLATFORM_FREE_FILES, platformFilesUsed, platformStorage, testConnection } from "../services/storage.js"

const router = Router()

// requireUser is added where this router is mounted (see server.ts), so req.user is always set here

// Connecting does a real upload to ImageKit, so keep it from being hammered
const connectLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => req.user!.id,
  message: { error: "Too many attempts. Try again in a minute." },
})

const connectSchema = z.object({
  urlEndpoint: z
    .string()
    .trim()
    .max(300)
    .refine((v) => /^https:\/\/[^\s/]+\/?\S*$/.test(v), "Use the full address, starting with https://")
    .transform((v) => v.replace(/\/+$/, "")),
  publicKey: z.string().trim().min(1).max(200),
  privateKey: z.string().trim().min(1).max(200),
})

// Where do my form uploads go, and how much of the free limit is used?
router.get("/", async (req, res) => {
  const userId = req.user!.id
  const [own] = await db.select().from(storageConnections).where(eq(storageConnections.userId, userId))
  const used = own ? 0 : await platformFilesUsed(userId)
  res.json({
    maxFileBytes: MAX_FILE_BYTES,
    // Our storage: used until the owner connects their own
    platform: { available: platformStorage() !== null, limit: PLATFORM_FREE_FILES, used },
    // Never includes the private key
    own: own ? { provider: own.provider, urlEndpoint: own.urlEndpoint, publicKey: own.publicKey, connectedAt: own.createdAt } : null,
  })
})

// Connect my own ImageKit
router.put("/imagekit", connectLimiter, async (req, res) => {
  if (!canEncrypt()) {
    res.status(503).json({ error: "Connecting your own storage isn't set up on the server yet." })
    return
  }
  const parsed = connectSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: "Check the details and try again.", fields: z.flattenError(parsed.error).fieldErrors })
    return
  }
  const { urlEndpoint, publicKey, privateKey } = parsed.data

  if (!(await testConnection({ privateKey, publicKey }))) {
    res.status(400).json({ error: "ImageKit didn't accept these keys. Copy the public and private key again from your ImageKit dashboard." })
    return
  }

  const values = { userId: req.user!.id, provider: "imagekit" as const, urlEndpoint, publicKey, privateKeyEnc: encryptSecret(privateKey) }
  const [saved] = await db
    .insert(storageConnections)
    .values(values)
    .onConflictDoUpdate({ target: storageConnections.userId, set: values })
    .returning()
  res.json({ own: { provider: saved.provider, urlEndpoint: saved.urlEndpoint, publicKey: saved.publicKey, connectedAt: saved.createdAt } })
})

// Disconnect it. New uploads go back to our storage (and its free limit).
router.delete("/imagekit", async (req, res) => {
  await db.delete(storageConnections).where(eq(storageConnections.userId, req.user!.id))
  res.status(204).end()
})

export default router
