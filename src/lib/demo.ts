// Week 1 demo: a realistic first week so the chart, trend line and progression
// badges show up on first launch. Day 1 is the most recent Monday that leaves
// Mon/Wed/Fri all in the past (or today).

import { addDays, daysBetween, parseISO, weekdayOf } from './dates.ts'
import { defaultProfile, defaultSettings } from './storage.ts'
import type { AppState, ExerciseLog, MacroLog, SessionId, WorkoutSession } from './types.ts'

export function demoStartDate(today: string): string {
  const sinceMonday = (weekdayOf(today) + 6) % 7
  return addDays(today, -(sinceMonday >= 4 ? sinceMonday : sinceMonday + 7))
}

/** Scale readings vs Day 1: the glycogen/water flush front-loads the first week. */
const WEIGHT_OFFSETS = [0, -0.8, -1.3, -1.4, -2.0, -2.1, -2.4]

const LIFT_DAY_MACROS: MacroLog[] = [
  { p: 118, c: 101, f: 36 },
  { p: 121, c: 97, f: 34 },
  { p: 116, c: 104, f: 37 },
]
const REST_DAY_MACROS: MacroLog[] = [
  { p: 122, c: 66, f: 49 },
  { p: 114, c: 71, f: 53 },
  { p: 120, c: 63, f: 50 },
  { p: 125, c: 65, f: 48 },
]

type Perf = [exerciseId: string, kg: number, reps: [number, number]]

const SESSIONS: { day: number; session: SessionId; minutes: number; perf: Perf[] }[] = [
  {
    day: 0, session: 'A', minutes: 34, perf: [
      ['seated-leg-press', 120, [8, 7]],
      ['incline-press-machine', 45, [8, 7]],
      ['lat-pulldown', 55, [10, 9]],
      ['seated-leg-curl', 40, [10, 9]],
      ['lateral-raise-machine', 20, [12, 10]],
    ],
  },
  {
    day: 2, session: 'B', minutes: 33, perf: [
      ['chest-supported-row', 50, [8, 8]],
      ['shoulder-press-machine', 35, [7, 6]],
      ['hack-squat', 60, [8, 7]],
      ['pec-deck', 45, [10, 10]],
      ['preacher-curl-machine', 25, [10, 9]],
      ['cable-pushdown', 30, [10, 10]],
    ],
  },
  {
    // Friday: leg press, incline and leg curl hit the top of their ranges (green
    // badges next time); the pulldown drops 4 reps (dip warning).
    day: 4, session: 'A', minutes: 32, perf: [
      ['seated-leg-press', 120, [8, 8]],
      ['incline-press-machine', 45, [8, 8]],
      ['lat-pulldown', 55, [8, 7]],
      ['seated-leg-curl', 40, [10, 10]],
      ['lateral-raise-machine', 20, [12, 11]],
    ],
  },
]

const SLOT_IDS: Record<SessionId, string[]> = {
  A: ['A1', 'A2', 'A3', 'A4', 'A5'],
  B: ['B1', 'B2', 'B3', 'B4', 'B5a', 'B5b'],
}

function localMs(date: string, hh: number, mm: number): number {
  const d = new Date(parseISO(date))
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hh, mm).getTime()
}

export function demoState(today: string): AppState {
  const start = demoStartDate(today)
  const elapsed = daysBetween(start, today)
  const profile = defaultProfile(start)
  const settings = defaultSettings()
  const days = Math.min(6, elapsed)

  const weighIns = WEIGHT_OFFSETS.slice(0, days + 1).map((off, d) => ({
    date: addDays(start, d),
    kg: Math.round((profile.startWeightKg + off) * 10) / 10,
    ...(d === 0 ? { waistCm: 121 } : d === 6 ? { waistCm: 119.5 } : {}),
  }))

  const macros: Record<string, MacroLog> = {}
  let lift = 0
  let rest = 0
  for (let d = 0; d < Math.min(7, elapsed); d++) {
    const date = addDays(start, d)
    const isLift = settings.liftDays.includes(weekdayOf(date))
    macros[date] = isLift ? LIFT_DAY_MACROS[lift++ % 3] : REST_DAY_MACROS[rest++ % 4]
  }

  const workouts: WorkoutSession[] = SESSIONS.map(({ day, session, minutes, perf }) => {
    const date = addDays(start, day)
    const startedAt = localMs(date, 17, 35)
    const entries: ExerciseLog[] = perf.map(([exerciseId, kg, reps], i) => ({
      slotId: SLOT_IDS[session][i],
      exerciseId,
      warmups: i === 0 ? [true, true] : [true],
      sets: reps.map((r) => ({ kg, reps: r, done: true })),
    }))
    return { id: `${date}-${session}`, date, session, startedAt, finishedAt: startedAt + minutes * 60_000, entries }
  })

  return {
    version: 1,
    profile,
    settings,
    weighIns,
    macros,
    checks: {},
    dayTypes: {},
    workouts,
    swaps: {},
  }
}
