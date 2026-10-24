// Defaults, Day-1 state and validation. Pure (no browser APIs) so the audit
// script can import it; localStorage access lives in persist.ts.

import { isISODate } from './dates.ts'
import type {
  AppState, DayType, ExerciseLog, MacroLog, Profile, SessionId, SetLog, Settings, WeighIn, WorkoutSession,
} from './types.ts'

export function defaultProfile(startDate: string): Profile {
  return {
    name: 'Client',
    sex: 'male',
    age: 27,
    heightCm: 170,
    startWeightKg: 114,
    startFfmKg: 67.5,
    activity: 1.375,
    goalWeightKg: 83,
    planWeeks: 26,
    startDate,
  }
}

export function defaultSettings(): Settings {
  return {
    mode: 'strict',
    proteinPlus: false,
    phase2SwitchKg: 97,
    liftDays: [1, 3, 5],
    firstMealTime: '12:00',
    workoutTime: '17:30',
    creatine: true,
    adaptivePct: 10,
    leanProtection: null,
    calibration: null,
    stepGoal: 7000,
    safetyDismissed: false,
  }
}

/** Day 1: no logs, one weigh-in at the profile's start weight. */
export function freshState(today: string, profile?: Profile, settings?: Settings): AppState {
  const p = { ...(profile ?? defaultProfile(today)), startDate: today }
  return {
    version: 1,
    profile: p,
    settings: { ...(settings ?? defaultSettings()), calibration: null },
    weighIns: [{ date: today, kg: p.startWeightKg }],
    macros: {},
    checks: {},
    dayTypes: {},
    workouts: [],
    swaps: {},
  }
}

// ---- Validation (imports and anything read back from localStorage) ----

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)

function num(v: unknown, fallback: number, min: number, max: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback
}
function optNum(v: unknown, min: number, max: number): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : undefined
}
function nullableNum(v: unknown, min: number, max: number): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : null
}
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback)
const time = (v: unknown, fallback: string) => (typeof v === 'string' && /^\d{2}:\d{2}$/.test(v) ? v : fallback)

function sanitizeProfile(raw: unknown, today: string): Profile {
  const d = defaultProfile(today)
  if (!isObj(raw)) return d
  const startWeightKg = num(raw.startWeightKg, d.startWeightKg, 40, 300)
  return {
    name: typeof raw.name === 'string' ? raw.name.slice(0, 40) : d.name,
    sex: raw.sex === 'female' ? 'female' : 'male',
    age: num(raw.age, d.age, 14, 90),
    heightCm: num(raw.heightCm, d.heightCm, 120, 230),
    startWeightKg,
    startFfmKg: num(raw.startFfmKg, Math.min(d.startFfmKg, startWeightKg - 5), 20, startWeightKg - 2),
    activity: num(raw.activity, d.activity, 1.1, 2.0),
    goalWeightKg: num(raw.goalWeightKg, d.goalWeightKg, 35, startWeightKg),
    planWeeks: Math.round(num(raw.planWeeks, d.planWeeks, 8, 52)),
    startDate: isISODate(raw.startDate) ? raw.startDate : d.startDate,
  }
}

function sanitizeSettings(raw: unknown): Settings {
  const d = defaultSettings()
  if (!isObj(raw)) return d
  const liftDays = Array.isArray(raw.liftDays)
    ? [...new Set(raw.liftDays.filter((x): x is number => Number.isInteger(x) && x >= 0 && x <= 6))].sort()
    : d.liftDays
  return {
    mode: raw.mode === 'recomp' ? 'recomp' : 'strict',
    proteinPlus: bool(raw.proteinPlus, d.proteinPlus),
    phase2SwitchKg: num(raw.phase2SwitchKg, d.phase2SwitchKg, 40, 300),
    liftDays,
    firstMealTime: time(raw.firstMealTime, d.firstMealTime),
    workoutTime: time(raw.workoutTime, d.workoutTime),
    creatine: bool(raw.creatine, d.creatine),
    adaptivePct: num(raw.adaptivePct, d.adaptivePct, 0, 20),
    leanProtection: nullableNum(raw.leanProtection, 0, 1),
    calibration: nullableNum(raw.calibration, 0.85, 1.15),
    stepGoal: Math.round(num(raw.stepGoal, d.stepGoal, 0, 30000)),
    safetyDismissed: bool(raw.safetyDismissed, d.safetyDismissed),
  }
}

