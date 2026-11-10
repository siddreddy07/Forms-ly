import { randomInt } from "node:crypto"

// Public form links look like /f/contact-form-k7x2q9: the form's name, then 6 random characters.
// The random part makes every link different and impossible to guess from the name or the owner.
// (No 0/o/1/l/i, so it can be read out loud or typed from a screenshot.)
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"
const MAX_BASE = 40

// "Café Survey 2026!" -> "cafe-survey-2026". A name with nothing usable (only emoji, Hindi...) becomes "form".
export function slugBase(name: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_BASE)
    .replace(/-+$/, "")
  return base || "form"
}

export function randomPart(length = 6): string {
  let out = ""
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)]
  return out
}

export const makeSlug = (name: string) => `${slugBase(name)}-${randomPart()}`

// A slug in a URL must look like one we could have made
export const isSlug = (value: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 80
