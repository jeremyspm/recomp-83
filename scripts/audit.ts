// npm run audit: checks the brief's arithmetic and prints the projection figures
// quoted in PLAN.md, using the same engine the app runs. Exits 1 if any check fails.

import { addDays, localISO, weekdayOf } from '../src/lib/dates.ts'
import { demoState } from '../src/lib/demo.ts'
import { dailyTargets, kcalOf, PLANS, refeedTargets } from '../src/lib/nutrition.ts'
import { alertsFor, currentPhase, modelCheck, phase2Since, projectionFor, trendEta } from '../src/lib/model.ts'
import {
  REFEED_WEEKS, bmi, ffmi, forbesPath, goalCrossing, mifflinStJeor, pctOf, projectedOnDay, targetBand, type ProjectionPoint,
} from '../src/lib/physiology.ts'
import { defaultProfile, defaultSettings, parseBackup, serialize } from '../src/lib/storage.ts'
import { adviceFor, machineFor, slotsFor } from '../src/lib/workouts.ts'
import type { AppState, Settings } from '../src/lib/types.ts'

const r1 = (x: number) => Math.round(x * 10) / 10
let failures = 0
function check(label: string, actual: number, expected: number, tol = 0.05) {
  const ok = Math.abs(actual - expected) <= tol
  if (!ok) failures++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${r1(actual)} (expected ${expected})`)
}

const profile = defaultProfile('2026-10-19')
const settings = defaultSettings()
const fat0 = profile.startWeightKg - profile.startFfmKg

console.log('== Brief arithmetic ==')
check('BMI', bmi(114, 170), 39.4)
check('Start BF %', pctOf(fat0, 114), 40.8)
check('Start FFMI', ffmi(67.5, 170), 23.4)
check('BMR at 114 kg', mifflinStJeor(114, profile), 2072.5)
check('TDEE at 114 kg', mifflinStJeor(114, profile) * profile.activity, 2850, 0.5)
check('Mode 1 lifting kcal', kcalOf(PLANS.strict.lift), 1195)
check('Mode 1 rest kcal', kcalOf(PLANS.strict.rest), 1190)
check('Protein+ lifting kcal', kcalOf(PLANS.strictPlus.lift), 1195)
check('Protein+ rest kcal', kcalOf(PLANS.strictPlus.rest), 1190)
check('Mode 2 Phase 1 kcal', kcalOf(PLANS.recomp[1]), 1498)
check('Mode 2 Phase 2 kcal', kcalOf(PLANS.recomp[2]), 1792)
const crash = forbesPath(profile, 73)
check('Crash 73 kg FFM (Forbes, untrained)', crash.ffmKg, 56.6, 0.1)
check('Crash 73 kg fat', crash.fatKg, 16.4, 0.1)
const band = targetBand(profile)
check('Target band FFM low', band.ffm[0], 66.0)
check('Target band BF % low', pctOf(band.fat[0], 83), 18.7)
check('Target band FFMI low', ffmi(band.ffm[0], 170), 22.8)
const refeed = refeedTargets(settings, 1)
console.log(`     Refeed Mode 1: ${kcalOf(refeed)} kcal = ${refeed.p} P / ${refeed.c} C / ${refeed.f} F`)

function summary(label: string, points: ProjectionPoint[]) {
  const w26 = points[26]
  const cross = goalCrossing(points, profile.goalWeightKg)
  const p2 = points.find((p) => p.phase === 2)
  console.log(
    `${label.padEnd(34)} wk26 ${r1(w26.scaleKg)} kg (fat ${r1(w26.fatKg)}, FFM ${r1(w26.ffmKg)}, ${r1(w26.bfPct)}%)` +
    ` | 83 kg: ${cross ? `wk ${cross.week} → FFM ${r1(cross.ffmKg)} / fat ${r1(cross.fatKg)} (${r1(cross.bfPct)}%, FFMI ${r1(ffmi(cross.ffmKg, 170))})` : 'not within 104 wk'}` +
    (p2 ? ` | Phase 2 from wk ${p2.week}` : ''),
  )
}

console.log('\n== Projection (engine defaults) ==')
const plans: [string, Partial<Settings>][] = [
  ['Mode 1 strict', { mode: 'strict', proteinPlus: false }],
  ['Mode 1 + Protein+', { mode: 'strict', proteinPlus: true }],
  ['Mode 2 recomp (switch 97)', { mode: 'recomp' }],
  ['Mode 2 recomp (switch 90)', { mode: 'recomp', phase2SwitchKg: 90 }],
]
for (const [label, o] of plans) summary(label, projectionFor(profile, { ...settings, ...o }))

console.log('\n== Sensitivity, Mode 1 ==')
for (const cal of [0.9, 1.1]) summary(`TDEE ×${cal}`, projectionFor(profile, settings, { calibration: cal }))
summary('No adaptive dampening', projectionFor(profile, settings, { adaptivePct: 0 }))
for (const lp of [0, 0.9, 1]) summary(`Lean protection ${lp * 100}%`, projectionFor(profile, settings, { leanProtection: lp }))

console.log('\n== Demo data: advice for the next sessions ==')
const demo = demoState(localISO(new Date()))
const expectedAdvice: Record<string, string> = {
  A1: 'progress', A2: 'progress', A3: 'dip', A4: 'progress', A5: 'hold',
  B1: 'progress', B2: 'hold', B3: 'hold', B4: 'progress', B5a: 'hold', B5b: 'progress',
}
for (const session of ['A', 'B'] as const) {
  for (const slot of slotsFor(session)) {
    const machine = machineFor(slot, slot.machines[0].id)
    const a = adviceFor(slot, machine, demo.workouts)
    const ok = a.kind === expectedAdvice[slot.id]
    if (!ok) failures++
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${slot.id.padEnd(4)} ${machine.name.padEnd(30)} ${a.kind}${a.kind === 'progress' ? ` → ${a.nextKg} kg` : ''}`)
  }
}

