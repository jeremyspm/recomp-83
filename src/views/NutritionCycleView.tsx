import {
  BookOpen, CalendarClock, CalendarHeart, Check, Clock, Droplets, Flame, Info, ListChecks, Pencil, Sparkles, Utensils,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button, Card, Chip, Disclosure, ProgressBar, SectionTitle, Segmented, Stepper, Toggle } from '../components/ui.tsx'
import { addDays, fmtDay, weekdayOf } from '../lib/dates.ts'
import {
  currentWeight, dayTypeFor, isRefeedWeek, nextRefeedWeek, phase2Since, projectionFor, protocolDay, todaysTargets,
} from '../lib/model.ts'
import { checklistFor, kcalOf, mealPlan, type Macros } from '../lib/nutrition.ts'
import { goalCrossing, REFEED_KCAL } from '../lib/physiology.ts'
import type { NutritionMode } from '../lib/types.ts'
import { useToday } from '../state/clock.ts'
import { useStore } from '../state/store.ts'

const MACRO_ROWS: { key: keyof Macros; label: string; bar: 'emerald' | 'amber' | 'cyan'; chips: number[] }[] = [
  { key: 'p', label: 'Protein', bar: 'emerald', chips: [10, 25, 40] },
  { key: 'c', label: 'Carbs', bar: 'cyan', chips: [10, 25, 45] },
  { key: 'f', label: 'Fat', bar: 'amber', chips: [5, 10, 15] },
]

function CheckRow({ label, detail, why, checked, onToggle }: { label: string; detail: string; why: string; checked: boolean; onToggle: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <li className={`rounded-xl border ${checked ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-slate-800 bg-slate-950/50'}`}>
      <div className="flex items-center gap-2 pr-1">
        <button type="button" onClick={onToggle} aria-pressed={checked} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left">
          <span className={`grid size-7 shrink-0 place-items-center rounded-lg border-2 ${checked ? 'border-emerald-400 bg-emerald-500 text-slate-950' : 'border-slate-600'}`}>
            {checked && <Check className="size-4" strokeWidth={3} aria-hidden />}
          </span>
          <span className="min-w-0">
            <span className={`block text-sm font-semibold ${checked ? 'text-emerald-100' : 'text-slate-100'}`}>{label}</span>
            <span className="block text-xs text-slate-400">{detail}</span>
          </span>
        </button>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="grid size-10 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-300" aria-label={`Why: ${label}`}>
          <Info className="size-4" aria-hidden />
        </button>
      </div>
      {open && <p className="border-t border-slate-800 px-3 py-2 text-xs leading-snug text-slate-400">{why}</p>}
    </li>
  )
}

