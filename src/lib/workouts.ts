import type { ExerciseLog, SessionId, SetLog, WorkoutSession } from './types.ts'

export type LoadKind = 'lower' | 'upper' | 'iso' | 'small'
export type MachineType = 'Pin' | 'Plate' | 'Cable'

export interface Machine {
  id: string
  name: string
  type: MachineType
  /** Overrides for machines that don't share the slot's defaults. */
  reps?: readonly [number, number]
  load?: LoadKind
  note?: string
}

export interface Slot {
  id: string
  session: SessionId
  station: number
  /** 'a' rolls straight into 'b'; the rest timer starts after 'b'. */
  superset?: 'a' | 'b'
  reps: readonly [number, number]
  load: LoadKind
  restSec: number
  focus: string
  why: string
  machines: readonly Machine[]
}

/** Double-progression load jumps: big for leg compounds, smallest pin for side delts. */
export const INCREMENT: Record<LoadKind, number> = { lower: 5, upper: 2.5, iso: 2.5, small: 1.25 }

const m = (id: string, name: string, type: MachineType, extra: Partial<Machine> = {}): Machine => ({ id, name, type, ...extra })

export const SLOTS: readonly Slot[] = [
  {
    id: 'A1', session: 'A', station: 1, reps: [6, 8], load: 'lower', restSec: 150,
    focus: 'Quads · glutes',
    why: 'Keeps the leg muscle you built carrying the extra weight, with no load on the spine.',
    machines: [
      m('seated-leg-press', 'Seated Leg Press', 'Pin'),
      m('leg-press-45', '45° Leg Press', 'Plate'),
      m('hack-squat', 'Hack Squat', 'Plate'),
      m('pendulum-squat', 'Pendulum Squat', 'Plate'),
    ],
  },
  {
    id: 'A2', session: 'A', station: 2, reps: [6, 8], load: 'upper', restSec: 150,
    focus: 'Upper chest',
    why: 'Builds the upper-chest shelf that makes you look thick from the front.',
    machines: [
      m('incline-press-machine', 'Incline Chest Press', 'Pin'),
      m('incline-press-plate', 'Incline Press, Plate-Loaded', 'Plate'),
      m('converging-incline', 'Converging Incline Press', 'Pin'),
      m('cable-low-high-press', 'Low-to-High Cable Press', 'Cable'),
    ],
  },
  {
    id: 'A3', session: 'A', station: 3, reps: [8, 10], load: 'upper', restSec: 150,
    focus: 'Lats (width)',
    why: 'The main V-taper widener: broader shoulders make the waist look smaller.',
    machines: [
      m('lat-pulldown', 'Lat Pulldown, Wide/Neutral', 'Pin'),
      m('plate-pulldown', 'Plate-Loaded Pulldown', 'Plate'),
      m('cable-1arm-pulldown', 'Single-Arm Cable Pulldown', 'Cable'),
      m('neutral-pulldown', 'Neutral-Grip Machine Pulldown', 'Pin'),
    ],
  },
  {
    id: 'A4', session: 'A', station: 4, reps: [8, 10], load: 'iso', restSec: 120,
    focus: 'Hamstrings',
    why: 'Keeps the knees stable and the hamstrings full, with no lower-back load.',
    machines: [
      m('seated-leg-curl', 'Seated Leg Curl', 'Pin'),
      m('lying-leg-curl', 'Lying Leg Curl', 'Pin'),
      m('standing-leg-curl', 'Standing Single-Leg Curl', 'Pin'),
      m('cable-leg-curl', 'Cable Standing Leg Curl', 'Cable'),
    ],
  },
  {
    id: 'A5', session: 'A', station: 5, reps: [10, 12], load: 'small', restSec: 120,
    focus: 'Side delts',
    why: 'Capped side delts: the #1 muscle for looking jacked at 83 kg.',
    machines: [
      m('lateral-raise-machine', 'Seated Lateral Raise Machine', 'Pin'),
      m('cable-lateral-raise', 'Single-Arm Cable Lateral Raise', 'Cable'),
      m('cable-y-raise', 'Cable Y-Raise', 'Cable'),
      m('plate-lateral-raise', 'Plate-Loaded Lateral Raise', 'Plate'),
    ],
  },
  {
    id: 'B1', session: 'B', station: 1, reps: [6, 8], load: 'upper', restSec: 150,
    focus: 'Upper back · rear delts',
    why: 'Thickens the upper back with the chest on a pad, so zero lower-back strain.',
    machines: [
      m('chest-supported-row', 'Chest-Supported Machine Row', 'Pin'),
      m('tbar-row-supported', 'Chest-Supported T-Bar Row', 'Plate'),
      m('isolateral-low-row', 'Iso-Lateral Low Row', 'Plate'),
      m('seated-cable-row', 'Seated Cable Row (chest to pad)', 'Cable'),
    ],
  },
  {
    id: 'B2', session: 'B', station: 2, reps: [6, 8], load: 'upper', restSec: 150,
    focus: 'Shoulders',
    why: 'Overhead pressing on a fixed path: safe tension while you are in a deficit.',
    machines: [
      m('shoulder-press-machine', 'Seated Shoulder Press', 'Pin'),
      m('shoulder-press-plate', 'Plate-Loaded Shoulder Press', 'Plate'),
      m('converging-shoulder-press', 'Converging Shoulder Press', 'Pin'),
      m('cable-shoulder-press', 'Seated Cable Shoulder Press', 'Cable'),
    ],
  },
  {
    id: 'B3', session: 'B', station: 3, reps: [6, 8], load: 'lower', restSec: 150,
    focus: 'Quads · glutes',
    why: 'The second heavy leg press of the week. Holding leg mass keeps your metabolism up.',
    machines: [
      m('hack-squat', 'Hack Squat', 'Plate'),
      m('pendulum-squat', 'Pendulum Squat', 'Plate'),
      m('seated-leg-press', 'Seated Leg Press', 'Pin'),
      m('leg-extension', 'Leg Extension (+ Glute Press)', 'Pin', {
        reps: [10, 12], load: 'iso', note: 'Then 2 sets of glute press if a machine is free.',
      }),
    ],
  },
  {
    id: 'B4', session: 'B', station: 4, reps: [8, 10], load: 'iso', restSec: 120,
    focus: 'Chest',
    why: 'A stretch-loaded fly fills out the chest without loading the shoulders.',
    machines: [
      m('pec-deck', 'Pec Deck / Machine Fly', 'Pin'),
      m('cable-crossover', 'Cable Crossover, Mid-Height', 'Cable'),
      m('seated-cable-fly', 'Seated Cable Fly', 'Cable'),
      m('plate-chest-fly', 'Plate-Loaded Chest Fly', 'Plate'),
    ],
  },
  {
    id: 'B5a', session: 'B', station: 5, superset: 'a', reps: [8, 10], load: 'iso', restSec: 0,
    focus: 'Biceps',
    why: 'Superset with pushdowns: about 3 minutes of total arm work keeps the arms full.',
    machines: [
      m('preacher-curl-machine', 'Preacher Curl Machine', 'Pin'),
      m('cable-curl', 'Cable Curl, Straight Bar', 'Cable'),
      m('machine-curl', 'Machine Biceps Curl', 'Pin'),
      m('cable-hammer-curl', 'Cable Rope Hammer Curl', 'Cable'),
    ],
  },
  {
    id: 'B5b', session: 'B', station: 5, superset: 'b', reps: [8, 10], load: 'iso', restSec: 90,
    focus: 'Triceps',
    why: 'The triceps are two-thirds of the upper arm.',
    machines: [
      m('cable-pushdown', 'Cable Triceps Pushdown', 'Cable'),
      m('overhead-cable-ext', 'Overhead Cable Extension', 'Cable'),
      m('machine-triceps-ext', 'Machine Triceps Extension', 'Pin'),
      m('seated-dip-machine', 'Seated Dip Machine', 'Pin'),
    ],
  },
]

