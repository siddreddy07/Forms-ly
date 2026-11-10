import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core"

// All our database tables. See database.mmd for the diagram.
// Timestamps use "with time zone" so times are always correct, wherever the server runs.

// ---------- Enums (a column that can only hold one of these values) ----------

export const formStatus = pgEnum("form_status", ["draft", "published", "closed"])
export const formAccess = pgEnum("form_access", ["public", "private"])
export const deviceType = pgEnum("device_type", ["phone", "tablet", "desktop"])
export const storageProvider = pgEnum("storage_provider", ["drive", "cloudinary"])
export const assetKind = pgEnum("asset_kind", ["logo", "background"])

// Handy shortcut for the created/updated columns
const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())

// ---------- users ----------

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  // The user's id at Clerk (looks like user_2abc...). Clerk handles passwords and sessions.
  clerkUserId: text("clerk_user_id").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: createdAt(),
})

// ---------- assets: logos and background images users upload ----------

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: assetKind("kind").notNull(),
    provider: storageProvider("provider").notNull(),
    url: text("url").notNull(),
    size: integer("size").notNull(), // bytes
    createdAt: createdAt(),
  },
  (t) => [index("assets_owner_id_idx").on(t.ownerId)]
)

// ---------- brand_kits: a saved look a user can reuse on many forms ----------

export const brandKits = pgTable(
  "brand_kits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // for example a client name
    // Same shape as forms.design (see the comment at the top of database.mmd)
    theme: jsonb("theme").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("brand_kits_owner_id_idx").on(t.ownerId)]
)

// ---------- forms ----------

export const forms = pgTable(
  "forms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Untitled form"),
    status: formStatus("status").notNull().default("draft"),
    access: formAccess("access").notNull().default("public"),
    // The latest saved builder document (steps, blocks...). The same JSON the frontend builder uses.
    draft: jsonb("draft").$type<Record<string, unknown>>().notNull(),
    // Goes up by 1 on every save. If the number sent by the browser is old, we reply with a conflict.
    version: integer("version").notNull().default(1),
    // Optional saved brand kit; deleting the kit just clears this
    brandKitId: uuid("brand_kit_id").references(() => brandKits.id, { onDelete: "set null" }),
    // This form's own look (background, colours, font, logo, thank-you page...)
    design: jsonb("design").$type<Record<string, unknown>>().notNull().default({}),
    // Response limit, close date, and so on (later)
    settings: jsonb("settings").$type<Record<string, unknown>>().notNull().default({}),
    // Which row in form_versions is live. Empty while unpublished.
    publishedVersion: integer("published_version"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    // Set when archived or deleted. Clearing it brings the form back (undo).
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("forms_owner_updated_idx").on(t.ownerId, t.updatedAt)]
)

// ---------- form_versions: frozen copies made each time a form is published ----------

export const formVersions = pgTable(
  "form_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    // Never edited after it is created
    document: jsonb("document").$type<Record<string, unknown>>().notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique("form_versions_form_version_unique").on(t.formId, t.version)]
)

// ---------- responses: one row each time someone submits a form ----------

export const responses = pgTable(
  "responses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    // Which published version the person filled in
    formVersion: integer("form_version").notNull(),
    // The questions as they were at that time, so the table stays correct if the form changes later
    fields: jsonb("fields").$type<unknown[]>().notNull(),
    // { questionId: answer }
    answers: jsonb("answers").$type<Record<string, unknown>>().notNull(),
    durationMs: integer("duration_ms"),
    device: deviceType("device"),
    completed: boolean("completed").notNull().default(true),
    // A hash of the visitor's address, for spam limits. Never the address itself.
    ipHash: text("ip_hash"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("responses_form_submitted_idx").on(t.formId, t.submittedAt)]
)

// ---------- files: uploads attached to a response (file upload questions) ----------

export const files = pgTable(
  "files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    responseId: uuid("response_id")
      .notNull()
      .references(() => responses.id, { onDelete: "cascade" }),
    provider: storageProvider("provider").notNull(),
    // The file's id or url at Drive / Cloudinary
    providerRef: text("provider_ref").notNull(),
    name: text("name").notNull(),
    size: integer("size").notNull(), // bytes
    mime: text("mime").notNull(),
  },
  (t) => [index("files_response_id_idx").on(t.responseId)]
)

// ---------- Types for type-safe queries ----------

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Asset = typeof assets.$inferSelect
export type BrandKit = typeof brandKits.$inferSelect
export type Form = typeof forms.$inferSelect
export type NewForm = typeof forms.$inferInsert
export type FormVersion = typeof formVersions.$inferSelect
export type Response = typeof responses.$inferSelect
export type NewResponse = typeof responses.$inferInsert
export type FileRecord = typeof files.$inferSelect