export function NutritionCycleView() {
  const { state, actions } = useStore()
  const today = useToday()
  const { settings, profile } = state
  const [editing, setEditing] = useState(false)
  const { week, day } = protocolDay(state, today)
  const t = todaysTargets(state, today)
  const logged = state.macros[today]
  const loggedKcal = logged ? kcalOf(logged) : 0
  const feeds = mealPlan(t.macros, t.dayType, settings.firstMealTime, settings.workoutTime)
  const checks = checklistFor(settings, t.dayType, t.macros)
  const ticked = state.checks[today] ?? []
  const refeedNow = isRefeedWeek(week)
  const nextRefeed = nextRefeedWeek(week)
  const trendKg = currentWeight(state, today)
  const since = phase2Since(state)
  const scheduleType = settings.liftDays.includes(weekdayOf(today)) ? 'lift' : 'rest'

  // Live trade-off numbers for the mode picker.
  const outlook = useMemo(() => {
    const at = (mode: NutritionMode) => {
      const pts = projectionFor(profile, settings, { mode, leanProtection: null, calibration: settings.calibration })
      return { w: pts[Math.min(profile.planWeeks, pts.length - 1)].scaleKg, eta: goalCrossing(pts, profile.goalWeightKg)?.week ?? null }
    }
    return { strict: at('strict'), recomp: at('recomp') }
  }, [profile, settings])

  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, -(i + 1)))

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle icon={Utensils}>Nutrition protocol</SectionTitle>
        <Segmented
          label="Nutrition mode"
          value={settings.mode}
          onChange={(mode) => actions.updateSettings({ mode })}
          options={[
            { value: 'strict', label: 'Strict 1,200', sub: 'Client plan · default' },
            { value: 'recomp', label: 'Recomp 2-phase', sub: '★ Recommended' },
          ]}
        />
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          {(['strict', 'recomp'] as const).map((m) => (
            <div key={m} className={`rounded-xl border px-3 py-2 ${settings.mode === m ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-800'}`}>
              <div className="font-semibold text-slate-300">{m === 'strict' ? 'Faster scale' : 'More muscle kept'}</div>
              <div className="tabular-nums text-slate-400">Wk {profile.planWeeks}: <b className="text-slate-200">{outlook[m].w.toFixed(1)} kg</b></div>
              <div className="tabular-nums text-slate-400">{profile.goalWeightKg} kg: <b className="text-slate-200">{outlook[m].eta ? `wk ${outlook[m].eta}` : '> 2 yrs'}</b></div>
            </div>
          ))}
        </div>
        {settings.mode === 'strict' ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-slate-300">
              Lifting days <b className="tabular-nums">1,195 kcal</b> (120 P / 100 C / 35 F), carbs around the session. Rest days <b className="tabular-nums">1,190 kcal</b> (120 P / 65 C / 50 F), with fat boluses for the gallbladder.
            </p>
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              <Toggle
                checked={settings.proteinPlus}
                onChange={(proteinPlus) => actions.updateSettings({ proteinPlus })}
                label={<span className="flex items-center gap-1.5">Protein+ swap <Chip tone="emerald">Recommended</Chip></span>}
                description="140 g protein, 20 g fewer carbs, same calories. 120 g (1.8 g/kg of FFM) is the low end for a deficit this size."
              />
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            <p>
              <b>Phase 1:</b> ~1,500 kcal (170 P / 110 C / 42 F) until the 7-day average reaches <b className="tabular-nums">{settings.phase2SwitchKg} kg</b>. <b>Phase 2:</b> ~1,800 kcal (180 P / 160 C / 48 F) down to {profile.goalWeightKg} kg.
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <ProgressBar value={profile.startWeightKg - trendKg} max={profile.startWeightKg - settings.phase2SwitchKg} tone="emerald" label="Progress to Phase 2" />
              </div>
              <Chip tone={t.phase === 2 ? 'emerald' : 'cyan'}>Phase {t.phase}</Chip>
            </div>
            <p className="text-xs text-slate-500">
              {since ? `Phase 2 since ${fmtDay(since)}.` : `${Math.max(0, trendKg - settings.phase2SwitchKg).toFixed(1)} kg to go (7-day average).`} A smaller deficit keeps more muscle and makes training easier, but it gets to {profile.goalWeightKg} kg much later. Change the switch weight in Settings.
            </p>
          </div>
        )}
      </Card>

      {refeedNow ? (
        <Card tone="amber">
          <SectionTitle icon={CalendarHeart}>Week {week}: diet break</SectionTitle>
          <p className="text-sm text-slate-200">
            48-hour refeed on any 2 days in a row this week, ideally ending on a lifting day: <b className="tabular-nums">{REFEED_KCAL.toLocaleString()} kcal · {t.refeed.p} P / {t.refeed.c} C / {t.refeed.f} F</b>.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-300">
            <li>The scale will jump 1–2 kg (glycogen + water) and settle within 2–4 days. That isn't fat.</li>
            <li>It refills glycogen for better sessions and gives you a mental break. The "leptin/thyroid reset" effect is small and brief (Campbell 2020).</li>
            <li>If you're struggling badly, a full 1–2 week break at maintenance has better evidence (MATADOR, Byrne 2018).</li>
          </ul>
        </Card>
      ) : (
        nextRefeed && (
          <p className="flex items-center gap-2 px-1 text-xs text-slate-400">
            <CalendarClock className="size-4 text-amber-400" aria-hidden />
            Next diet break: week {nextRefeed} (starts in {7 * (nextRefeed - 1) - day} days), a 48-hour refeed at {REFEED_KCAL.toLocaleString()} kcal.
          </p>
        )
      )}

      <Card>
        <SectionTitle
          icon={Flame}
          right={
            <div className="flex items-center gap-1.5">
              <Chip tone={t.dayType === 'lift' ? 'emerald' : 'slate'}>{t.dayType === 'lift' ? 'Lifting day' : 'Rest day'}</Chip>
            </div>
          }
        >
          Today's targets
        </SectionTitle>
        <div className="mb-3 flex items-center justify-between gap-2 text-xs text-slate-400">
          <span>{state.dayTypes[today] ? 'Set by hand today.' : t.dayType !== scheduleType ? 'Lifting day: you trained today.' : 'From your lifting-day schedule.'}</span>
          <button
            type="button"
            onClick={() => actions.setDayType(today, state.dayTypes[today] ? null : t.dayType === 'lift' ? 'rest' : 'lift')}
            className="h-9 rounded-lg border border-slate-700 px-2.5 font-semibold text-slate-200 hover:bg-slate-800"
          >
            {state.dayTypes[today] ? 'Back to schedule' : `Make it a ${t.dayType === 'lift' ? 'rest' : 'lifting'} day`}
          </button>
        </div>

        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-3xl font-black tabular-nums text-slate-50">{loggedKcal.toLocaleString()}</span>
          <span className="text-sm tabular-nums text-slate-400">of {t.kcal.toLocaleString()} kcal</span>
        </div>
        <div className="space-y-3">
          {MACRO_ROWS.map((row) => {
            const target = t.macros[row.key]
            const val = logged?.[row.key] ?? 0
            return (
              <div key={row.key}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-semibold text-slate-200">{row.label}</span>
                  <span className="tabular-nums text-slate-400"><b className="text-slate-100">{val}</b> / {target} g</span>
                </div>
                <ProgressBar value={val} max={target} tone={val > target * 1.1 && row.key !== 'p' ? 'rose' : row.bar} label={`${row.label} logged`} />
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                  {row.chips.map((n) => (
                    <button key={n} type="button" onClick={() => actions.addMacros(today, { [row.key]: n })} className="h-10 rounded-lg border border-slate-700 bg-slate-800/70 text-sm font-semibold tabular-nums text-slate-200 active:scale-95">
                      +{n} g
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-2">
          <Button variant="primary" onClick={() => actions.setMacros(today, { ...t.macros })}>
            <Check className="size-4" aria-hidden /> Ate the plan
          </Button>
          <Button onClick={() => setEditing((e) => !e)} aria-expanded={editing}><Pencil className="size-4" aria-hidden />Exact</Button>
          <Button variant="ghost" disabled={!logged} onClick={() => actions.setMacros(today, null)}>Clear</Button>
        </div>
        {editing && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {MACRO_ROWS.map((row) => (
              <div key={row.key}>
                <span className="mb-1 block text-xs font-semibold text-slate-400">{row.label} (g)</span>
                <Stepper
                  value={logged?.[row.key] ?? 0}
                  onChange={(v) => actions.setMacros(today, { ...(logged ?? { p: 0, c: 0, f: 0 }), [row.key]: Math.max(0, Math.round(v ?? 0)) })}
                  step={5}
                  min={0}
                  max={1000}
                  label={`${row.label} grams`}
                />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle icon={Clock}>Meal timing</SectionTitle>
        <ol className="relative space-y-3 border-l border-slate-800 pl-4">
          {feeds.map((f) => (
            <li key={f.id} className="relative">
              <span className={`absolute -left-[1.4rem] top-1 size-3 rounded-full border-2 ${f.id === 'pre' ? 'border-cyan-400 bg-cyan-400/30' : f.bolus ? 'border-amber-400 bg-amber-400/30' : 'border-slate-500 bg-slate-900'}`} aria-hidden />
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <span className="text-sm font-semibold text-slate-100">{f.title}</span>
                <span className="text-xs font-semibold tabular-nums text-slate-400">{f.clock}</span>
              </div>
              <div className="text-sm tabular-nums text-slate-300">
                {f.macros.p > 0 && <span className="mr-2 text-emerald-300">{f.macros.p} P</span>}
                <span className="mr-2 text-cyan-300">{f.macros.c} C</span>
                <span className="mr-2 text-amber-300">{f.macros.f} F</span>
                <span className="text-slate-500">≈ {kcalOf(f.macros)} kcal</span>
              </div>
              {(f.bolus || f.notes.length > 0) && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {f.bolus && <Chip tone="amber">Fat bolus ≥ 15 g</Chip>}
                  {f.notes.map((n) => <Chip key={n} tone={f.id === 'pre' ? 'cyan' : 'slate'}>{f.id === 'pre' && n.includes('sodium') ? <Droplets className="size-3" aria-hidden /> : null}{n}</Chip>)}
                </div>
              )}
            </li>
          ))}
        </ol>
      </Card>

      <Card>
        <SectionTitle icon={ListChecks} right={<span className="text-sm font-bold tabular-nums text-slate-300">{checks.filter((c) => ticked.includes(c.id)).length}/{checks.length}</span>}>
          Daily actions
        </SectionTitle>
        <ul className="space-y-2">
          {checks.map((c) => (
            <CheckRow key={c.id} label={c.label} detail={c.detail} why={c.why} checked={ticked.includes(c.id)} onToggle={() => actions.toggleCheck(today, c.id)} />
          ))}
        </ul>
      </Card>

      <Card>
        <SectionTitle icon={Sparkles}>Last 7 days</SectionTitle>
        <ul className="divide-y divide-slate-800 text-sm">
          {last7.map((d) => {
            const m = state.macros[d]
            const target = todaysTargets(state, d)
            const kcal = m ? kcalOf(m) : null
            const off = kcal === null ? null : kcal - target.kcal
            const ok = m && Math.abs(off ?? 0) <= 100 && m.p >= target.macros.p - 10
            return (
              <li key={d} className="flex items-center gap-2 py-1.5">
                <span className={`size-2.5 shrink-0 rounded-full ${m ? (ok ? 'bg-emerald-400' : 'bg-amber-400') : 'bg-slate-700'}`} aria-hidden />
                <span className="w-24 shrink-0 text-xs text-slate-400">{fmtDay(d)}</span>
                <span className="text-xs text-slate-500">{dayTypeFor(state, d) === 'lift' ? 'Lift' : 'Rest'}</span>
                <span className="flex-1 text-right tabular-nums text-slate-200">
                  {m ? <>{kcal?.toLocaleString()} kcal · {m.p} P</> : <span className="text-slate-600">not logged</span>}
                </span>
              </li>
            )
          })}
        </ul>
      </Card>

      <Disclosure title="Why these numbers" icon={BookOpen}>
        <ul className="list-disc space-y-1.5 pl-4 text-xs leading-snug text-slate-400">
          <li><b className="text-slate-200">1,200 kcal is aggressive for a man</b> (the guideline starting range is 1,500–1,800). It's fine with a GP involved, but don't go lower to speed things up.</li>
          <li><b className="text-slate-200">Protein holds muscle.</b> Higher protein in a deep deficit kept or even added lean mass (Longland 2016). Mode 2's 170–180 g is about 2.5 g/kg of FFM.</li>
          <li><b className="text-slate-200">Every day has a ≥ 15 g fat meal.</b> The gallbladder needs it to empty properly during fast weight loss (Festi 1998; Stokes 2014).</li>
          <li><b className="text-slate-200">Carbs sit around training</b> to fuel two hard sets per machine. The light-headedness people feel on low carbs is mostly lost sodium and water, which the pre-workout salt and water fix.</li>
          <li><b className="text-slate-200">The 12:00 window</b> is about adherence. Eating the same food in a shorter window burns no extra fat (Liu 2022), so hit protein inside it.</li>
        </ul>
      </Disclosure>
    </div>
  )
}
