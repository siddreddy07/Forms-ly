import type { Block } from "@/lib/schema"

/* The biggest file anyone can attach to a form. The backend allows no more than this (server/src/services/storage.ts),
   so a form can ask for less but never more. */
export const MAX_UPLOAD_MB = 3
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024

/* The size limit for one file upload question: what the form asks for, but never above the maximum.
   Forms made earlier may still say 10 MB; they are held to 3 MB too. */
export function maxUploadMb(block: Pick<Block, "validation">): number {
  const asked = block.validation?.maxFileSizeMb
  return asked && asked > 0 ? Math.min(asked, MAX_UPLOAD_MB) : MAX_UPLOAD_MB
}
