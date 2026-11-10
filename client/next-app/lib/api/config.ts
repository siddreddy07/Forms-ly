/* Where our backend lives. A plain module (no "use client"), so both server pages and the browser can use it. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
