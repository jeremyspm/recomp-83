import { fmtClock, minutesOf } from './dates.ts'
import { REFEED_KCAL, type IntakeRule } from './physiology.ts'
import type { DayType, Phase, Settings } from './types.ts'

export interface Macros {
  p: number
  c: number
  f: number
}

export const kcalOf = (m: Macros) => m.p * 4 + m.c * 4 + m.f * 9

export const PLANS = {
  /** Mode 1: the client's plan. */
  strict: { lift: { p: 120, c: 100, f: 35 }, rest: { p: 120, c: 65, f: 50 } },
  /** Mode 1 + Protein+ swap: 20 g carbs → 20 g protein, same calories. */
  strictPlus: { lift: { p: 140, c: 80, f: 35 }, rest: { p: 140, c: 45, f: 50 } },
  /** Mode 2: two-phase recomp. Phase 1 fat is 42 g so the macros really total ~1,500. */
  recomp: { 1: { p: 170, c: 110, f: 42 }, 2: { p: 180, c: 160, f: 48 } },
} as const

type PlanSettings = Pick<Settings, 'mode' | 'proteinPlus'>

export function dailyTargets(s: PlanSettings, dayType: DayType, phase: Phase): Macros {
  if (s.mode === 'recomp') return PLANS.recomp[phase]
  return (s.proteinPlus ? PLANS.strictPlus : PLANS.strict)[dayType]
}

export function averageDailyKcal(s: PlanSettings & Pick<Settings, 'liftDays'>, phase: Phase): number {
  const lifts = s.liftDays.length
  const lift = kcalOf(dailyTargets(s, 'lift', phase))
  const rest = kcalOf(dailyTargets(s, 'rest', phase))
  return (lifts * lift + (7 - lifts) * rest) / 7
}

/** Intake for the projection: Mode 2 moves to Phase 2 once projected weight reaches the switch. */
export function intakeRule(s: PlanSettings & Pick<Settings, 'liftDays' | 'phase2SwitchKg'>): IntakeRule {
  return (_week, scaleKg, phase) => {
    const next: Phase = s.mode === 'recomp' && (phase === 2 || scaleKg <= s.phase2SwitchKg) ? 2 : 1
    return { kcal: averageDailyKcal(s, next), phase: next }
  }
}

/** Lean protection the projection assumes for each plan (60/65/70%). See PLAN.md §B1. */
export function planLeanProtection(s: PlanSettings): number {
  if (s.mode === 'recomp') return 0.7
  return s.proteinPlus ? 0.65 : 0.6
}

/** 48-hour refeed: 2,200 kcal, protein held at the plan's target, 300 g carbs, fat fills the rest. */
export function refeedTargets(s: PlanSettings, phase: Phase): Macros {
  const p = Math.max(120, dailyTargets(s, 'lift', phase).p)
  const c = 300
  const f = Math.max(25, Math.round((REFEED_KCAL - p * 4 - c * 4) / 9))
  return { p, c, f }
}

export function planName(s: PlanSettings, phase: Phase): string {
  if (s.mode === 'recomp') return `Recomp · Phase ${phase}`
  return s.proteinPlus ? 'Strict 1,200 · Protein+' : 'Strict 1,200'
}

export interface Feed {
  id: string
  title: string
  minutes: number
  clock: string
  macros: Macros
  bolus: boolean
  notes: string[]
}

const round5 = (x: number) => Math.round(x / 5) * 5
const LAST_MEAL = 19 * 60 + 30

/**
 * Meal timing generated from the day's targets. Lifting days bookend carbs around
 * the session (45 g before, 35 g after); every day carries one ≥ 15 g fat meal for
 * gallbladder emptying; protein lands in three feeds of roughly equal size.
 */
