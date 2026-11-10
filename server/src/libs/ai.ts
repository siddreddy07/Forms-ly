import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogle } from "@ai-sdk/google"
import { createGroq } from "@ai-sdk/groq"
import { createOpenAI } from "@ai-sdk/openai"
import { APICallError, generateText, type LanguageModel } from "ai"
import { eq } from "drizzle-orm"
import rateLimit, { ipKeyGenerator } from "express-rate-limit"
import { z } from "zod"

import { aiLimits, aiProviders, providerInfo, type AiProvider } from "../config/ai.js"
import { db } from "../config/db.js"
import { decryptSecret } from "./crypto.js"
import { aiConnections } from "../schema.js"

// One place that turns "this person's saved company and key" into a model the AI SDK can call, and turns
// the ways that can fail into messages we can show. See config/ai.ts for the settings.

export const aiSettingsSchema = z.object({
  provider: z.enum(aiProviders),
  apiKey: z.string().trim().min(aiLimits.minKeyLength).max(aiLimits.maxKeyLength),
})
export type AiSettings = z.infer<typeof aiSettingsSchema>

// The model to call. A new client each time because the key is different for every person, so nothing is shared
// between people.
export function modelFor({ provider, apiKey }: AiSettings): LanguageModel {
  const model = providerInfo[provider].model
  const make: Record<AiProvider, () => LanguageModel> = {
    openai: () => createOpenAI({ apiKey })(model),
    anthropic: () => createAnthropic({ apiKey })(model),
    google: () => createGoogle({ apiKey })(model),
    groq: () => createGroq({ apiKey })(model),
  }
  return make[provider]()
}

// What this person saved, with the key decrypted. Only for server-side use: it must never reach the browser.
export async function loadAiSettings(userId: string): Promise<AiSettings | null> {
  const [row] = await db.select().from(aiConnections).where(eq(aiConnections.userId, userId))
  if (!row) return null
  return { provider: row.provider, apiKey: decryptSecret(row.apiKeyEnc) }
}

export type UserModel = { ok: true; model: LanguageModel; settings: AiSettings } | { ok: false; status: number; error: string }

// What an AI route calls first: this person's model, or the reason they cannot use the AI yet
export async function modelForUser(userId: string): Promise<UserModel> {
  let settings: AiSettings | null
  try {
    settings = await loadAiSettings(userId)
  } catch {
    // The stored key cannot be read (for example the server's encryption key changed), so ask them to add it again
    return { ok: false, status: 409, error: "Your saved AI key can't be read. Add it again in Settings." }
  }
  if (!settings) return { ok: false, status: 409, error: "Choose an AI company and add your API key in Settings." }
  return { ok: true, model: modelFor(settings), settings }
}

// Options every AI call here should use
export const callDefaults = () => ({
  maxOutputTokens: aiLimits.maxOutputTokens,
  maxRetries: aiLimits.maxRetries,
  abortSignal: AbortSignal.timeout(aiLimits.timeoutMs),
})

// What went wrong, in words for the person, with the HTTP status to answer with. Never includes the key or the
// provider's raw response, which can echo the request.
export function describeAiError(error: unknown): { status: number; message: string } {
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return { status: 504, message: "The AI took too long to answer. Try again." }
  }
  if (APICallError.isInstance(error)) {
    switch (error.statusCode) {
      case 401:
      case 403:
        return { status: 400, message: "The provider rejected your API key. Check it and try again." }
      case 404:
        return { status: 400, message: "The provider doesn't have the model we use. Try again later." }
      case 429:
        return { status: 429, message: "The provider says you are out of quota or going too fast. Try again later." }
    }
    return { status: 502, message: "The AI provider had a problem. Try again." }
  }
  return { status: 502, message: "The AI couldn't answer. Try again." }
}

// Does this company's key work? Asks for a one word reply, so it costs almost nothing.
export async function verifyAiSettings(settings: AiSettings): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  try {
    await generateText({ model: modelFor(settings), prompt: "Reply with the word ok.", maxOutputTokens: 32, maxRetries: 0, abortSignal: AbortSignal.timeout(aiLimits.timeoutMs) })
    return { ok: true }
  } catch (error) {
    return { ok: false, ...describeAiError(error) }
  }
}

// Limits how often one person can call the AI routes
export const aiLimiter = rateLimit({
  windowMs: 60_000,
  limit: aiLimits.requestsPerMinute,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? ""),
  handler: (_req, res) => {
    res.status(429).json({ error: "Too many AI requests. Wait a minute." })
  },
})