function sanitizeWeighIns(raw: unknown): WeighIn[] {
  if (!Array.isArray(raw)) return []
  const byDate = new Map<string, WeighIn>()
  for (const w of raw) {
    if (!isObj(w) || !isISODate(w.date) || typeof w.kg !== 'number' || !Number.isFinite(w.kg) || w.kg < 30 || w.kg > 350) continue
    const entry: WeighIn = { date: w.date, kg: w.kg }
    const waist = optNum(w.waistCm, 40, 250)
    const bf = optNum(w.bfPct, 3, 70)
    if (waist !== undefined) entry.waistCm = waist
    if (bf !== undefined) entry.bfPct = bf
    byDate.set(w.date, entry)
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}

function sanitizeRecord<T>(raw: unknown, pick: (v: unknown) => T | undefined): Record<string, T> {
  const out: Record<string, T> = {}
  if (!isObj(raw)) return out
  for (const [k, v] of Object.entries(raw)) {
    if (!isISODate(k)) continue
    const val = pick(v)
    if (val !== undefined) out[k] = val
  }
  return out
}

const pickMacro = (v: unknown): MacroLog | undefined =>
  isObj(v) ? { p: num(v.p, 0, 0, 1000), c: num(v.c, 0, 0, 1500), f: num(v.f, 0, 0, 500) } : undefined
const pickChecks = (v: unknown): string[] | undefined =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 30) : undefined
const pickDayType = (v: unknown): DayType | undefined => (v === 'lift' || v === 'rest' ? v : undefined)

function sanitizeSet(raw: unknown): SetLog {
  const s = isObj(raw) ? raw : {}
  return { kg: nullableNum(s.kg, 0, 1000), reps: nullableNum(s.reps, 0, 100), done: bool(s.done, false) }
}

function sanitizeWorkouts(raw: unknown): WorkoutSession[] {
  if (!Array.isArray(raw)) return []
  const out: WorkoutSession[] = []
  for (const w of raw) {
    if (!isObj(w) || !isISODate(w.date) || (w.session !== 'A' && w.session !== 'B') || !Array.isArray(w.entries)) continue
    const entries: ExerciseLog[] = w.entries.filter(isObj).map((e) => ({
      slotId: String(e.slotId ?? ''),
      exerciseId: String(e.exerciseId ?? ''),
      warmups: Array.isArray(e.warmups) ? e.warmups.map(Boolean) : [false],
      sets: Array.isArray(e.sets) ? e.sets.map(sanitizeSet) : [],
    }))
    out.push({
      id: typeof w.id === 'string' ? w.id : `${w.date}-${w.session}`,
      date: w.date,
      session: w.session as SessionId,
      startedAt: nullableNum(w.startedAt, 0, Number.MAX_SAFE_INTEGER),
      finishedAt: nullableNum(w.finishedAt, 0, Number.MAX_SAFE_INTEGER),
      entries,
    })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

/** Coerce anything parsed from JSON into a valid AppState, or throw if it isn't one. */
export function sanitize(raw: unknown, today: string): AppState {
  if (!isObj(raw) || raw.version !== 1 || !isObj(raw.profile)) {
    throw new Error('Not a Recomp 83 backup (version 1).')
  }
  const swaps: Record<string, number> = {}
  if (isObj(raw.swaps)) {
    for (const [k, v] of Object.entries(raw.swaps)) if (Number.isInteger(v) && (v as number) >= 0 && (v as number) < 10) swaps[k] = v as number
  }
  return {
    version: 1,
    profile: sanitizeProfile(raw.profile, today),
    settings: sanitizeSettings(raw.settings),
    weighIns: sanitizeWeighIns(raw.weighIns),
    macros: sanitizeRecord(raw.macros, pickMacro),
    checks: sanitizeRecord(raw.checks, pickChecks),
    dayTypes: sanitizeRecord(raw.dayTypes, pickDayType),
    workouts: sanitizeWorkouts(raw.workouts),
    swaps,
  }
}

export function serialize(state: AppState): string {
  return JSON.stringify(state, null, 2)
}

export function parseBackup(text: string, today: string): AppState {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('That file isn\'t valid JSON.')
  }
  return sanitize(raw, today)
}
