import { formSchemaV1, SCHEMA_VERSION, type FormDocument } from "./types"

/* Every stored form passes through here. Add a step per version bump. */
export function parseForm(raw: unknown): FormDocument {
  const input = (raw ?? {}) as { version?: number }
  const version = input.version ?? 1
  if (version > SCHEMA_VERSION) {
    throw new Error(`Form schema version ${version} is newer than this app understands`)
  }
  return formSchemaV1.parse(raw)
}