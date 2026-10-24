import { sanitize } from './storage.ts'
import type { AppState } from './types.ts'

export const STORAGE_KEY = 'recomp83.v1'

/** Saved state, or null when there is none or it can't be read (a bad copy is kept aside). */
export function readSaved(today: string): AppState | null {
  let text: string | null = null
  try {
    text = localStorage.getItem(STORAGE_KEY)
    if (!text) return null
    return sanitize(JSON.parse(text), today)
  } catch {
    try {
      if (text) localStorage.setItem(`${STORAGE_KEY}.corrupt`, text)
    } catch {
      /* storage blocked */
    }
    return null
  }
}

export function writeSaved(state: AppState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}
