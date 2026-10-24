import { useSyncExternalStore } from 'react'

export type TabId = 'dashboard' | 'workout' | 'nutrition' | 'simulator'
export const TAB_IDS: readonly TabId[] = ['dashboard', 'workout', 'nutrition', 'simulator']

function subscribe(notify: () => void) {
  window.addEventListener('hashchange', notify)
  return () => window.removeEventListener('hashchange', notify)
}

function getTab(): TabId {
  const h = window.location.hash.replace('#', '')
  return (TAB_IDS as readonly string[]).includes(h) ? (h as TabId) : 'dashboard'
}

/** Current tab from the URL hash, so reloads and the back button keep your place. */
export function useTab(): [TabId, (t: TabId) => void] {
  const tab = useSyncExternalStore(subscribe, getTab)
  const go = (t: TabId) => {
    if (t !== getTab()) window.location.hash = t
  }
  return [tab, go]
}
