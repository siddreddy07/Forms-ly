import jwt from "jsonwebtoken"

import { ACCESS_TOKEN_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN } from "../utils/constants.js"

// Secrets come from the .env file
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET as string
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string

// What we store inside the token
type TokenPayload = { userId: string }

export function signAccessToken(userId: string) {
  return jwt.sign({ userId }, ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN })
}

export function signRefreshToken(userId: string) {
  return jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN })
}

// Returns the payload if the token is good, or null if it is wrong or expired
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, ACCESS_SECRET) as TokenPayload
  } catch {
    return null
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, REFRESH_SECRET) as TokenPayload
  } catch {
    return null
  }
}
