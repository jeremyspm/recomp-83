// Glue between the stored state and the pure engines: which phase and day type
// apply today, the projection for the current settings, alerts and the model check.

import { addDays, daysBetween, weekdayOf, weekOf } from './dates.ts'
import { averageDailyKcal, dailyTargets, intakeRule, kcalOf, planLeanProtection, refeedTargets } from './nutrition.ts'
import {
  CREATINE_WEEKS, RAPID_LOSS_KG_WEEK, REFEED_WEEKS, expectedWaterKg, expenditureAt, project, type ProjectionPoint,
} from './physiology.ts'
import { mean, recentSlope, windowAverage, weeklyLoss } from './stats.ts'
import type { AppState, DayType, Phase, Profile, Settings } from './types.ts'

export const HORIZON_WEEKS = 104

export type PlanOverrides = Partial<Pick<Settings,
  'mode' | 'proteinPlus' | 'phase2SwitchKg' | 'leanProtection' | 'adaptivePct' | 'creatine' | 'calibration'>>

export function effectiveLeanProtection(s: Settings): number {
  return s.leanProtection ?? planLeanProtection(s)
}

export function projectionFor(profile: Profile, settings: Settings, overrides: PlanOverrides = {}): ProjectionPoint[] {
  const s = { ...settings, ...overrides }
  return project({
    profile,
    adaptivePct: s.adaptivePct,
    creatine: s.creatine,
    leanProtection: effectiveLeanProtection(s),
    calibration: s.calibration ?? 1,
    weeks: HORIZON_WEEKS,
    intake: intakeRule(s),
  })
}

/** Mode 2 enters Phase 2 the first time a 7-day average (≥ 3 weigh-ins) reaches the switch. */
export function phase2Since(state: AppState): string | null {
  if (state.settings.mode !== 'recomp') return null
  for (const w of state.weighIns) {
    const avg = windowAverage(state.weighIns, w.date)
    if (avg && avg.n >= 3 && avg.avg <= state.settings.phase2SwitchKg) return w.date
  }
  return null
}

export function currentPhase(state: AppState, date: string): Phase {
  const since = phase2Since(state)
  return since !== null && since <= date ? 2 : 1
}

export function dayTypeFor(state: AppState, date: string): DayType {
  const override = state.dayTypes[date]
  if (override) return override
  if (state.workouts.some((w) => w.date === date && w.entries.some((e) => e.sets.some((s) => s.done)))) return 'lift'
  return state.settings.liftDays.includes(weekdayOf(date)) ? 'lift' : 'rest'
}

export function protocolDay(state: AppState, today: string) {
  const day = daysBetween(state.profile.startDate, today)
  return { day, dayNumber: day + 1, week: weekOf(state.profile.startDate, today) }
}

export function isRefeedWeek(week: number): boolean {
  return REFEED_WEEKS.includes(week)
}

export function nextRefeedWeek(week: number): number | null {
  return REFEED_WEEKS.find((w) => w > week) ?? null
}

export function todaysTargets(state: AppState, today: string) {
  const phase = currentPhase(state, today)
  const dayType = dayTypeFor(state, today)
  const macros = dailyTargets(state.settings, dayType, phase)
  return { phase, dayType, macros, kcal: kcalOf(macros), refeed: refeedTargets(state.settings, phase) }
}

/** Latest 7-day average, or the last weigh-in, or the start weight. */
export function currentWeight(state: AppState, today: string): number {
  return windowAverage(state.weighIns, today)?.avg ?? state.weighIns.at(-1)?.kg ?? state.profile.startWeightKg
}

export interface TrendEta {
  lossPerWeek: number
  weeksToGoal: number
  etaWeek: number
}

/** Weigh-ins with the known flush/creatine water taken out, leaving tissue change. */
function tissueWeighIns(state: AppState) {
  const { startDate } = state.profile
  return state.weighIns.map((w) => ({ ...w, kg: w.kg - expectedWaterKg(daysBetween(startDate, w.date), state.settings.creatine) }))
}

function tissueFit(state: AppState, today: string, minSpanDays: number) {
  return recentSlope(tissueWeighIns(state), state.profile.startDate, today, minSpanDays)
}

/** Straight-line ETA from the last 2–3 weeks of real weigh-ins (after the water flush). */
export function trendEta(state: AppState, today: string): TrendEta | null {
  const fit = tissueFit(state, today, 14)
  if (!fit || fit.slope >= 0) return null
  const lossPerWeek = -fit.slope * 7
  // The goal is reached after the water has settled (end of week 4), so the scale
  // will read the tissue trend plus that fixed offset.
  const scaleNow = fit.todayKg + expectedWaterKg(CREATINE_WEEKS * 7, state.settings.creatine)
  const weeksToGoal = Math.max(0, (scaleNow - state.profile.goalWeightKg) / lossPerWeek)
  return { lossPerWeek, weeksToGoal, etaWeek: Math.ceil(weekOf(state.profile.startDate, today) + weeksToGoal) }
}

