import ImageKit from "@imagekit/nodejs"
import { and, count, eq } from "drizzle-orm"

import { db } from "../config/db.js"
import { decryptSecret } from "../libs/crypto.js"
import { files, storageConnections } from "../schema.js"

// Where form uploads (files people attach when they fill in a form) are kept.
// People upload straight from their browser to ImageKit. We only hand out a short-lived signature and, when they
// submit, check what they uploaded. See section 10 of BackendPlan.md.

export const MAX_FILE_BYTES = 3 * 1024 * 1024 // 3 MB
export const PLATFORM_FREE_FILES = 2 // per account, on our storage, while no own ImageKit is connected
export const SIGN_TTL_SECONDS = 5 * 60 // an upload signature works for 5 minutes
export const SIGNED_URL_SECONDS = 60 * 60 // a link to a private file works for 1 hour

export type Storage = {
  /** platform: our ImageKit account. own: the form owner's. */
  source: "platform" | "own"
  client: ImageKit
  publicKey: string
  urlEndpoint: string
}

// Our own account, from env. Missing keys just mean uploads are off, so the server still starts.
let platform: Storage | null | undefined
export function platformStorage(): Storage | null {
  if (platform !== undefined) return platform
  const { IMAGEKIT_PRIVATE_KEY: privateKey, IMAGEKIT_PUBLIC_KEY: publicKey, IMAGEKIT_URL_ENDPOINT: urlEndpoint } = process.env
  platform = privateKey && publicKey && urlEndpoint ? { source: "platform", client: new ImageKit({ privateKey }), publicKey, urlEndpoint } : null
  return platform
}

// The storage a form owner's uploads go to: their own ImageKit if they connected one, otherwise ours.
export async function storageFor(ownerId: string): Promise<Storage | null> {
  const [own] = await db.select().from(storageConnections).where(eq(storageConnections.userId, ownerId))
  if (!own) return platformStorage()
  return {
    source: "own",
    client: new ImageKit({ privateKey: decryptSecret(own.privateKeyEnc) }),
    publicKey: own.publicKey,
    urlEndpoint: own.urlEndpoint,
  }
}

// Only the owner's own ImageKit account, or null when they haven't connected one (no fallback to ours)
export async function ownStorage(ownerId: string): Promise<Storage | null> {
  const [own] = await db.select().from(storageConnections).where(eq(storageConnections.userId, ownerId))
  if (!own) return null
  return {
    source: "own",
    client: new ImageKit({ privateKey: decryptSecret(own.privateKeyEnc) }),
    publicKey: own.publicKey,
    urlEndpoint: own.urlEndpoint,
  }
}

// How many files this account has on OUR storage (the free limit counts these)
export async function platformFilesUsed(ownerId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(files)
    .where(and(eq(files.ownerId, ownerId), eq(files.onPlatform, true)))
  return row?.n ?? 0
}

// What the browser needs to upload one file straight to ImageKit. The private key never leaves the server.
export function uploadAuth(storage: Storage, formId: string) {
  const { token, expire, signature } = signUpload(storage.client)
  return {
    publicKey: storage.publicKey,
    token,
    expire,
    signature,
    folder: formFolder(formId),
    // Extra fields the browser must send; ImageKit's own check also stops an oversized file for honest clients
    isPrivateFile: true,
    checks: `'file.size' < '${MAX_FILE_BYTES / 1024 / 1024}MB'`,
  }
}

// The SDK says its `expire` argument is "seconds from now", but it uses the number as it is: a Unix timestamp.
// So we give it the exact time the signature should stop working.
function signUpload(client: ImageKit) {
  return client.helper.getAuthenticationParameters(undefined, Math.floor(Date.now() / 1000) + SIGN_TTL_SECONDS)
}

export const formFolder = (formId: string) => `/forms/${formId}`

export type FileCheck = { ok: true; fileId: string; filePath: string; name: string; size: number; mime: string } | { ok: false; reason: string }

