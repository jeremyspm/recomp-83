import { ChevronRight, Dumbbell, LineChart, ListChecks, Utensils } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AlertList } from '../components/AlertList.tsx'
import { CompositionGauge } from '../components/CompositionGauge.tsx'
import { SafetyCard } from '../components/SafetyCard.tsx'
import { Button, Card, Chip, ProgressBar, SectionTitle, Segmented, Stat } from '../components/ui.tsx'
import { WeighInCard } from '../components/WeighInCard.tsx'
import { ChartLegend, WeightChart } from '../components/WeightChart.tsx'
import { fmtDay, WEEKDAYS, weekdayOf, addDays } from '../lib/dates.ts'
import {
  alertsFor, currentWeight, dayTypeFor, projectionFor, protocolDay, todaysTargets, trendEta,
} from '../lib/model.ts'
import { checklistFor } from '../lib/nutrition.ts'
import { bmi, expenditureAt, goalCrossing } from '../lib/physiology.ts'
import { weeklyLoss } from '../lib/stats.ts'
import { doneSets, nextSessionId } from '../lib/workouts.ts'
import { useToday } from '../state/clock.ts'
import type { TabId } from '../state/route.ts'
import { useStore } from '../state/store.ts'

const SESSION_NAME = { A: 'V-taper width + quads', B: 'Back density + press' } as const
type ChartRange = 'zoom' | 'block' | 'goal'

