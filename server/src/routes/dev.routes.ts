import { and, eq } from "drizzle-orm"
import { Router } from "express"
import { z } from "zod"

import { db } from "../config/db.js"
import { files, forms, responses, storageConnections } from "../schema.js"
import { deleteFormFiles, deleteStoredFile, ownStorage, platformFilesUsed, platformStorage, type Storage } from "../services/storage.js"

// Developer tools for testing. Mounted only outside production and only for DEV_USER_ID (see server.ts and
// middleware/dev.ts). requireUser and requireDev are added where this router is mounted.
const router = Router()

const idSchema = z.uuid()

// Which user to act on: the one in the request, or you
const targetUser = (value: unknown, fallback: string) => {
  const parsed = idSchema.safeParse(value ?? fallback)
  return parsed.success ? parsed.data : null
}

// ---------- GET /dev : am I allowed in? ----------

router.get("/", (req, res) => {
  res.json({ ok: true, you: req.user!.id, platformStorageConfigured: platformStorage() !== null })
})

// ---------- GET /dev/storage?userId= : how much of the free storage is used ----------

router.get("/storage", async (req, res) => {
  const userId = targetUser(req.query.userId, req.user!.id)
  if (!userId) {
    res.status(400).json({ error: "userId must be a uuid" })
    return
  }
  const [own] = await db.select({ id: storageConnections.id }).from(storageConnections).where(eq(storageConnections.userId, userId))
  res.json({ userId, platformFilesUsed: await platformFilesUsed(userId), ownImageKitConnected: !!own })
})

// ---------- POST /dev/storage/reset { userId? } : give the free storage back (back to 0 files used) ----------
// Deletes the user's files from OUR ImageKit account and from the database, because the count is the number of
// files we hold for them. Files in their own ImageKit are not touched. Defaults to you.

router.post("/storage/reset", async (req, res) => {
  const userId = targetUser(req.body?.userId, req.user!.id)
  if (!userId) {
    res.status(400).json({ error: "userId must be a uuid" })
    return
  }
  const rows = await db.select().from(files).where(and(eq(files.ownerId, userId), eq(files.onPlatform, true)))
  const platform = platformStorage()
  if (rows.length > 0 && !platform) {
    res.status(503).json({ error: "Our ImageKit account isn't configured, so the files can't be deleted." })
    return
  }

  const failed: { fileId: string; reason: string }[] = []
  let deleted = 0
  for (const row of rows) {
    try {
      await deleteStoredFile(platform!, row.providerRef)
      await db.delete(files).where(eq(files.id, row.id))
      deleted++
    } catch (error) {
      failed.push({ fileId: row.providerRef, reason: error instanceof Error ? error.message : "Unknown error" })
    }
  }
  res.status(failed.length ? 207 : 200).json({ userId, deleted, failed, platformFilesUsed: await platformFilesUsed(userId) })
})

// ---------- DELETE /dev/forms/:id?force=true : delete any form and every file it ever received ----------
// Removes the form's files from ImageKit first (our account, and the owner's own account if they connected one),
// including uploads that were never submitted, and the folder itself (the folder delete is what catches uploads from
// the last few seconds, because ImageKit's file listing lags). Then deletes the form: its versions,
// responses and file records go with it, and its link is freed.
// If ImageKit fails for some files, nothing is deleted and you get the list (502). Add ?force=true to delete anyway.

router.delete("/forms/:id", async (req, res) => {
  const id = idSchema.safeParse(req.params.id)
  if (!id.success) {
    res.status(400).json({ error: "The form id must be a uuid" })
    return
  }
  const [form] = await db.select().from(forms).where(eq(forms.id, id.data))
  if (!form) {
    res.status(404).json({ error: "Form not found" })
    return
  }

  // Which ImageKit accounts may hold this form's files
  const storages: Storage[] = []
  const platform = platformStorage()
  if (platform) storages.push(platform)
  const own = await ownStorage(form.ownerId)
  if (own) storages.push(own)

  const failed: { where: string; detail: string }[] = []
  const skipped: string[] = []
  let deletedFiles = 0
  let foldersDeleted = 0

  // 1. Every file we have a record of (files belong to responses, which belong to the form)
  const records = await db
    .select({ providerRef: files.providerRef, onPlatform: files.onPlatform })
    .from(files)
    .innerJoin(responses, eq(responses.id, files.responseId))
    .where(eq(responses.formId, form.id))
  for (const record of records) {
    const storage = record.onPlatform ? platform : own
    if (!storage) {
      skipped.push(record.providerRef)
      continue
    }
    try {
      if (await deleteStoredFile(storage, record.providerRef)) deletedFiles++
    } catch (error) {
      failed.push({ where: record.providerRef, detail: error instanceof Error ? error.message : "Unknown error" })
    }
  }

  // 2. Anything left in the form's folder (uploads that were never submitted), then the folder
  for (const storage of storages) {
    const sweep = await deleteFormFiles(storage, form.id)
    deletedFiles += sweep.deleted
    if (sweep.folderDeleted) foldersDeleted++
    for (const reason of sweep.failed) failed.push({ where: `${storage.source} /forms/${form.id}`, detail: reason })
  }

  if (failed.length > 0 && req.query.force !== "true") {
    res.status(502).json({ error: "ImageKit couldn't delete everything, so the form was kept. Fix it, or retry with ?force=true.", failed, skipped })
    return
  }

  await db.delete(forms).where(eq(forms.id, form.id))
  res.json({ deleted: { form: true, imageKitFiles: deletedFiles, imageKitFolders: foldersDeleted }, failed, skipped })
})

export default router
