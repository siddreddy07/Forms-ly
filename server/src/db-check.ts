import { eq } from "drizzle-orm"

import { db, pool } from "./config/db.js"
import { users } from "./schema.js"

// Run with: npm run db:check
// Creates, reads, updates and deletes one test user to prove the database connection works.
async function main() {
  try {
    const [created] = await db
      .insert(users)
      .values({ name: "Test User", email: "db-check@example.com", clerkUserId: "user_db_check" })
      .returning()
    if (!created) throw new Error("Failed to create user")
    console.log("CREATE:", created.email)

    const [found] = await db.select().from(users).where(eq(users.id, created.id))
    console.log("READ:", found?.name)

    const [updated] = await db.update(users).set({ name: "Renamed User" }).where(eq(users.id, created.id)).returning()
    console.log("UPDATE:", updated?.name)

    await db.delete(users).where(eq(users.id, created.id))
    console.log("DELETE: done")

    console.log("Database works.")
  } catch (error) {
    console.error("Database check failed:", error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
