import type { NextFunction, Request, Response } from "express"

import { ACCESS_COOKIE } from "../utils/constants.js"
import { verifyAccessToken } from "../helpers/jwt.js"

// Put this on any route that needs a logged-in user.
// If the token is good, the user id is available as res.locals.userId
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies[ACCESS_COOKIE]
  const payload = token ? verifyAccessToken(token) : null

  if (!payload) {
    return res.status(401).json({ message: "Please log in" })
  }

  res.locals.userId = payload.userId
  next()
}
