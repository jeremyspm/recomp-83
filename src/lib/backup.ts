import { serialize } from './storage.ts'
import type { AppState } from './types.ts'

/** Saves the whole state as a dated JSON file via a temporary download link. */
export function downloadBackup(state: AppState, today: string) {
  const blob = new Blob([serialize(state)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `recomp83-backup-${today}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