// ---- Scenarios: synthetic clients run through the model check and the alerts ----

/**
 * A client who follows the plan for `days` days; `today` is the last of them.
 * `trueBurn` scales the expenditure the weigh-ins are generated from, to play a
 * client whose real TDEE differs from the equation.
 */
function synthetic(days: number, opts: { perDay?: (day: number, modelKg: number) => number; mode?: 'strict' | 'recomp'; switchKg?: number; trueBurn?: number } = {}) {
  const start = '2026-01-05'
  const s = { ...settings, mode: opts.mode ?? 'strict', ...(opts.switchKg ? { phase2SwitchKg: opts.switchKg } : {}) }
  const pts = projectionFor(profile, s, opts.trueBurn ? { calibration: opts.trueBurn } : {})
  const state: AppState = { ...demoState(start), profile: { ...profile, startDate: start }, settings: s, workouts: [], weighIns: [], macros: {} }
  const noise = [0.3, -0.2, 0.1, -0.3, 0.2, 0, -0.1]
  for (let d = 0; d <= days; d++) {
    const date = addDays(start, d)
    const modelKg = projectedOnDay(pts, d)
    const kg = opts.perDay ? opts.perDay(d, modelKg) : modelKg + noise[d % 7]
    state.weighIns.push({ date, kg: Math.round(kg * 10) / 10 })
    if (d >= days) continue
    // A compliant client: the plan, plus the two 2,200 kcal refeed days in weeks 7/14/21.
    const phase = currentPhase(state, date)
    const refeedDay = REFEED_WEEKS.includes(Math.floor(d / 7) + 1) && d % 7 >= 5
    state.macros[date] = refeedDay ? refeedTargets(s, phase) : dailyTargets(s, s.liftDays.includes(weekdayOf(date)) ? 'lift' : 'rest', phase)
  }
  return { state, today: addDays(start, days), pts }
}