// The signature does not cover file size or type, so after an upload we ask ImageKit what actually arrived.
export async function checkUploadedFile(
  storage: Storage,
  fileId: string,
  rules: { formId: string; allowedMime?: (mime: string) => boolean }
): Promise<FileCheck> {
  let file
  try {
    file = await storage.client.files.get(fileId)
  } catch {
    return { ok: false, reason: "We couldn't find that upload." }
  }
  const { filePath, name, size, mime } = file
  if (!filePath || !name || size === undefined || !mime) return { ok: false, reason: "We couldn't read that upload." }
  if (!filePath.startsWith(`${formFolder(rules.formId)}/`)) return { ok: false, reason: "That file was not uploaded for this form." }
  if (size > MAX_FILE_BYTES) return { ok: false, reason: "A file is over 3 MB." }
  if (rules.allowedMime && !rules.allowedMime(mime)) return { ok: false, reason: "That file type isn't allowed." }
  return { ok: true, fileId, filePath, name, size, mime }
}

// Removes a file from ImageKit. A file that is already gone is fine.
// Returns true if it was deleted now, false if it was already gone.
export async function deleteStoredFile(storage: Storage, fileId: string): Promise<boolean> {
  try {
    await storage.client.files.delete(fileId)
    return true
  } catch (error) {
    if (error instanceof ImageKit.NotFoundError) return false
    throw error
  }
}

// A link to a private file that stops working after an hour. For the form owner only.
export function privateFileUrl(storage: Storage, filePath: string) {
  return storage.client.helper.buildSrc({
    urlEndpoint: storage.urlEndpoint,
    src: filePath,
    signed: true,
    expiresIn: SIGNED_URL_SECONDS,
  })
}

// Used when someone connects their own ImageKit: does a real browser-style upload of a tiny file with the
// keys they gave us, then deletes it. That proves the private key, the public key and the signing all work.
export async function testConnection(keys: { privateKey: string; publicKey: string }): Promise<boolean> {
  const client = new ImageKit({ privateKey: keys.privateKey })
  try {
    const { token, expire, signature } = signUpload(client)
    const form = new FormData()
    form.set("file", new Blob(["ok"], { type: "text/plain" }), "connection-test.txt")
    form.set("fileName", "connection-test.txt")
    form.set("publicKey", keys.publicKey)
    form.set("signature", signature)
    form.set("expire", String(expire))
    form.set("token", token)
    form.set("folder", "/formly-test")
    form.set("isPrivateFile", "true")
    form.set("useUniqueFileName", "true")
    const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", { method: "POST", body: form, signal: AbortSignal.timeout(15000) })
    if (!res.ok) return false
    const { fileId } = (await res.json()) as { fileId?: string }
    if (!fileId) return false
    await client.files.delete(fileId).catch(() => {})
    return true
  } catch {
    return false
  }
}

// Deletes everything in a form's folder in this ImageKit account (uploads that were submitted or not), then the
// folder itself. ImageKit's file listing can lag behind by several seconds, so the one-by-one pass may miss a very
// recent upload; deleting the folder is what removes those. Returns how many files were deleted one by one, whether
// the folder is gone, and a reason for each thing that would not delete.
export async function deleteFormFiles(
  storage: Storage,
  formId: string
): Promise<{ deleted: number; folderDeleted: boolean; failed: string[] }> {
  const folder = `${formFolder(formId)}/`
  const failed: string[] = []
  let deleted = 0
  const pageSize = 100

  // Each round lists what is left. A file that fails to delete stays in the list, so it is only tried once.
  const tried = new Set<string>()
  for (let round = 0; round < 50; round++) {
    const items = await storage.client.assets.list({ path: folder, type: "file", limit: pageSize })
    const fresh = items.filter((item) => item.type === "file" && item.fileId && !tried.has(item.fileId))
    if (fresh.length === 0) break
    for (const item of fresh) {
      tried.add(item.fileId!)
      try {
        if (await deleteStoredFile(storage, item.fileId!)) deleted++
      } catch (error) {
        failed.push(`${item.fileId}: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    }
  }

  let folderDeleted = false
  if (failed.length === 0) {
    try {
      await storage.client.folders.delete({ folderPath: folder })
      folderDeleted = true
    } catch (error) {
      // No folder means nothing was ever uploaded for this form, which is fine
      if (!(error instanceof ImageKit.NotFoundError) && !(error instanceof ImageKit.BadRequestError)) {
        failed.push(`folder: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    }
  }
  return { deleted, folderDeleted, failed }
}