export const RULES: readonly { title: string; body: string }[] = [
  { title: 'Machines only', body: 'Pin, plate or cable. No barbells and no spotter, so it is stable enough to push hard safely.' },
  { title: '2 working sets, 1 RIR', body: 'One warm-up at 50% (plus a 75% × 4 ramp on exercise 1), then 2 hard sets. Stop when 1 more rep would be your last.' },
  { title: 'Control the way down', body: 'Lower over 2–3 s, no bouncing. Weeks 1–3: on the last set, go until the reps clearly slow. Beginners stop 3–5 reps too early.' },
  { title: '35-minute cap', body: '5 machines. Rest 2.5 min on presses and rows, 2 min on single-joint moves. The timer starts itself.' },
  { title: 'V-taper priority', body: 'One heavy leg press per session keeps the legs. Everything else goes to lats, side delts and upper chest.' },
]

export function slotsFor(session: SessionId): Slot[] {
  return SLOTS.filter((s) => s.session === session)
}

export function slotById(id: string): Slot | undefined {
  return SLOTS.find((s) => s.id === id)
}

export function machineFor(slot: Slot, exerciseId: string): Machine {
  return slot.machines.find((x) => x.id === exerciseId) ?? slot.machines[0]
}

export function repRange(slot: Slot, machine: Machine): readonly [number, number] {
  return machine.reps ?? slot.reps
}

export function incrementFor(slot: Slot, machine: Machine): number {
  return INCREMENT[machine.load ?? slot.load]
}

export const roundTo = (x: number, step: number) => Math.round(x / step) * step

export function warmupsFor(slot: Slot, workingKg: number | null, step: number) {
  const sets = [{ pct: 50, reps: 10 }]
  if (slot.station === 1 && !slot.superset) sets.push({ pct: 75, reps: 4 })
  return sets.map((w) => ({ ...w, kg: workingKg ? Math.max(step, roundTo((workingKg * w.pct) / 100, step)) : null }))
}

