// Time as external stores, so components read "today" and "now" without
// calling Date in render and without setState-in-effect.

import { useSyncExternalStore } from 'react'
import { localISO } from '../lib/dates.ts'

function subscribeToday(notify: () => void) {
  const id = window.setInterval(notify, 30_000)
  document.addEventListener('visibilitychange', notify)
  return () => {
    window.clearInterval(id)
    document.removeEventListener('visibilitychange', notify)
  }
}

const getToday = () => localISO(new Date())

/** Local calendar date (YYYY-MM-DD); re-renders when the day rolls over. */
export function useToday(): string {
  return useSyncExternalStore(subscribeToday, getToday)
}

const TICK_MS = 250
let tickTimer: number | undefined
const tickListeners = new Set<() => void>()

function subscribeTick(notify: () => void) {
  tickListeners.add(notify)
  if (tickTimer === undefined) {
    tickTimer = window.setInterval(() => tickListeners.forEach((l) => l()), TICK_MS)
  }
  return () => {
    tickListeners.delete(notify)
    if (tickListeners.size === 0 && tickTimer !== undefined) {
      window.clearInterval(tickTimer)
      tickTimer = undefined
    }
  }
}

const getTick = () => Math.floor(Date.now() / TICK_MS) * TICK_MS
const noopSubscribe = () => () => {}
const getZero = () => 0

/** Epoch ms quantised to 250 ms while `active`; 0 otherwise (no timer runs). */
export function useNow(active: boolean): number {
  return useSyncExternalStore(active ? subscribeTick : noopSubscribe, active ? getTick : getZero)
}
