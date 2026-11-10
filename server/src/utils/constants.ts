// All the settings for auth in one place.

// How long each token is valid
export const ACCESS_TOKEN_EXPIRES_IN = "15m"
export const REFRESH_TOKEN_EXPIRES_IN = "7d"

// Names of the cookies
export const ACCESS_COOKIE = "accessToken"
export const REFRESH_COOKIE = "refreshToken"

// Cookie options (maxAge is in milliseconds, same time as the token)
const isProduction = process.env.NODE_ENV === "production"

export const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true, // JavaScript in the browser can't read it
  secure: isProduction, // https only in production
  sameSite: "lax" as const,
  maxAge: 15 * 60 * 1000, // 15 minutes
}

export const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
}
