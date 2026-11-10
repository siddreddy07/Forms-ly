import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

// Our database tables. More tables (forms, responses...) get added here later.

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  // Add 1 to this to log the user out of every device (all old tokens stop working)
  tokenVersion: integer("token_version").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Types for type-safe queries
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
