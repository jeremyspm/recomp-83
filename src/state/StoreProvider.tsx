import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { demoState } from '../lib/demo.ts'
import { writeSaved } from '../lib/persist.ts'
import { freshState } from '../lib/storage.ts'
import type { AppState, MacroLog, WorkoutSession } from '../lib/types.ts'
import { newSession } from '../lib/workouts.ts'
import { reportSave, StoreContext, type Actions } from './store.ts'

const byDate = <T extends { date: string }>(a: T, b: T) => a.date.localeCompare(b.date)

export function StoreProvider({ initial, children }: { initial: AppState; children: ReactNode }) {
  const [state, setState] = useState(initial)

  useEffect(() => {
    reportSave(writeSaved(state))
  }, [state])

  const actions = useMemo<Actions>(() => ({
    logWeighIn(entry) {
      setState((s) => ({
        ...s,
        weighIns: [...s.weighIns.filter((w) => w.date !== entry.date), entry].sort(byDate),
      }))
    },
    deleteWeighIn(date) {
      setState((s) => ({ ...s, weighIns: s.weighIns.filter((w) => w.date !== date) }))
    },
    setMacros(date, macros) {
      setState((s) => {
        const next = { ...s.macros }
        if (macros) next[date] = macros
        else delete next[date]
        return { ...s, macros: next }
      })
    },
    addMacros(date, delta) {
      setState((s) => {
        const cur: MacroLog = s.macros[date] ?? { p: 0, c: 0, f: 0 }
        const clamp = (v: number) => Math.max(0, Math.round(v))
        return {
          ...s,
          macros: {
            ...s.macros,
            [date]: { p: clamp(cur.p + (delta.p ?? 0)), c: clamp(cur.c + (delta.c ?? 0)), f: clamp(cur.f + (delta.f ?? 0)) },
          },
        }
      })
    },
    toggleCheck(date, id) {
      setState((s) => {
        const cur = s.checks[date] ?? []
        const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
        return { ...s, checks: { ...s.checks, [date]: next } }
      })
    },
    setDayType(date, type) {
      setState((s) => {
        const next = { ...s.dayTypes }
        if (type) next[date] = type
        else delete next[date]
        return { ...s, dayTypes: next }
      })
    },
    updateProfile(patch) {
      setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }))
    },
    updateSettings(patch) {
      setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }))
    },
    editSession(date, session, fn, start = false) {
      const stamp = start ? Date.now() : null
      setState((s) => {
        let workouts = s.workouts
        let current: WorkoutSession | undefined = workouts.find((w) => w.date === date)
        if (!current) {
          current = newSession(date, session, s.swaps, s.workouts)
          workouts = [...workouts, current].sort(byDate)
        }
        const id = current.id
        let updated = fn(current)
        if (stamp !== null && updated.startedAt === null) updated = { ...updated, startedAt: stamp }
        return { ...s, workouts: workouts.map((w) => (w.id === id ? updated : w)) }
      })
    },
    finishSession(date) {
      const stamp = Date.now()
      setState((s) => ({
        ...s,
        workouts: s.workouts.map((w) => (w.date === date ? { ...w, finishedAt: stamp, startedAt: w.startedAt ?? stamp } : w)),
      }))
    },
    deleteSession(id) {
      setState((s) => ({ ...s, workouts: s.workouts.filter((w) => w.id !== id) }))
    },
    setSwap(slotId, index) {
      setState((s) => ({ ...s, swaps: { ...s.swaps, [slotId]: index } }))
    },
    resetToDay1(today) {
      setState((s) => freshState(today, s.profile, s.settings))
    },
    loadDemo(today) {
      setState(demoState(today))
    },
    importState(next) {
      setState(next)
    },
  }), [])

  const store = useMemo(() => ({ state, actions }), [state, actions])
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
