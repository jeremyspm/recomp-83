// The physiological engine. Pure functions only: no DOM, no React, so the
// audit script (scripts/audit.ts) can run the exact same maths under Node.
//
// Model, per week:
//   BMR         Mifflin-St Jeor at the projected scale weight (Mifflin 1990)
//   TDEE        BMR × activity multiplier × calibration (1 until the model check runs)
//   adaptive    TDEE × adaptive% phased in over weeks 1–4. One number standing in for
//               metabolic adaptation, lost NEAT and a smaller thermic effect of food
//               (Rosenbaum & Leibel 2010: 10–15%)
//   tissue lost 7 × deficit ÷ energy density of what is lost
//   partition   lean share p = Forbes C/(C+fat) × (1 − lean protection)
//               (Forbes 2000; Hall 2007). Protection 0 is the untrained/crash-diet path
//   density     p × 1,816 + (1 − p) × 9,440 kcal/kg (Hall 2008)
//   water       −2.2 kg glycogen flush in weeks 1–2; +1.0 kg creatine water in weeks 1–4

import type { Phase, Profile } from './types.ts'

export const RHO_FAT = 9440
export const RHO_LEAN = 1816
export const FORBES_C = 10.4
export const FLUSH_BY_WEEK = [1.4, 0.8]
export const CREATINE_KG = 1.0
export const CREATINE_WEEKS = 4
export const ADAPT_RAMP_WEEKS = 4
export const REFEED_WEEKS = [7, 14, 21]
export const REFEED_DAYS = 2
export const REFEED_KCAL = 2200
/** Above this weekly rate (after the water flush) gallstone risk climbs steeply (Weinsier 1995). */
export const RAPID_LOSS_KG_WEEK = 1.5

export const bmi = (kg: number, heightCm: number) => kg / (heightCm / 100) ** 2
export const ffmi = (ffmKg: number, heightCm: number) => ffmKg / (heightCm / 100) ** 2
export const pctOf = (part: number, whole: number) => (part / whole) * 100

export function mifflinStJeor(kg: number, p: Pick<Profile, 'heightCm' | 'age' | 'sex'>): number {
  return 10 * kg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'male' ? 5 : -161)
}

export function adaptiveFraction(week: number, adaptivePct: number): number {
  const ramp = Math.min(Math.max(week, 0), ADAPT_RAMP_WEEKS) / ADAPT_RAMP_WEEKS
  return (adaptivePct / 100) * ramp
}

export interface Expenditure {
  bmr: number
  tdee: number
  adaptive: number
  expenditure: number
}

export function expenditureAt(kg: number, week: number, profile: Profile, adaptivePct: number, calibration = 1): Expenditure {
  const bmr = mifflinStJeor(kg, profile)
  const tdee = bmr * profile.activity * calibration
  const adaptive = tdee * adaptiveFraction(week, adaptivePct)
  return { bmr, tdee, adaptive, expenditure: tdee - adaptive }
}

export function forbesLeanShare(fatKg: number): number {
  return FORBES_C / (FORBES_C + Math.max(fatKg, 1))
}

export function energyDensity(leanShare: number): number {
  return leanShare * RHO_LEAN + (1 - leanShare) * RHO_FAT
}

export type IntakeRule = (week: number, scaleKg: number, phase: Phase) => { kcal: number; phase: Phase }

export interface ProjectionInput {
  profile: Profile
  adaptivePct: number
  creatine: boolean
  /** 0 = untrained Forbes partition, 1 = every lost kilo is fat. */
  leanProtection: number
  calibration: number
  weeks: number
  intake: IntakeRule
  refeedWeeks?: number[]
  refeedKcal?: number
}

/** State at the END of `week` (week 0 = the morning of Day 1). */
export interface ProjectionPoint extends Expenditure {
  week: number
  scaleKg: number
  fatKg: number
  /** Fat-free mass as a scan would read it: scale − fat, so it includes water shifts. */
  ffmKg: number
  bfPct: number
  intake: number
  deficit: number
  energyDensity: number
  leanShare: number
  phase: Phase
  refeed: boolean
}