export interface ModelCheck {
  windowFrom: string
  weighIns: number
  loggedDays: number
  lossPerWeek: number
  avgIntake: number
  observed: number
  /** ± one standard error of the observed burn, from the scatter of the weigh-ins. */
  uncertainty: number
  modelled: number
  ratio: number
  /** True when the gap to the model is bigger than twice the uncertainty. */
  meaningful: boolean
  suggested: number
}

/**
 * Observed TDEE = average logged intake + (tissue lost per day × energy density of
 * the loss). The weight trend has the known creatine/flush water taken out first,
 * otherwise creatine loading in weeks 3–4 reads as a ~10% lower burn. A slope from
 * 10 days of normal scale noise (±0.5 kg) is only good to about ±17%, so this waits
 * for 20+ days of weigh-ins after the flush (from Day 15) and 14+ logged days.
 * The suggested calibration is clamped to ±15%.
 */
export function modelCheck(state: AppState, today: string, points: ProjectionPoint[]): ModelCheck | null {
  const fit = tissueFit(state, today, 20)
  if (!fit || fit.n < 12) return null
  const logged = Object.entries(state.macros).filter(([d]) => d >= fit.from && d <= today)
  if (logged.length < 14) return null
  const avgIntake = mean(logged.map(([, m]) => kcalOf(m)))
  const { week } = protocolDay(state, today)
  const point = points[Math.min(week, points.length - 1)]
  const observed = avgIntake - fit.slope * point.energyDensity
  const midKg = mean(state.weighIns.filter((w) => w.date >= fit.from && w.date <= today).map((w) => w.kg))
  const midWeek = weekOf(state.profile.startDate, addDays(fit.from, Math.round(daysBetween(fit.from, today) / 2)))
  const modelled = expenditureAt(midKg, midWeek, state.profile, state.settings.adaptivePct).expenditure
  const ratio = observed / modelled
  const uncertainty = fit.slopeSE * point.energyDensity
  return {
    windowFrom: fit.from,
    weighIns: fit.n,
    loggedDays: logged.length,
    lossPerWeek: -fit.slope * 7,
    avgIntake,
    observed,
    uncertainty,
    modelled,
    ratio,
    meaningful: Math.abs(observed - modelled) > 2 * uncertainty,
    suggested: Math.min(1.15, Math.max(0.85, ratio)),
  }
}

export interface Alert {
  id: string
  tone: 'amber' | 'rose' | 'cyan' | 'emerald'
  title: string
  body: string
}

export function alertsFor(state: AppState, today: string): Alert[] {
  const alerts: Alert[] = []
  const { week } = protocolDay(state, today)
  const t = todaysTargets(state, today)
  if (isRefeedWeek(week)) {
    alerts.push({
      id: 'refeed',
      tone: 'amber',
      title: `Week ${week}: diet break, 48-hour refeed`,
      body: `Pick 2 days in a row, ideally ending on a lifting day: ${kcalOf(t.refeed).toLocaleString()} kcal · ${t.refeed.p} P / ${t.refeed.c} C / ${t.refeed.f} F. Refills glycogen and gives you a mental break. Expect the scale to go up 1–2 kg (water) for 2–4 days.`,
    })
  }
  const loss = weeklyLoss(state.weighIns, today)
  if (week >= 3 && loss !== null && loss > RAPID_LOSS_KG_WEEK) {
    alerts.push({
      id: 'rapid',
      tone: 'rose',
      title: `Losing ${loss.toFixed(1)} kg/week: faster than is safe`,
      body: 'Past 1.5 kg/week (after the first two weeks of water loss) gallstone and muscle-loss risk climbs steeply. Add 150–200 kcal (protein or fat), keep the daily fat meal, and mention it to your GP.',
    })
  }
  const twoWeeksAgo = windowAverage(state.weighIns, addDays(today, -14))
  const now = windowAverage(state.weighIns, today)
  const recentRefeed = isRefeedWeek(week) || isRefeedWeek(week - 1)
  if (week >= 5 && !recentRefeed && now && twoWeeksAgo && now.n >= 3 && twoWeeksAgo.n >= 3 && twoWeeksAgo.avg - now.avg < 0.3) {
    alerts.push({
      id: 'plateau',
      tone: 'cyan',
      title: 'Two weeks with no real change',
      body: 'Check portions (weigh food for 3 days), steps and sleep first. Don\'t drop below 1,200 kcal without a doctor involved. A diet break can also help adherence.',
    })
  }
  const since = phase2Since(state)
  if (since && since <= today && daysBetween(since, today) <= 7) {
    alerts.push({
      id: 'phase2',
      tone: 'emerald',
      title: `Phase 2 unlocked: ${state.settings.phase2SwitchKg} kg reached`,
      body: `Targets step up to ${kcalOf(dailyTargets(state.settings, 'lift', 2)).toLocaleString()} kcal. The extra carbs refill glycogen, so expect about +0.5 kg of water. That isn't fat.`,
    })
  }
  return alerts
}

export function weeklyPlanKcal(state: AppState, today: string): number {
  return averageDailyKcal(state.settings, currentPhase(state, today))
}
