import { Download, FlaskConical, RotateCcw, ShieldAlert, Upload } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { downloadBackup } from '../lib/backup.ts'
import { WEEKDAYS, isISODate } from '../lib/dates.ts'
import { bmi, ffmi, pctOf } from '../lib/physiology.ts'
import { parseBackup } from '../lib/storage.ts'
import type { AppState, Profile, Settings } from '../lib/types.ts'
import { useToday } from '../state/clock.ts'
import { useStore } from '../state/store.ts'
import { ConfirmDialog } from './ConfirmDialog.tsx'
import { Modal } from './Modal.tsx'
import { Button, Toggle } from './ui.tsx'

const ACTIVITY = [
  { v: 1.2, label: '1.2: desk job, no training' },
  { v: 1.375, label: '1.375: lifting 3×/week' },
  { v: 1.55, label: '1.55: active job or 3–5 sessions' },
  { v: 1.725, label: '1.725: very active' },
]

function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-500">{hint}</span>}
    </label>
  )
}

const inputCls = 'h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-base tabular-nums text-slate-100 outline-none focus:border-cyan-400'

function NumberInput({ value, onChange, min, max, step = 'any' }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number | 'any' }) {
  const [text, setText] = useState(String(value))
  const n = Number(text)
  const bad = text.trim() === '' || Number.isNaN(n) || n < min || n > max
  return (
    <input
      type="number"
      inputMode="decimal"
      step={step}
      min={min}
      max={max}
      value={text}
      aria-invalid={bad}
      onChange={(e) => {
        setText(e.target.value)
        const v = Number(e.target.value)
        if (e.target.value.trim() !== '' && !Number.isNaN(v) && v >= min && v <= max) onChange(v)
      }}
      className={`${inputCls} ${bad ? 'border-rose-500' : ''}`}
    />
  )
}

export function SettingsModal({ open, onClose, onReset }: { open: boolean; onClose: () => void; onReset: () => void }) {
  const { state } = useStore()
  return (
    <Modal open={open} onClose={onClose} title="Settings, profile & backup">
      {open && <SettingsBody key={JSON.stringify([state.profile, state.settings])} onClose={onClose} onReset={onReset} />}
    </Modal>
  )
}