export function project(input: ProjectionInput): ProjectionPoint[] {
  const { profile, leanProtection } = input
  const refeedWeeks = input.refeedWeeks ?? REFEED_WEEKS
  const refeedKcal = input.refeedKcal ?? REFEED_KCAL
  let fat = profile.startWeightKg - profile.startFfmKg
  let lean = profile.startFfmKg
  let water = 0
  let phase: Phase = 1

  const startE = expenditureAt(profile.startWeightKg, 0, profile, input.adaptivePct, input.calibration)
  const startPlan = input.intake(1, profile.startWeightKg, 1)
  const startShare = forbesLeanShare(fat) * (1 - leanProtection)
  const points: ProjectionPoint[] = [{
    week: 0,
    scaleKg: profile.startWeightKg,
    fatKg: fat,
    ffmKg: lean,
    bfPct: pctOf(fat, profile.startWeightKg),
    ...startE,
    intake: startPlan.kcal,
    deficit: startE.expenditure - startPlan.kcal,
    energyDensity: energyDensity(startShare),
    leanShare: startShare,
    phase: 1,
    refeed: false,
  }]

  for (let week = 1; week <= input.weeks; week++) {
    const scaleStart = fat + lean + water
    const plan = input.intake(week, scaleStart, phase)
    phase = plan.phase
    const refeed = refeedWeeks.includes(week)
    const intake = refeed ? (plan.kcal * (7 - REFEED_DAYS) + refeedKcal * REFEED_DAYS) / 7 : plan.kcal
    const e = expenditureAt(scaleStart, week, profile, input.adaptivePct, input.calibration)
    const deficit = e.expenditure - intake
    const forbes = forbesLeanShare(fat)
    // Lifting + protein protect lean tissue in a deficit; in a surplus the plain
    // Forbes split applies (an obese body gains mostly fat).
    const leanShare = deficit > 0 ? forbes * (1 - leanProtection) : forbes
    const density = energyDensity(leanShare)
    const tissueLost = (7 * deficit) / density
    fat -= tissueLost * (1 - leanShare)
    lean -= tissueLost * leanShare
    water -= FLUSH_BY_WEEK[week - 1] ?? 0
    if (input.creatine && week <= CREATINE_WEEKS) water += CREATINE_KG / CREATINE_WEEKS
    const scaleKg = fat + lean + water
    points.push({
      week,
      scaleKg,
      fatKg: fat,
      ffmKg: scaleKg - fat,
      bfPct: pctOf(fat, scaleKg),
      ...e,
      intake,
      deficit,
      energyDensity: density,
      leanShare,
      phase,
      refeed,
    })
  }
  return points
}

/**
 * Known water shift on a given day (0 = Day 1): the glycogen flush (weeks 1–2) and
 * creatine loading (weeks 1–4), spread evenly through each week, matching the projection.
 * Subtracting it from weigh-ins leaves the tissue trend, which is what the model
 * check and the trend ETA need.
 */
export function expectedWaterKg(day: number, creatine: boolean): number {
  const w = Math.max(0, day / 7)
  let water = 0
  FLUSH_BY_WEEK.forEach((kg, i) => {
    water -= kg * Math.min(1, Math.max(0, w - i))
  })
  if (creatine) water += CREATINE_KG * Math.min(1, w / CREATINE_WEEKS)
  return water
}

/** Projected scale weight on a given day index (0 = Day 1), linearly interpolated. */
export function projectedOnDay(points: ProjectionPoint[], day: number): number {
  const w = Math.max(0, day / 7)
  const i = Math.min(Math.floor(w), points.length - 1)
  const j = Math.min(i + 1, points.length - 1)
  const t = w - i
  return points[i].scaleKg + (points[j].scaleKg - points[i].scaleKg) * t
}

export interface GoalCrossing {
  /** Fractional week at which the curve reaches the goal. */
  weekExact: number
  /** Week whose end first shows the goal on the scale. */
  week: number
  fatKg: number
  ffmKg: number
  bfPct: number
}

export function goalCrossing(points: ProjectionPoint[], goalKg: number): GoalCrossing | null {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    if (b.scaleKg <= goalKg && a.scaleKg > goalKg) {
      const t = (a.scaleKg - goalKg) / (a.scaleKg - b.scaleKg)
      const fatKg = a.fatKg + (b.fatKg - a.fatKg) * t
      return { weekExact: i - 1 + t, week: i, fatKg, ffmKg: goalKg - fatKg, bfPct: pctOf(fatKg, goalKg) }
    }
  }
  return null
}

/**
 * Where an untrained, low-protein diet lands at `targetKg`: integrate the Forbes
 * curve FFM = FFM0 + C·ln(F/F0) and solve FFM + F = target. This is the
 * "crash-dieted" benchmark (56.5 kg FFM / 16.5 kg fat at 73 kg for the default profile).
 */
export function forbesPath(profile: Profile, targetKg: number): { fatKg: number; ffmKg: number } {
  const fat0 = profile.startWeightKg - profile.startFfmKg
  let lo = 0.5
  let hi = fat0
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    const total = profile.startFfmKg + FORBES_C * Math.log(mid / fat0) + mid
    if (total > targetKg) hi = mid
    else lo = mid
  }
  const fatKg = (lo + hi) / 2
  return { fatKg, ffmKg: targetKg - fatKg }
}

/** The brief's best-case target band: keep all but 1.5 kg of starting FFM. */
export function targetBand(profile: Profile) {
  const ffmHi = profile.startFfmKg
  const ffmLo = profile.startFfmKg - 1.5
  return {
    ffm: [ffmLo, ffmHi] as const,
    fat: [profile.goalWeightKg - ffmHi, profile.goalWeightKg - ffmLo] as const,
  }
}
