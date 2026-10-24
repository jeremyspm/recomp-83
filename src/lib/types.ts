export type Sex = 'male' | 'female'
export type NutritionMode = 'strict' | 'recomp'
export type SessionId = 'A' | 'B'
export type DayType = 'lift' | 'rest'
export type Phase = 1 | 2

export interface Profile {
  name: string
  sex: Sex
  age: number
  heightCm: number
  startWeightKg: number
  startFfmKg: number
  /** Physical-activity multiplier applied to Mifflin-St Jeor BMR. */
  activity: number
  goalWeightKg: number
  /** Length of the protocol block (20–26 weeks). */
  planWeeks: number
  /** Day 1 of the protocol, YYYY-MM-DD. */
  startDate: string
}

export interface Settings {
  mode: NutritionMode
  /** Mode 1 only: calorie-neutral swap of 20 g carbs for 20 g protein. */
  proteinPlus: boolean
  /** Mode 2 switches to Phase 2 once the 7-day average reaches this. */
  phase2SwitchKg: number
  /** JS weekday numbers (0 = Sun … 6 = Sat) that are lifting days. */
  liftDays: number[]
  firstMealTime: string
  workoutTime: string
  creatine: boolean
  /** Adaptive thermogenesis / NEAT / TEF dampening at full effect, in %. */
  adaptivePct: number
  /** Share of the Forbes lean loss that lifting + protein prevents (0–1). Null = by plan. */
  leanProtection: number | null
  /** Observed ÷ modelled expenditure from the model check. Null = off. */
  calibration: number | null
  stepGoal: number
  safetyDismissed: boolean
}

export interface WeighIn {
  date: string
  kg: number
  waistCm?: number
  bfPct?: number
}

export interface MacroLog {
  p: number
  c: number
  f: number
}

export interface SetLog {
  kg: number | null
  reps: number | null
  done: boolean
}

export interface ExerciseLog {
  slotId: string
  exerciseId: string
  /** One flag per warm-up set (the first exercise of a session has two). */
  warmups: boolean[]
  sets: SetLog[]
}

export interface WorkoutSession {
  id: string
  date: string
  session: SessionId
  /** Epoch ms of the first ticked set; drives the 35-minute clock. */
  startedAt: number | null
  finishedAt: number | null
  entries: ExerciseLog[]
}

export interface AppState {
  version: 1
  profile: Profile
  settings: Settings
  /** One per date, sorted ascending. */
  weighIns: WeighIn[]
  macros: Record<string, MacroLog>
  /** Ticked checklist item ids, per date. */
  checks: Record<string, string[]>
  /** Manual lifting/rest override, per date. */
  dayTypes: Record<string, DayType>
  /** Sorted ascending by date. */
  workouts: WorkoutSession[]
  /** Chosen machine per slot (index into the slot's options). */
  swaps: Record<string, number>
}
