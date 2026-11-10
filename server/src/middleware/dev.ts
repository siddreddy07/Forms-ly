import type { NextFunction, Request, Response } from "express"

// Developer-only tools (see routes/dev.routes.ts). Only one account may use them: the one named in DEV_USER_ID
// (our own users.id, not the Clerk id). Everyone else gets a plain 404, so the routes look like they don't exist.
// Use after requireUser. Read at request time so changing .env and restarting is all it takes.
export function requireDev(req: Request, res: Response, next: NextFunction) {
  const devUserId = process.env.DEV_USER_ID
  if (!devUserId || req.user?.id !== devUserId) {
    res.status(404).json({ error: "Not found" })
    return
  }
  next()
}
