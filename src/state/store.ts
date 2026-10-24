import { createContext, useContext, useSyncExternalStore } from 'react'
import type {
  AppState, DayType, MacroLog, Profile, SessionId, Settings, WeighIn, WorkoutSession,
} from '../lib/types.ts'

export interface Actions {
  logWeighIn(entry: WeighIn): void
  deleteWeighIn(date: string): void
  setMacros(date: string, macros: MacroLog | null): void
  addMacros(date: string, delta: Partial<MacroLog>): void
  toggleCheck(date: string, id: string): void
  setDayType(date: string, type: DayType | null): void
  updateProfile(patch: Partial<Profile>): void
  updateSettings(patch: Partial<Settings>): void
  /**
   * Applies `fn` to the session on `date`, creating it (as `session`) on first edit.
   * `start` stamps the 35-minute clock if it isn't running yet.
   */
  editSession(date: string, session: SessionId, fn: (s: WorkoutSession) => WorkoutSession, start?: boolean): void
  finishSession(date: string): void
  deleteSession(id: string): void
  setSwap(slotId: string, index: number): void
  resetToDay1(today: string): void
  loadDemo(today: string): void
  importState(next: AppState): void
}

export interface Store {
  state: AppState
  actions: Actions
}

export const StoreContext = createContext<Store | null>(null)

export function useStore(): Store {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore must be used inside <StoreProvider>')
  return store
}

// localStorage write status, kept outside React state so the persist effect
// never has to call setState.
let saveOk = true
const saveListeners = new Set<() => void>()

export function reportSave(ok: boolean) {
  if (ok === saveOk) return
  saveOk = ok
  saveListeners.forEach((l) => l())
}

function subscribeSave(l: () => void) {
  saveListeners.add(l)
  return () => saveListeners.delete(l)
}

export function useSaveOk(): boolean {
  return useSyncExternalStore(subscribeSave, () => saveOk)
}
