/* Removes everything this browser kept for one form (its draft backup, design, cached copy...).
   Used when the form is deleted for good, so nothing of it is left behind. */
export function clearLocalForm(formId: string) {
  /* Guard: an empty or odd id would match (and remove) other keys. */
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(formId)) return
  try {
    const storage = window.localStorage
    for (let i = storage.length - 1; i >= 0; i--) {
      const key = storage.key(i)
      if (key && key.includes(formId)) storage.removeItem(key)
    }
  } catch {
    /* storage unavailable: nothing to remove */
  }
}