export function DashboardView({ go }: { go: (t: TabId) => void }) {
  const { state } = useStore()
  const today = useToday()
  const { profile, settings } = state
  const points = useMemo(() => projectionFor(profile, settings), [profile, settings])
  const crossing = useMemo(() => goalCrossing(points, profile.goalWeightKg), [points, profile.goalWeightKg])

  const { week } = protocolDay(state, today)
  const [range, setRange] = useState<ChartRange>(() => (week <= 6 ? 'zoom' : 'block'))
  const alerts = alertsFor(state, today)
  const t = todaysTargets(state, today)
  const trendKg = currentWeight(state, today)
  const lost = profile.startWeightKg - trendKg
  const loss = weeklyLoss(state.weighIns, today)
  const eta = trendEta(state, today)
  const burn = expenditureAt(trendKg, Math.max(week, 0), profile, settings.adaptivePct, settings.calibration ?? 1)
  const waist = [...state.weighIns].reverse().find((w) => w.waistCm)?.waistCm
  const checks = checklistFor(settings, t.dayType, t.macros)
  const ticked = (state.checks[today] ?? []).filter((id) => checks.some((c) => c.id === id)).length
  const todaysSession = state.workouts.find((w) => w.date === today)
  const session = todaysSession?.session ?? nextSessionId(state.workouts, today)
  const atWeekEnd = points[Math.min(profile.planWeeks, points.length - 1)]
  const zoomFrom = Math.max(0, week - 4)
  const [fromWeek, toWeek] = range === 'zoom'
    ? [zoomFrom, Math.max(zoomFrom + 6, week + 2)]
    : range === 'goal'
      ? [0, Math.max(profile.planWeeks, (crossing?.week ?? profile.planWeeks) + 1)]
      : [0, profile.planWeeks]

  let nextLift = ''
  if (t.dayType !== 'lift') {
    for (let i = 1; i <= 7; i++) {
      const d = addDays(today, i)
      if (dayTypeFor(state, d) === 'lift') {
        nextLift = i === 1 ? 'tomorrow' : WEEKDAYS[weekdayOf(d)]
        break
      }
    }
  }

  return (
    <div className="space-y-4">
      <SafetyCard />
      <AlertList alerts={alerts} />

      <Card>
        <SectionTitle right={<Chip tone={t.dayType === 'lift' ? 'emerald' : 'slate'}>{t.dayType === 'lift' ? 'Lifting day' : 'Rest day'}</Chip>}>
          Today · {fmtDay(today)}
        </SectionTitle>
        <div className="space-y-2">
          <button type="button" onClick={() => go('workout')} className="flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-left hover:border-slate-700">
            <Dumbbell className="size-5 shrink-0 text-emerald-400" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-100">
                {todaysSession?.finishedAt
                  ? `Session ${session} done: ${doneSets(todaysSession)} sets`
                  : t.dayType === 'lift'
                    ? `Session ${session}: ${SESSION_NAME[session]}`
                    : `Next lift ${nextLift || 'on your next lifting day'}: Session ${session}`}
              </span>
              <span className="block text-xs text-slate-400">5 machines · 2 hard sets each · about 32 min</span>
            </span>
            <ChevronRight className="size-4 text-slate-500" aria-hidden />
          </button>
          <button type="button" onClick={() => go('nutrition')} className="flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-left hover:border-slate-700">
            <Utensils className="size-5 shrink-0 text-amber-400" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold tabular-nums text-slate-100">{t.kcal.toLocaleString()} kcal · {t.macros.p} P · {t.macros.c} C · {t.macros.f} F</span>
              <span className="block text-xs text-slate-400">
                {settings.mode === 'recomp' ? `Recomp Phase ${t.phase}` : settings.proteinPlus ? 'Strict 1,200 · Protein+' : 'Strict 1,200 plan'}
                {t.dayType === 'lift' ? ' · carbs around the session' : ' · two fat-bolus meals'}
              </span>
            </span>
            <ChevronRight className="size-4 text-slate-500" aria-hidden />
          </button>
          <button type="button" onClick={() => go('nutrition')} className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-left hover:border-slate-700">
            <span className="mb-2 flex items-center gap-3">
              <ListChecks className="size-5 shrink-0 text-cyan-400" aria-hidden />
              <span className="flex-1 text-sm font-semibold text-slate-100">Daily actions</span>
              <span className="text-sm font-bold tabular-nums text-slate-200">{ticked}/{checks.length}</span>
            </span>
            <ProgressBar value={ticked} max={checks.length} tone="cyan" label="Daily actions done" />
          </button>
        </div>
      </Card>

      <WeighInCard />

      <div className="grid grid-cols-2 gap-2">
        <Stat label="7-day trend" value={trendKg.toFixed(1)} unit="kg" sub={`${lost >= 0 ? '−' : '+'}${Math.abs(lost).toFixed(1)} kg since Day 1`} tone="emerald" />
        <Stat
          label="Weekly rate"
          value={loss === null ? '—' : `${loss >= 0 ? '−' : '+'}${Math.abs(loss).toFixed(1)}`}
          unit={loss === null ? undefined : 'kg/wk'}
          sub={loss === null ? 'Shows from week 2' : `${((loss / trendKg) * 100).toFixed(1)}% of body weight`}
          tone={loss !== null && loss > 1.5 && week >= 3 ? 'rose' : 'slate'}
        />
        <Stat label="Est. burn today" value={Math.round(burn.expenditure).toLocaleString()} unit="kcal" sub={`Deficit ≈ ${Math.round(burn.expenditure - t.kcal).toLocaleString()} kcal`} tone="cyan" />
        <Stat
          label={waist ? 'Waist ÷ height' : 'BMI'}
          value={waist ? (waist / profile.heightCm).toFixed(2) : bmi(trendKg, profile.heightCm).toFixed(1)}
          sub={waist ? 'Goal under 0.50' : `Start ${bmi(profile.startWeightKg, profile.heightCm).toFixed(1)}`}
        />
      </div>

      <Card>
        <SectionTitle icon={LineChart}>Projected vs actual</SectionTitle>
        <div className="mb-3">
          <Segmented
            label="Chart range"
            value={range}
            onChange={setRange}
            options={[
              { value: 'zoom', label: 'Close-up' },
              { value: 'block', label: `${profile.planWeeks} weeks` },
              { value: 'goal', label: `To ${profile.goalWeightKg} kg` },
            ]}
          />
        </div>
        <WeightChart points={points} weighIns={state.weighIns} startDate={profile.startDate} goalKg={profile.goalWeightKg} fromWeek={fromWeek} toWeek={toWeek} today={today} />
        <ChartLegend />
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Week {profile.planWeeks}</div>
            <div className="font-bold tabular-nums text-cyan-300">{atWeekEnd.scaleKg.toFixed(1)} kg projected</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{profile.goalWeightKg} kg ETA</div>
            <div className="font-bold tabular-nums text-emerald-300">{crossing ? `Week ${crossing.week}` : 'Beyond 2 years'}</div>
          </div>
        </div>
        <p className="mt-2 text-xs leading-snug text-slate-400">
          {eta
            ? <>Your last 3 weeks: <b className="text-slate-200">−{eta.lossPerWeek.toFixed(2)} kg/week</b>, which puts {profile.goalWeightKg} kg at about <b className="text-slate-200">week {eta.etaWeek}</b>.</>
            : 'From week 5 the app compares this curve with your real trend and can recalibrate it.'}
          {' '}Keeping muscle means nearly every kilo lost is fat, and fat holds about 9,400 kcal per kg, so the scale moves slower than the "7,700 kcal per kg" rule says.
        </p>
        <Button variant="ghost" className="mt-1 w-full" onClick={() => go('simulator')}>
          Open the simulator <ChevronRight className="size-4" aria-hidden />
        </Button>
      </Card>

      <CompositionGauge profile={profile} crossing={crossing} />
    </div>
  )
}
