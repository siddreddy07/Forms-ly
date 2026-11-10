import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

// Encrypts secrets (a user's ImageKit private key) before they go in the database.
// AES-256-GCM: the result also proves nobody changed it. The key comes from STORAGE_ENCRYPTION_KEY (32 bytes, base64).
// To make one: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

function getKey(): Buffer | null {
  const raw = process.env.STORAGE_ENCRYPTION_KEY
  if (!raw) return null
  const key = Buffer.from(raw, "base64")
  return key.length === 32 ? key : null
}

export const canEncrypt = () => getKey() !== null

export function encryptSecret(plain: string): string {
  const key = getKey()
  if (!key) throw new Error("STORAGE_ENCRYPTION_KEY is missing or is not 32 bytes of base64")
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  // v1.<iv>.<tag>.<data>, so the format can change later
  return ["v1", iv, cipher.getAuthTag(), data].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".")
}

export function decryptSecret(stored: string): string {
  const key = getKey()
  if (!key) throw new Error("STORAGE_ENCRYPTION_KEY is missing or is not 32 bytes of base64")
  const [version, iv, tag, data] = stored.split(".")
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Unknown secret format")
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"))
  decipher.setAuthTag(Buffer.from(tag, "base64url"))
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8")
}
