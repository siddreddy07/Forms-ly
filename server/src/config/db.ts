import "dotenv/config"
import { Pool, neonConfig } from "@neondatabase/serverless"
import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/neon-serverless"
import ws from "ws"

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined")
}

// Needed for Node.js versions older than 22
neonConfig.webSocketConstructor = ws

// The app uses the pooled connection
export const pool = new Pool({ connectionString: process.env.DATABASE_URL })
export const db = drizzle(pool)

// Call this once when the server starts. It runs a tiny query to make sure the database is reachable.
export async function connectDB() {
  try {
    await db.execute(sql`select 1`)
    console.log("Database connected")
  } catch (error) {
    console.error("Database connection failed:", error)
    process.exit(1)
  }
}