function SettingsBody({ onClose, onReset }: { onClose: () => void; onReset: () => void }) {
  const { state, actions } = useStore()
  const today = useToday()
  const [profile, setProfile] = useState<Profile>(state.profile)
  const [settings, setSettings] = useState<Settings>(state.settings)
  const [pending, setPending] = useState<AppState | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [demoOpen, setDemoOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const setP = (patch: Partial<Profile>) => setProfile((p) => ({ ...p, ...patch }))
  const setS = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }))
  const fat = profile.startWeightKg - profile.startFfmKg
  const valid = profile.startFfmKg < profile.startWeightKg - 2 && profile.goalWeightKg < profile.startWeightKg && isISODate(profile.startDate)
  const dirty = JSON.stringify([profile, settings]) !== JSON.stringify([state.profile, state.settings])

  const save = () => {
    actions.updateProfile(profile)
    actions.updateSettings(settings)
    onClose()
  }

  const onFile = async (file: File | undefined) => {
    setImportError(null)
    if (!file) return
    try {
      setPending(parseBackup(await file.text(), today))
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Could not read that file.')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Client profile</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name">
            <input value={profile.name} maxLength={40} onChange={(e) => setP({ name: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Age">
            <NumberInput value={profile.age} min={14} max={90} step={1} onChange={(age) => setP({ age })} />
          </Field>
          <Field label="Height (cm)">
            <NumberInput value={profile.heightCm} min={120} max={230} onChange={(heightCm) => setP({ heightCm })} />
          </Field>
          <Field label="Sex">
            <select value={profile.sex} onChange={(e) => setP({ sex: e.target.value === 'female' ? 'female' : 'male' })} className={inputCls}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </Field>
          <Field label="Start weight (kg)">
            <NumberInput value={profile.startWeightKg} min={40} max={300} onChange={(startWeightKg) => setP({ startWeightKg })} />
          </Field>
          <Field label="Start FFM (kg)" hint="From a DEXA/BIA scan if you have one.">
            <NumberInput value={profile.startFfmKg} min={20} max={250} onChange={(startFfmKg) => setP({ startFfmKg })} />
          </Field>
          <Field label="Goal weight (kg)">
            <NumberInput value={profile.goalWeightKg} min={35} max={250} onChange={(goalWeightKg) => setP({ goalWeightKg })} />
          </Field>
          <Field label="Block length">
            <select value={profile.planWeeks} onChange={(e) => setP({ planWeeks: Number(e.target.value) })} className={inputCls}>
              {[20, 21, 22, 23, 24, 25, 26].map((w) => <option key={w} value={w}>{w} weeks</option>)}
            </select>
          </Field>
          <Field label="Day 1">
            <input type="date" value={profile.startDate} onChange={(e) => setP({ startDate: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Activity multiplier">
            <select value={profile.activity} onChange={(e) => setP({ activity: Number(e.target.value) })} className={inputCls}>
              {ACTIVITY.map((a) => <option key={a.v} value={a.v}>{a.label}</option>)}
            </select>
          </Field>
        </div>
        <p className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs tabular-nums text-slate-300">
          BMI <b>{bmi(profile.startWeightKg, profile.heightCm).toFixed(1)}</b> · fat <b>{fat.toFixed(1)} kg</b> ({pctOf(fat, profile.startWeightKg).toFixed(1)}%) · FFMI <b>{ffmi(profile.startFfmKg, profile.heightCm).toFixed(1)}</b>
          {!valid && <span className="mt-1 block text-rose-300">FFM and goal must be below the start weight, and Day 1 must be a date.</span>}
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Plan</h3>
        <div>
          <span className="mb-1 block text-xs font-semibold text-slate-300">Lifting days</span>
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((d, i) => {
              const on = settings.liftDays.includes(i)
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setS({ liftDays: on ? settings.liftDays.filter((x) => x !== i) : [...settings.liftDays, i].sort() })}
                  className={`h-11 rounded-lg border text-xs font-bold ${on ? 'border-emerald-400 bg-emerald-500/15 text-emerald-200' : 'border-slate-700 bg-slate-950 text-slate-500'}`}
                >
                  {d}
                </button>
              )
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Eating window opens">
            <input type="time" value={settings.firstMealTime} onChange={(e) => e.target.value && setS({ firstMealTime: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Usual workout time">
            <input type="time" value={settings.workoutTime} onChange={(e) => e.target.value && setS({ workoutTime: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Daily step goal">
            <NumberInput value={settings.stepGoal} min={0} max={30000} step={500} onChange={(stepGoal) => setS({ stepGoal })} />
          </Field>
          <Field label="Mode 2 → Phase 2 at (kg)" hint="7-day average.">
            <NumberInput value={settings.phase2SwitchKg} min={40} max={300} onChange={(phase2SwitchKg) => setS({ phase2SwitchKg })} />
          </Field>
        </div>
        <Toggle
          checked={settings.creatine}
          onChange={(creatine) => setS({ creatine })}
          label="Taking creatine (5 g/day)"
          description="Adds about 1 kg of water to the projection over weeks 1–4, so the scale isn't misread."
        />
      </section>

      <section className="space-y-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Backup</h3>
        <p className="text-xs text-slate-400">Everything is stored in this browser only. Export now and then, and before clearing browser data or switching phones.</p>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => downloadBackup(state, today)}><Download className="size-4" aria-hidden />Export JSON</Button>
          <Button onClick={() => fileRef.current?.click()}><Upload className="size-4" aria-hidden />Import JSON</Button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
        {importError && <p className="text-xs text-rose-300">{importError}</p>}
      </section>

      <section className="space-y-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Data</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Button variant="secondary" onClick={() => setDemoOpen(true)}><FlaskConical className="size-4" aria-hidden />Load Week-1 demo</Button>
          <Button variant="amber" onClick={() => { onClose(); onReset() }}><RotateCcw className="size-4" aria-hidden />Reset to Day 1</Button>
          <Button variant="ghost" onClick={() => { actions.updateSettings({ safetyDismissed: false }); onClose() }}><ShieldAlert className="size-4" aria-hidden />Safety check</Button>
        </div>
      </section>

      <div className="sticky bottom-0 -mx-4 -mb-4 flex justify-end gap-2 border-t border-slate-800 bg-slate-900 px-4 py-3">
        <Button variant="ghost" onClick={onClose}>Close</Button>
        <Button variant="primary" disabled={!dirty || !valid} onClick={save}>Save changes</Button>
      </div>

      <ConfirmDialog
        open={pending !== null}
        title="Replace everything with this backup?"
        confirmLabel="Replace my data"
        onConfirm={() => {
          if (pending) actions.importState(pending)
          onClose()
        }}
        onClose={() => setPending(null)}
      >
        {pending && (
          <p>
            The backup has {pending.weighIns.length} weigh-ins, {pending.workouts.length} workouts and {Object.keys(pending.macros).length} macro logs, with Day 1 on {pending.profile.startDate}. Your current data will be overwritten.
          </p>
        )}
      </ConfirmDialog>
      <ConfirmDialog
        open={demoOpen}
        title="Load the Week-1 demo?"
        confirmLabel="Load demo"
        onConfirm={() => {
          actions.loadDemo(today)
          onClose()
        }}
        onClose={() => setDemoOpen(false)}
        extra={<Button onClick={() => downloadBackup(state, today)}><Download className="size-4" aria-hidden />Export first</Button>}
      >
        <p>This replaces all current data with a realistic first week (weigh-ins, three sessions, macro logs) so you can see how everything works.</p>
      </ConfirmDialog>
    </div>
  )
}
