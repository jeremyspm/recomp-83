import { BookOpen, Calculator, FlaskConical, Gauge, Layers, SlidersHorizontal, Table2 } from 'lucide-react'
import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button, Card, Chip, Disclosure, SectionTitle, Toggle } from '../components/ui.tsx'
import { fmtDay } from '../lib/dates.ts'
import {
  currentWeight, effectiveLeanProtection, modelCheck, projectionFor, protocolDay, weeklyPlanKcal, type PlanOverrides,
} from '../lib/model.ts'
import { planLeanProtection, planName } from '../lib/nutrition.ts'
import {
  RHO_FAT, RHO_LEAN, energyDensity, expenditureAt, ffmi, forbesLeanShare, goalCrossing, mifflinStJeor,
} from '../lib/physiology.ts'
import { useToday } from '../state/clock.ts'
import { useStore } from '../state/store.ts'

const r0 = (x: number) => Math.round(x).toLocaleString()
const f1 = (x: number) => x.toFixed(1)

const COMPARE: { label: string; o: PlanOverrides }[] = [
  { label: 'Strict 1,200', o: { mode: 'strict', proteinPlus: false } },
  { label: 'Strict + Protein+', o: { mode: 'strict', proteinPlus: true } },
  { label: 'Recomp 2-phase', o: { mode: 'recomp' } },
]

function Line({ label, value, note, strong = false }: { label: string; value: string; note?: string; strong?: boolean }) {
  return (
    <div className={`flex items-baseline gap-2 py-1 ${strong ? 'border-t border-slate-700 pt-2 font-bold text-slate-50' : 'text-slate-300'}`}>
      <span className="min-w-0 flex-1">
        {label}
        {note && <span className="block text-[11px] font-normal text-slate-500">{note}</span>}
      </span>
      <span className="shrink-0 font-mono tabular-nums">{value}</span>
    </div>
  )
}

