// Keyset paging for lists that grow (forms, responses).
//
// A cursor is the last row of the page, encoded so the browser only has to hand it back. It carries the value the list
// is sorted by and the row's id, which together always point at exactly one place in the list. That means a page never
// skips or repeats rows when something is added or deleted while someone is reading, which an offset (page number)
// would. The sort name is inside the cursor too, so a cursor from one sort order cannot be used with another.

export type Cursor = {
  // Which sort order this cursor belongs to
  s: string
  // The value of the sorted column for the last row (a title, an ISO date, a count)
  v: string | number
  // The row's id, to break ties
  id: string
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url")
}

// Null when the cursor is missing, malformed, or from a different sort order.
export function decodeCursor(raw: unknown, sort: string): Cursor | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 400) return null
  try {
    const value = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Partial<Cursor>
    if (value.s !== sort) return null
    if (typeof value.id !== "string" || !UUID.test(value.id)) return null
    if (typeof value.v !== "string" && typeof value.v !== "number") return null
    return { s: value.s, v: value.v, id: value.id }
  } catch {
    return null
  }
}