console.log('\n== Scenarios ==')
{
  const early = synthetic(30)
  const ok = modelCheck(early.state, early.today, early.pts) === null
  if (!ok) failures++
  console.log(`${ok ? 'ok  ' : 'FAIL'} Day 31: model check still locked (needs 20+ days of weigh-ins from Day 15)`)
}
for (const days of [34, 63, 105]) {
  const { state, today, pts } = synthetic(days)
  const mc = modelCheck(state, today, pts)
  const ok = mc !== null && Math.abs(mc.ratio - 1) < 0.04 && !mc.meaningful
  if (!ok) failures++
  console.log(`${ok ? 'ok  ' : 'FAIL'} Day ${days + 1}: on-model client, ratio ${mc ? mc.ratio.toFixed(3) : 'null'} ± ${mc ? Math.round(mc.uncertainty) : '—'} kcal, no calibration offered (${mc?.meaningful ? 'offered' : 'not offered'})`)
}
for (const trueBurn of [1.1, 0.9]) {
  // Weigh-ins come from a body that burns 10% more (or less) than the equation says;
  // the app's model is uncalibrated, as it would be in real life.
  const { state, today } = synthetic(41, { trueBurn })
  const mc = modelCheck(state, today, projectionFor(profile, settings))
  const ok = mc !== null && mc.meaningful && Math.abs(mc.suggested - trueBurn) < 0.04
  if (!ok) failures++
  console.log(`${ok ? 'ok  ' : 'FAIL'} Real burn ×${trueBurn}: model check suggests ×${mc ? mc.suggested.toFixed(3) : '—'} (observed ${mc ? Math.round(mc.observed) : '—'} ± ${mc ? Math.round(mc.uncertainty) : '—'} vs ${mc ? Math.round(mc.modelled) : '—'} kcal)`)
}
{
  const { state, today, pts } = synthetic(35)
  const eta = trendEta(state, today)
  const cross = goalCrossing(pts, profile.goalWeightKg)
  const ok = eta !== null && eta.etaWeek <= (cross?.week ?? 99) && eta.etaWeek >= (cross?.week ?? 0) - 6
  if (!ok) failures++
  console.log(`${ok ? 'ok  ' : 'FAIL'} Straight-line ETA after 5 on-model weeks: week ${eta?.etaWeek ?? '—'} at ${eta?.lossPerWeek.toFixed(2)} kg/wk (model: week ${cross?.week}; a straight line ignores the slowing burn, so slightly earlier)`)
  const ids = alertsFor(state, today).map((a) => a.id)
  const okNone = !ids.includes('rapid') && !ids.includes('plateau')
  if (!okNone) failures++
  console.log(`${okNone ? 'ok  ' : 'FAIL'} On-model client raises no rapid/plateau alert: [${ids.join(', ')}]`)
}
{
  const { state, today } = synthetic(28, { perDay: (d) => 114 - (d < 14 ? d * 0.25 : 3.5 + (d - 14) * 0.3) })
  const ids = alertsFor(state, today).map((a) => a.id)
  const ok = ids.includes('rapid')
  if (!ok) failures++
  console.log(`${ok ? 'ok  ' : 'FAIL'} 2.1 kg/week in weeks 3–4 raises the rapid-loss alert: [${ids.join(', ')}]`)
}
{
  const { state, today } = synthetic(70, { perDay: (d) => (d < 49 ? 114 - d * 0.15 : 114 - 49 * 0.15 + ((d % 3) - 1) * 0.2) })
  const ids = alertsFor(state, today).map((a) => a.id)
  const ok = ids.includes('plateau')
  if (!ok) failures++
  console.log(`${ok ? 'ok  ' : 'FAIL'} Flat weeks 8–10 raise the plateau alert: [${ids.join(', ')}]`)
}
{
  // Day 45 is in week 7 (the first refeed week). Recomp Phase 1 reaches a 108 kg
  // 7-day average around day 43.
  const { state, today } = synthetic(44, { mode: 'recomp', switchKg: 108 })
  const since = phase2Since(state) ?? '—'
  const ids = alertsFor(state, today).map((a) => a.id)
  const ok = currentPhase(state, today) === 2 && ids.includes('refeed') && ids.includes('phase2')
  if (!ok) failures++
  console.log(`${ok ? 'ok  ' : 'FAIL'} Recomp client: Phase 2 since ${since}, day-45 alerts [${ids.join(', ')}]`)
  // Weigh-ins dated after "today" (an import, a changed clock) mustn't leak into today.
  const before = addDays(since, -10)
  const idsBefore = alertsFor(state, before).map((a) => a.id)
  const okBefore = currentPhase(state, before) === 1 && !idsBefore.includes('phase2')
  if (!okBefore) failures++
  console.log(`${okBefore ? 'ok  ' : 'FAIL'} Ten days before the crossing it is still Phase 1 with no Phase-2 banner: [${idsBefore.join(', ')}]`)
}

console.log('\n== Backup ==')
{
  const text = serialize(demo)
  const back = parseBackup(text, '2026-10-24')
  const ok = JSON.stringify(back) === JSON.stringify(demo)
  if (!ok) failures++
  console.log(`${ok ? 'ok  ' : 'FAIL'} Export → import round-trips the demo state exactly (${(text.length / 1024).toFixed(1)} kB)`)
  const rejects = ['not json', '{"version":2,"profile":{}}', '[]', '{"version":1}'].every((bad) => {
    try {
      parseBackup(bad, '2026-10-24')
      return false
    } catch {
      return true
    }
  })
  if (!rejects) failures++
  console.log(`${rejects ? 'ok  ' : 'FAIL'} Garbage, wrong-version and profile-less files are rejected`)
  const messy = parseBackup(JSON.stringify({
    ...demo,
    weighIns: [{ date: '2026-10-20', kg: 'heavy' }, { date: 'yesterday', kg: 110 }, { date: '2026-10-21', kg: 112.4, waistCm: 999 }],
    settings: { ...demo.settings, liftDays: [1, 1, 9, 3], mode: 'keto', calibration: 4 },
  }), '2026-10-24')
  const okMessy = messy.weighIns.length === 1 && messy.weighIns[0].waistCm === undefined &&
    JSON.stringify(messy.settings.liftDays) === '[1,3]' && messy.settings.mode === 'strict' && messy.settings.calibration === 1.15
  if (!okMessy) failures++
  console.log(`${okMessy ? 'ok  ' : 'FAIL'} Bad fields are dropped or clamped, not trusted: ${messy.weighIns.length} weigh-in kept, lift days ${JSON.stringify(messy.settings.liftDays)}, calibration ${messy.settings.calibration}`)
}

if (failures) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log('\nAll checks passed.')