export function mealPlan(m: Macros, dayType: DayType, firstMealTime: string, workoutTime: string): Feed[] {
  const first = minutesOf(firstMealTime)
  const feed = (id: string, title: string, minutes: number, macros: Macros, notes: string[] = []): Feed => ({
    id, title, minutes, clock: fmtClock(minutes), macros, bolus: macros.f >= 15, notes,
  })

  if (dayType === 'rest') {
    const p1 = round5(m.p / 3)
    const c1 = Math.round(m.c * 0.3)
    const f1 = Math.round(m.f * 0.4)
    const f2 = Math.round(m.f * 0.2)
    return [
      feed('meal1', 'Meal 1 · window opens', first, { p: p1, c: c1, f: f1 }, ['Veg: 1–2 fists']),
      feed('snack', 'Afternoon feed', first + 210, { p: p1, c: c1, f: f2 }),
      feed('last', 'Last meal', Math.max(first + 420, LAST_MEAL), { p: m.p - 2 * p1, c: m.c - 2 * c1, f: m.f - f1 - f2 }, ['Veg: 1–2 fists']),
    ]
  }

  const workout = minutesOf(workoutTime)
  const preC = Math.min(45, m.c)
  const postC = Math.min(35, m.c - preC)
  const spareC = m.c - preC - postC
  const p1 = round5(m.p / 3)
  const postF = Math.min(5, m.f)
  const meal1F = Math.round((m.f - postF) / 2)
  const meal1C = Math.floor(spareC / 2)
  const preNotes = ['1,000 mg sodium · scant ½ tsp salt', '500 mL water']
  if (workout - 60 < first) preNotes.unshift('Training early: this snack opens your window today')

  const feeds = [
    feed('meal1', 'Meal 1 · window opens', first, { p: p1, c: meal1C, f: meal1F }, ['Veg: 1–2 fists']),
    feed('pre', 'Pre-workout · 60 min before', workout - 60, { p: 0, c: preC, f: 0 }, preNotes),
  ]
  const lastMacros = { p: m.p - 2 * p1, c: spareC - meal1C, f: m.f - postF - meal1F }
  if (workout + 50 >= LAST_MEAL - 60) {
    // Late session: the post-workout meal is dinner.
    feeds.push(feed('post', 'Post-workout dinner', workout + 50, {
      p: p1 + lastMacros.p, c: postC + lastMacros.c, f: postF + lastMacros.f,
    }, ['Veg: 1–2 fists']))
  } else {
    feeds.push(feed('post', 'Post-workout', workout + 50, { p: p1, c: postC, f: postF }))
    feeds.push(feed('last', 'Last meal', Math.max(workout + 180, LAST_MEAL), lastMacros, ['Veg: 1–2 fists']))
  }
  return feeds.sort((a, b) => a.minutes - b.minutes)
}

export interface CheckItem {
  id: string
  label: string
  detail: string
  why: string
}

export function checklistFor(s: Settings, dayType: DayType, targets: Macros): CheckItem[] {
  const pre = fmtClock(minutesOf(s.workoutTime) - 60)
  const feedP = round5(targets.p / 3)
  const items: (CheckItem | null)[] = [
    {
      id: 'window',
      label: `Eating window opens ${fmtClock(minutesOf(s.firstMealTime))}`,
      detail: 'Water, black coffee or tea until then.',
      why: 'It saves calories for the afternoon and evening, when hunger peaks. It helps you stick to the plan, but it burns no extra fat (Liu 2022).',
    },
    dayType === 'lift'
      ? {
          id: 'preworkout',
          label: `Pre-workout at ${pre}: salt + water + carbs`,
          detail: '1,000 mg sodium (a scant ½ tsp salt) + 500 mL water + 45 g carbs.',
          why: 'Low carbs flush out sodium and water, which drops blood volume. That causes the head-rush on standing and weak sets. Skip the salt (or ask your GP) if you have high blood pressure, take BP medicine, or have kidney or heart disease.',
        }
      : null,
    {
      id: 'supps',
      label: 'Creatine 5 g + multivitamin',
      detail: 'Any time of day. Taking it every day matters more than when.',
      why: 'Creatine gets you more reps per set and stores ~1–2 kg of water inside the muscle. A multivitamin fills the gaps a 1,200 kcal diet leaves. Tell your GP about the creatine before a blood test: it raises creatinine.',
    },
    {
      id: 'fat',
      label: 'One meal with ≥ 15 g fat',
      detail: 'e.g. 2 eggs + 5 g butter, 30 g cheese, or ½ avocado.',
      why: 'A decent dose of fat makes the gallbladder empty fully. Fast weight loss plus low-fat meals is the classic setup for gallstones (Festi 1998).',
    },
    {
      id: 'protein',
      label: `Protein: 3 feeds × ~${feedP} g`,
      detail: `${targets.p} g total, all inside the eating window.`,
      why: 'Lifting plus enough protein, spread across the day, is how you keep muscle in a deficit (Longland 2016).',
    },
    {
      id: 'steps',
      label: `Steps ≥ ${s.stepGoal.toLocaleString()}`,
      detail: 'A 10-minute walk after each meal covers most of it.',
      why: 'As you diet, your body quietly cuts how much you move (NEAT). That is most of the "slowing metabolism". Walking defends it, and it isn\'t a workout.',
    },
    {
      id: 'sleep',
      label: 'Slept 7 h+ last night',
      detail: 'Same wake time every day, even rest days.',
      why: 'In one diet study, sleeping 5.5 h instead of 8.5 h meant 55% less fat lost and 60% more muscle lost (Nedeltcheva 2010).',
    },
  ]
  return items.filter((i): i is CheckItem => i !== null)
}
