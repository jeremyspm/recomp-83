import { Check, Ruler, Scale, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { fmtDay } from '../lib/dates.ts'
import { useToday } from '../state/clock.ts'
import { useStore } from '../state/store.ts'
import { Button, Card, Disclosure, SectionTitle, Stepper } from './ui.tsx'

export function WeighInCard() {
  const { state } = useStore()
  const today = useToday()
  const todays = state.weighIns.find((w) => w.date === today)
  // Remount the form when today's entry changes, so it always starts from saved values.
  return <WeighInForm key={`${today}-${todays?.kg}-${todays?.waistCm}-${todays?.bfPct}`} />
}

function WeighInForm() {
  const { state, actions } = useStore()
  const today = useToday()
  const todays = state.weighIns.find((w) => w.date === today)
  const last = state.weighIns.at(-1)
  const lastWaist = [...state.weighIns].reverse().find((w) => w.waistCm)?.waistCm ?? null
  const [kg, setKg] = useState<number | null>(todays?.kg ?? last?.kg ?? state.profile.startWeightKg)
  const [waist, setWaist] = useState<number | null>(todays?.waistCm ?? null)
  const [bf, setBf] = useState<number | null>(todays?.bfPct ?? null)
  const recent = [...state.weighIns].reverse().slice(0, 5)

  const save = () => {
    if (kg === null) return
    actions.logWeighIn({
      date: today,
      kg: Math.round(kg * 10) / 10,
      ...(waist ? { waistCm: waist } : {}),
      ...(bf ? { bfPct: bf } : {}),
    })
  }

  return (
    <Card>
      <SectionTitle icon={Scale} right={todays && <span className="flex items-center gap-1 text-xs font-semibold text-emerald-300"><Check className="size-3.5" aria-hidden />Logged today</span>}>
        Morning weigh-in
      </SectionTitle>
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <Stepper value={kg} onChange={setKg} step={0.1} min={30} max={350} label="Body weight" unit="kg" decimal />
        </div>
        <Button variant="primary" className="min-h-12 px-5" disabled={kg === null} onClick={save}>
          {todays ? 'Update' : 'Log'}
        </Button>
      </div>
      <p className="mt-2 text-xs text-slate-500">Weigh after the toilet, before food or drink, in the same clothes. Trust the 7-day trend, not any single day.</p>
      <div className="mt-3">
        <Disclosure title="Measurements (optional)" icon={Ruler}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="mb-1 block text-xs font-semibold text-slate-400">Waist at navel (cm)</span>
              <Stepper value={waist} onChange={setWaist} step={0.5} min={40} max={250} label="Waist" placeholder={lastWaist ? String(lastWaist) : '—'} decimal />
            </div>
            <div>
              <span className="mb-1 block text-xs font-semibold text-slate-400">Scan body fat (%)</span>
              <Stepper value={bf} onChange={setBf} step={0.5} min={3} max={70} label="Body fat" placeholder="—" decimal />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">Waist once a week is the best non-scale marker while creatine and refeeds shift water around. Aim for a waist under half your height.</p>
        </Disclosure>
      </div>
      {recent.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-800 text-sm">
          {recent.map((w) => (
            <li key={w.date} className="flex items-center gap-2 py-1.5">
              <span className="w-24 shrink-0 text-xs text-slate-400">{fmtDay(w.date)}</span>
              <span className="flex-1 font-semibold tabular-nums">
                {w.kg.toFixed(1)} kg
                {w.waistCm ? <span className="ml-2 text-xs font-normal text-slate-400">waist {w.waistCm} cm</span> : null}
                {w.bfPct ? <span className="ml-2 text-xs font-normal text-slate-400">{w.bfPct}% BF</span> : null}
              </span>
              <button
                type="button"
                onClick={() => actions.deleteWeighIn(w.date)}
                className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-800 hover:text-rose-300"
                aria-label={`Delete weigh-in from ${fmtDay(w.date)}`}
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
