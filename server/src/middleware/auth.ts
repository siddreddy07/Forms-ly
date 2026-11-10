import { clerkClient, getAuth } from "@clerk/express"
import { eq } from "drizzle-orm"
import type { NextFunction, Request, Response } from "express"

import { db } from "../config/db.js"
import { users, type User } from "../schema.js"

declare module "express-serve-static-core" {
  interface Request {
    user?: User
  }
}

// Use on routes that need a signed-in user. Puts our own user row on req.user.
export async function requireUser(req: Request, res: Response, next: NextFunction) {
  const { userId } = getAuth(req)
  if (!userId) {
    res.status(401).json({ error: "Not signed in" })
    return
  }

  // First time we see this Clerk user: create their row
  let [user] = await db.select().from(users).where(eq(users.clerkUserId, userId))
  if (!user) {
    const clerkUser = await clerkClient.users.getUser(userId)
    const email = clerkUser.primaryEmailAddress?.emailAddress ?? `${userId}@no-email.invalid`
    const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || email
    ;[user] = await db
      .insert(users)
      .values({ clerkUserId: userId, name, email })
      .onConflictDoUpdate({ target: users.clerkUserId, set: { name, email } })
      .returning()
  }

  req.user = user
  next()
}
