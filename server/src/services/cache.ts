import { createHash } from "node:crypto"

import { Redis } from "@upstash/redis"

/* Upstash Redis is optional. Without the two env vars every read goes straight to Postgres, so local
   development and a fresh deploy work before Redis is set up. */
const url = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN
const redis = url && token ? new Redis({ url, token }) : null

export const cacheEnabled = redis !== null
if (!redis) console.log("[cache] disabled (set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to turn it on)")

/* How long a cached read may be reused. Writes bump a version key, so these are only a safety net for
   anything we forget to invalidate (or a change made by another process). */
export const TTL = {
  formList: 30,
  form: 60,
  publicForm: 30,
  responses: 30,
  analytics: 60,
} as const

/* Version keys stay a week past the last write. Any cached payload is long gone by then, so a reset to 0
   can't bring old data back. */
const VERSION_TTL = 60 * 60 * 24 * 7

/* Query strings (search, filters, cursor) can be long. Hashing keeps every key short and free of odd characters. */
const digest = (value: string) => createHash("sha1").update(value).digest("hex")

export const cacheKeys = {
  userVersion: (userId: string) => `forms:user:${userId}:v`,
  formVersion: (formId: string) => `forms:${formId}:v`,
  responsesVersion: (formId: string) => `responses:${formId}:v`,
  formList: (userId: string, version: number, query: string) => `forms:list:${userId}:${version}:${digest(query)}`,
  form: (userId: string, formId: string, version: number) => `forms:one:${userId}:${formId}:${version}`,
  publicForm: (slug: string) => `forms:public:${slug}`,
  responses: (userId: string, formId: string, formVersion: number, responsesVersion: number, query: string) =>
    `responses:list:${userId}:${formId}:${formVersion}:${responsesVersion}:${digest(query)}`,
  analytics: (userId: string, formId: string, formVersion: number, responsesVersion: number, query: string) =>
    `analytics:${userId}:${formId}:${formVersion}:${responsesVersion}:${digest(query)}`,
}

/* One log line per message, so a Redis outage can't flood the server log. */
const logged = new Set<string>()
function logOnce(message: string, error: unknown) {
  if (logged.has(message)) return
  logged.add(message)
  console.error(message, error)
}

/* Read through the cache: return a hit, otherwise run the loader and keep its result for a while.
   A null result is a "not found" and is never cached. Any Redis problem falls back to the loader. */
export async function cached<T>(key: string, ttlSeconds: number, load: () => Promise<T | null>): Promise<T | null> {
  if (!redis) return load()
  try {
    const hit = await redis.get<T>(key)
    if (hit !== null && hit !== undefined) {
      console.log(`[cache] hit  ${key}`)
      return hit
    }
    console.log(`[cache] miss ${key}`)
  } catch (error) {
    logOnce("Redis read failed; serving from the database", error)
  }
  const value = await load()
  if (value === null || value === undefined) return value
  try {
    await redis.set(key, value, { ex: ttlSeconds })
  } catch (error) {
    logOnce("Redis write failed; the read was still served", error)
  }
  return value
}

/* The number in a version key. Missing or unreadable keys are version 0, which is always safe: a later
   write bumps the key and the old cache entry is ignored. */
export async function version(key: string): Promise<number> {
  if (!redis) return 0
  try {
    const value = await redis.get<number>(key)
    const number = Number(value)
    return Number.isFinite(number) ? number : 0
  } catch (error) {
    logOnce("Redis version read failed; using version 0", error)
    return 0
  }
}

/* Bumps one or more version keys. Every cached key includes a version, so this makes all of that form's
   old entries unreachable at once instead of hunting down every query variant. */
export async function bump(...keys: string[]): Promise<void> {
  if (!redis || keys.length === 0) return
  try {
    const pipeline = redis.pipeline()
    for (const key of keys) {
      pipeline.incr(key)
      pipeline.expire(key, VERSION_TTL)
    }
    await pipeline.exec()
  } catch (error) {
    logOnce("Redis version bump failed; cached reads will expire on their own", error)
  }
}

export async function forget(...keys: string[]): Promise<void> {
  if (!redis || keys.length === 0) return
  try {
    await redis.del(...keys)
  } catch (error) {
    logOnce("Redis delete failed; the entry will expire on its own", error)
  }
}

/* A form's document, settings, name or access changed. */
export async function formChanged(formId: string, userId: string, slug?: string | null): Promise<void> {
  await Promise.all([
    bump(cacheKeys.formVersion(formId), cacheKeys.userVersion(userId)),
    slug ? forget(cacheKeys.publicForm(slug)) : Promise.resolve(),
  ])
}

/* A response was submitted or deleted: response counts, lists and analytics change, the form itself does not. */
export async function responsesChanged(formId: string, userId: string): Promise<void> {
  await bump(cacheKeys.responsesVersion(formId), cacheKeys.userVersion(userId))
}