export function RecompSimulatorView() {
  const { state, actions } = useStore()
  const today = useToday()
  const { profile, settings } = state
  const points = useMemo(() => projectionFor(profile, settings), [profile, settings])
  const crossing = goalCrossing(points, profile.goalWeightKg)
  const { week } = protocolDay(state, today)
  const wk = Math.max(0, week)
  const kg = currentWeight(state, today)
  const e = expenditureAt(kg, wk, profile, settings.adaptivePct, settings.calibration ?? 1)
  const intake = weeklyPlanKcal(state, today)
  const deficit = e.expenditure - intake
  const fatNow = points[Math.min(wk, points.length - 1)].fatKg
  const protection = effectiveLeanProtection(settings)
  const share = forbesLeanShare(fatNow) * (1 - protection)
  const density = energyDensity(share)
  const check = modelCheck(state, today, points)

  const compare = useMemo(() => COMPARE.map(({ label, o }) => {
    const pts = projectionFor(profile, settings, { ...o, leanProtection: null })
    return { label, o, w26: pts[Math.min(profile.planWeeks, pts.length - 1)], cross: goalCrossing(pts, profile.goalWeightKg), protection: planLeanProtection({ mode: o.mode ?? 'strict', proteinPlus: o.proteinPlus ?? false }) }
  }), [profile, settings])

  const crash = useMemo(() => {
    const pts = projectionFor(profile, settings, { leanProtection: 0 })
    return goalCrossing(pts, profile.goalWeightKg)
  }, [profile, settings])

  const bars = useMemo(() => {
    const picks = [0, 8, 16, profile.planWeeks]
    const rows = picks.map((w) => {
      const p = points[Math.min(w, points.length - 1)]
      return { name: w === 0 ? 'Day 1' : `Wk ${w}`, FFM: +f1(p.ffmKg), Fat: +f1(p.fatKg) }
    })
    if (crossing) rows.push({ name: `${profile.goalWeightKg} kg`, FFM: +f1(crossing.ffmKg), Fat: +f1(crossing.fatKg) })
    return rows
  }, [points, crossing, profile.planWeeks, profile.goalWeightKg])

  const isCurrent = (o: PlanOverrides) => o.mode === settings.mode && (o.mode === 'recomp' || o.proteinPlus === settings.proteinPlus)

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle icon={Calculator} right={<Chip tone="cyan">Week {wk}</Chip>}>Engine readout: this week</SectionTitle>
        <div className="text-sm">
          <Line label="Weight (7-day trend)" value={`${f1(kg)} kg`} />
          <Line label="BMR, Mifflin-St Jeor" note={`10×${f1(kg)} + 6.25×${profile.heightCm} − 5×${profile.age} ${profile.sex === 'male' ? '+ 5' : '− 161'}`} value={r0(mifflinStJeor(kg, profile))} />
          <Line label={`× activity ${profile.activity}${settings.calibration ? ` × calibration ${settings.calibration.toFixed(2)}` : ''}`} value={r0(e.tdee)} />
          <Line label={`− adaptive dampening ${f1((e.adaptive / e.tdee) * 100)}%`} note={`Phases in to ${settings.adaptivePct}% by week 4: metabolism, NEAT, TEF`} value={`−${r0(e.adaptive)}`} />
          <Line label="= Expected burn" value={`${r0(e.expenditure)} kcal`} strong />
          <Line label={`− Plan intake (${planName(settings, points[Math.min(wk, points.length - 1)].phase)}, weekly avg)`} value={`−${r0(intake)}`} />
          <Line label="= Daily deficit" value={`${r0(deficit)} kcal`} strong />
          <Line label="Energy density of what you lose" note={`${f1(share * 100)}% lean (Forbes ${f1(forbesLeanShare(fatNow) * 100)}% × ${Math.round((1 - protection) * 100)}% unprotected)`} value={`${r0(density)} kcal/kg`} />
          <Line label="= Expected tissue loss" value={`${f1((deficit * 7) / density)} kg/wk`} strong />
        </div>
      </Card>

      <Card>
        <SectionTitle icon={Gauge}>Plan comparison</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-1.5 pr-2 font-semibold">Plan</th>
                <th className="whitespace-nowrap py-1.5 pr-2 text-right font-semibold">Wk {profile.planWeeks}</th>
                <th className="whitespace-nowrap py-1.5 pr-2 text-right font-semibold">{profile.goalWeightKg} kg</th>
                <th className="whitespace-nowrap py-1.5 text-right font-semibold">BF %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 tabular-nums">
              {compare.map((c) => (
                <tr key={c.label} className={isCurrent(c.o) ? 'text-emerald-200' : 'text-slate-300'}>
                  <td className="py-2 pr-2 font-semibold">{c.label}<span className="block text-[11px] font-normal text-slate-500">{Math.round(c.protection * 100)}% lean protection</span></td>
                  <td className="py-2 pr-2 text-right">{f1(c.w26.scaleKg)}</td>
                  <td className="whitespace-nowrap py-2 pr-2 text-right">{c.cross ? `wk ${c.cross.week}` : '> 2 yr'}</td>
                  <td className="py-2 text-right">{c.cross ? f1(c.cross.bfPct) : '—'}</td>
                </tr>
              ))}
              <tr className="text-rose-300/90">
                <td className="py-2 pr-2 font-semibold">No lifting, low protein<span className="block text-[11px] font-normal text-slate-500">Forbes partition, 0% protection</span></td>
                <td className="py-2 pr-2 text-right">—</td>
                <td className="whitespace-nowrap py-2 pr-2 text-right">{crash ? `wk ${crash.week}` : '—'}</td>
                <td className="py-2 text-right">{crash ? f1(crash.bfPct) : '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs leading-snug text-slate-400">
          The crash path hits the scale target sooner because it burns muscle, which holds only ~{r0(RHO_LEAN)} kcal/kg against ~{r0(RHO_FAT)} for fat. Same weight, much worse body.
        </p>
      </Card>

      <Card>
        <SectionTitle icon={Layers}>Body composition over time</SectionTitle>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#1e293b' }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={42} />
              <Tooltip
                cursor={{ fill: '#1e293b66' }}
                contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: '#e2e8f0', fontWeight: 600 }}
                formatter={(v) => [`${v} kg`]}
              />
              <Bar dataKey="FFM" stackId="a" fill="#10b981" isAnimationActive={false} />
              <Bar dataKey="Fat" stackId="a" fill="#fbbf24" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {crossing && (
          <p className="mt-2 text-xs leading-snug text-slate-400">
            At {profile.goalWeightKg} kg (week {crossing.week}): <b className="text-emerald-300">{f1(crossing.ffmKg)} kg FFM</b> · <b className="text-amber-300">{f1(crossing.fatKg)} kg fat</b> · {f1(crossing.bfPct)}% BF · FFMI {f1(ffmi(crossing.ffmKg, profile.heightCm))}.
            {crash && <> The crash path would keep {f1(crash.ffmKg)} kg FFM.</>}
          </p>
        )}
      </Card>

      <Card>
        <SectionTitle icon={SlidersHorizontal}>Assumptions</SectionTitle>
        <div className="space-y-5">
          <label className="block">
            <span className="flex items-baseline justify-between text-sm font-semibold text-slate-200">
              Lean protection
              <span className="font-mono tabular-nums text-emerald-300">{Math.round(protection * 100)}%{settings.leanProtection === null ? ' (plan default)' : ''}</span>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(protection * 100)}
              onChange={(ev) => actions.updateSettings({ leanProtection: Number(ev.target.value) / 100 })}
              className="mt-2 w-full"
              aria-describedby="lp-help"
            />
            <span id="lp-help" className="mt-1 block text-xs text-slate-400">
              How much of the normal lean loss lifting and protein prevent. 0% = untrained crash diet. The app uses 60% for Strict, 65% with Protein+ and 70% for Recomp. The best-case 83 kg body needs about 90%.
            </span>
          </label>
          <label className="block">
            <span className="flex items-baseline justify-between text-sm font-semibold text-slate-200">
              Adaptive dampening
              <span className="font-mono tabular-nums text-cyan-300">{settings.adaptivePct}%</span>
            </span>
            <input type="range" min={0} max={15} step={1} value={settings.adaptivePct} onChange={(ev) => actions.updateSettings({ adaptivePct: Number(ev.target.value) })} className="mt-2 w-full" />
            <span className="mt-1 block text-xs text-slate-400">After weight loss people burn 10–15% less than their new size predicts (Rosenbaum & Leibel 2010). 10% phases in over weeks 1–4.</span>
          </label>
          <Toggle
            checked={settings.creatine}
            onChange={(creatine) => actions.updateSettings({ creatine })}
            label="Creatine water (+1.0 kg over weeks 1–4)"
            description="Keeps the projection honest about the scale while the muscles saturate."
          />
          <Button variant="ghost" className="w-full" onClick={() => actions.updateSettings({ leanProtection: null, adaptivePct: 10, creatine: true })}>
            Reset to plan defaults
          </Button>
        </div>
      </Card>

      <Card tone={check ? 'cyan' : 'slate'}>
        <SectionTitle icon={FlaskConical} right={settings.calibration ? <Chip tone="cyan">×{settings.calibration.toFixed(2)} on</Chip> : null}>
          Model check: your real burn
        </SectionTitle>
        {check ? (
          <div className="space-y-2 text-sm">
            <p className="text-slate-300">
              Since {fmtDay(check.windowFrom)} ({check.weighIns} weigh-ins, {check.loggedDays} logged days): eating <b className="tabular-nums">{r0(check.avgIntake)}</b> kcal and losing <b className="tabular-nums">{check.lossPerWeek.toFixed(2)} kg/wk</b>.
            </p>
            <div className="grid grid-cols-2 gap-2 tabular-nums">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                <div className="text-[11px] uppercase tracking-wider text-slate-500">Your data says</div>
                <div className="text-lg font-bold text-cyan-300">{r0(check.observed)} kcal</div>
                <div className="text-[11px] text-slate-500">± {r0(check.uncertainty)}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                <div className="text-[11px] uppercase tracking-wider text-slate-500">Equation says</div>
                <div className="text-lg font-bold text-slate-200">{r0(check.modelled)} kcal</div>
                <div className="text-[11px] text-slate-500">Mifflin × {profile.activity}, −{settings.adaptivePct}%</div>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              {check.meaningful
                ? <>The gap is bigger than the scale noise (ratio {check.ratio.toFixed(2)}{check.ratio !== check.suggested ? `, capped at ${check.suggested.toFixed(2)}` : ''}), so your real burn differs from the equation.</>
                : <>The gap is within the scale noise, so your data agrees with the equation and there's nothing to calibrate yet. It gets sharper every week.</>}
              {' '}This only works if the logs are honest: unlogged snacks make your burn look lower.
            </p>
            {settings.calibration ? (
              <Button className="w-full" onClick={() => actions.updateSettings({ calibration: null })}>Remove calibration</Button>
            ) : (
              check.meaningful && (
                <Button variant="primary" className="w-full" onClick={() => actions.updateSettings({ calibration: +check.suggested.toFixed(3) })}>Calibrate projection ×{check.suggested.toFixed(2)}</Button>
              )
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            Unlocks around week 5. It needs about 3 weeks of weigh-ins after the water flush (from Day 15; 12+ weigh-ins) and 14+ logged days, because a shorter slope is mostly scale noise. Then it compares the population equation with your measured burn, which can differ by ±10–15%.
            {settings.calibration && <Button className="mt-2 w-full" onClick={() => actions.updateSettings({ calibration: null })}>Remove calibration ×{settings.calibration.toFixed(2)}</Button>}
          </p>
        )}
      </Card>

      <Disclosure title="Week-by-week projection" icon={Table2}>
        <div className="-mx-3 overflow-x-auto">
          <table className="w-full min-w-[30rem] text-right text-xs tabular-nums">
            <thead className="text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                {['Wk', 'kg', 'Fat', 'FFM', 'BF%', 'Burn', 'Intake', 'Deficit'].map((h) => <th key={h} className="px-1.5 py-1 font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {points.slice(0, Math.max(profile.planWeeks, crossing?.week ?? 0) + 1).map((p) => (
                <tr key={p.week} className={p.refeed ? 'bg-amber-500/5 text-amber-200' : p.week === wk ? 'bg-cyan-500/10 text-cyan-100' : ''}>
                  <td className="px-1.5 py-1">{p.week}{p.refeed ? '*' : ''}</td>
                  <td className="px-1.5 py-1 font-semibold">{f1(p.scaleKg)}</td>
                  <td className="px-1.5 py-1">{f1(p.fatKg)}</td>
                  <td className="px-1.5 py-1">{f1(p.ffmKg)}</td>
                  <td className="px-1.5 py-1">{f1(p.bfPct)}</td>
                  <td className="px-1.5 py-1">{r0(p.expenditure)}</td>
                  <td className="px-1.5 py-1">{r0(p.intake)}</td>
                  <td className="px-1.5 py-1">{r0(p.deficit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">* refeed week. Each row shows the end of that week. FFM is what a scan would read (scale − fat), including water shifts.</p>
      </Disclosure>

      <Disclosure title="Method and sources" icon={BookOpen}>
        <ul className="list-disc space-y-1.5 pl-4 text-xs leading-snug text-slate-400">
          <li>BMR: Mifflin-St Jeor (1990), the most accurate equation in obese adults (Frankenfield 2005). It is recomputed every week from the projected weight.</li>
          <li>Partition: the Forbes curve, lean share = 10.4 ÷ (10.4 + fat kg) (Forbes 2000; Hall 2007), reduced by lean protection. RT plus protein typically halves or removes diet-induced FFM loss (Weinheimer 2010; Cava 2017; Bryner 1999).</li>
          <li>Energy density: fat 9,440 kcal/kg and lean 1,816 kcal/kg (Hall 2008). The 7,700 kcal/kg rule assumes about 25% of the loss is lean.</li>
          <li>Water: −2.2 kg glycogen flush in weeks 1–2; +1.0 kg creatine water over weeks 1–4 (Kreider 2017). Refeeds in weeks 7, 14 and 21 are 2 days at 2,200 kcal.</li>
          <li>The full audit with every reference is in PLAN.md in the project folder.</li>
        </ul>
      </Disclosure>
    </div>
  )
}