const isDoneSet = (s: SetLog) => s.done && s.kg !== null && s.reps !== null

export function entryComplete(e: ExerciseLog): boolean {
  return e.sets.length > 0 && e.sets.every(isDoneSet)
}

export function doneSets(session: WorkoutSession): number {
  return session.entries.reduce((n, e) => n + e.sets.filter(isDoneSet).length, 0)
}

export function totalSets(session: WorkoutSession): number {
  return session.entries.reduce((n, e) => n + e.sets.length, 0)
}

export function sessionVolume(session: WorkoutSession): number {
  return session.entries.reduce((v, e) => v + e.sets.filter(isDoneSet).reduce((a, s) => a + (s.kg ?? 0) * (s.reps ?? 0), 0), 0)
}

/** A/B alternation follows the last session that had work in it, not the calendar. */
export function nextSessionId(workouts: WorkoutSession[], beforeDate: string): SessionId {
  for (let i = workouts.length - 1; i >= 0; i--) {
    const w = workouts[i]
    if (w.date < beforeDate && doneSets(w) > 0) return w.session === 'A' ? 'B' : 'A'
  }
  return 'A'
}

interface PastPerformance {
  date: string
  kg: number
  reps: number[]
}

/** Completed performances on one machine, newest first. */
export function historyFor(exerciseId: string, workouts: WorkoutSession[], excludeId?: string): PastPerformance[] {
  const out: PastPerformance[] = []
  for (let i = workouts.length - 1; i >= 0; i--) {
    const w = workouts[i]
    if (w.id === excludeId) continue
    const e = w.entries.find((x) => x.exerciseId === exerciseId)
    if (e && entryComplete(e)) out.push({ date: w.date, kg: e.sets[0].kg ?? 0, reps: e.sets.map((s) => s.reps ?? 0) })
  }
  return out
}

export type Advice =
  | { kind: 'new' }
  | { kind: 'progress'; lastKg: number; lastReps: number[]; nextKg: number; inc: number }
  | { kind: 'dip'; lastKg: number; lastReps: number[]; prevReps: number[]; drop: number }
  | { kind: 'hold'; lastKg: number; lastReps: number[]; targetReps: number[] }

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

/**
 * Double progression. Both working sets at the top of the machine's range → add load.
 * Total reps down by more than 2 against the previous session at the same or a lighter
 * load → dip warning (keep the load and check fuel and sleep). Otherwise: beat last time by a rep.
 */
export function adviceFor(slot: Slot, machine: Machine, workouts: WorkoutSession[], excludeId?: string): Advice {
  const [, top] = repRange(slot, machine)
  const [last, prev] = historyFor(machine.id, workouts, excludeId)
  if (!last) return { kind: 'new' }
  if (last.reps.every((r) => r >= top)) {
    const inc = incrementFor(slot, machine)
    return { kind: 'progress', lastKg: last.kg, lastReps: last.reps, nextKg: last.kg + inc, inc }
  }
  if (prev && last.kg <= prev.kg && sum(prev.reps) - sum(last.reps) > 2) {
    return { kind: 'dip', lastKg: last.kg, lastReps: last.reps, prevReps: prev.reps, drop: sum(prev.reps) - sum(last.reps) }
  }
  return { kind: 'hold', lastKg: last.kg, lastReps: last.reps, targetReps: last.reps.map((r) => Math.min(top, r + 1)) }
}

/** Starting weight and rep targets for a fresh entry on `machine`. */
export function entryDefaults(slot: Slot, machine: Machine, workouts: WorkoutSession[], excludeId?: string): SetLog[] {
  const advice = adviceFor(slot, machine, workouts, excludeId)
  const [low, top] = repRange(slot, machine)
  const kg = advice.kind === 'new' ? null : advice.kind === 'progress' ? advice.nextKg : advice.lastKg
  const reps = (i: number) => {
    switch (advice.kind) {
      case 'progress': return low
      case 'hold': return advice.targetReps[i] ?? low
      case 'dip': return advice.lastReps[i] ?? low
      default: return top
    }
  }
  return [0, 1].map((i) => ({ kg, reps: reps(i), done: false }))
}

export function newSession(date: string, session: SessionId, swaps: Record<string, number>, workouts: WorkoutSession[]): WorkoutSession {
  const entries = slotsFor(session).map((slot) => {
    const machine = slot.machines[swaps[slot.id] ?? 0] ?? slot.machines[0]
    const warmups = warmupsFor(slot, null, 1).map(() => false)
    return { slotId: slot.id, exerciseId: machine.id, warmups, sets: entryDefaults(slot, machine, workouts) }
  })
  return { id: `${date}-${session}`, date, session, startedAt: null, finishedAt: null, entries }
}
