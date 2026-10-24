import {
  Check, CheckCircle2, ChevronsUp, Flag, History, Info, Repeat, Shuffle, Timer, Trash2, TriangleAlert,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { Button, Card, Chip, Disclosure, ProgressBar, SectionTitle, Segmented, Stepper } from '../components/ui.tsx'
import { fmtDay, fmtDuration } from '../lib/dates.ts'
import type { ExerciseLog, SessionId, WorkoutSession } from '../lib/types.ts'
import {
  RULES, adviceFor, doneSets, entryDefaults, incrementFor, machineFor, newSession, nextSessionId, repRange,
  sessionVolume, slotById, slotsFor, totalSets, warmupsFor, type Advice, type Machine, type Slot,
} from '../lib/workouts.ts'
import { useNow, useToday } from '../state/clock.ts'
import { useStore } from '../state/store.ts'
import { useRestTimer } from '../state/timer.ts'

const SESSION_TITLE: Record<SessionId, string> = {
  A: 'V-Taper Width & Quad Retention',
  B: 'Upper-Back Density & Shoulder Press',
}
const CAP_MS = 35 * 60_000
/** Weight · reps · done. The Done column narrows on 320 px phones so "122.5" still fits. */
const SET_COLS = 'grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_3.25rem] max-[359px]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_2.75rem]'

type Edit = (fn: (s: WorkoutSession) => WorkoutSession, start?: boolean) => void

function mapEntry(s: WorkoutSession, slotId: string, fn: (e: ExerciseLog) => ExerciseLog): WorkoutSession {
  return { ...s, entries: s.entries.map((e) => (e.slotId === slotId ? fn(e) : e)) }
}

function AdviceBanner({ advice, machine, top }: { advice: Advice; machine: Machine; top: number }) {
  switch (advice.kind) {
    case 'progress':
      return (
        <div className="flex gap-2 rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-[13px] leading-snug text-emerald-100">
          <ChevronsUp className="mt-0.5 size-4 shrink-0 text-emerald-300" aria-hidden />
          <span>
            <b>Move the pin down 1 plate (+{advice.inc} kg) today.</b> Last time: {advice.lastKg} kg × {advice.lastReps.join(', ')}, both at the top of the range. Today: {advice.nextKg} kg.
          </span>
        </div>
      )
    case 'dip':
      return (
        <div className="flex gap-2 rounded-xl border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-[13px] leading-snug text-amber-100">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-300" aria-hidden />
          <span>
            <b>Fatigue/glycogen dip detected ({advice.drop} fewer reps):</b> keep the weight the same and check your pre-workout carbs + sodium and last night's sleep.
            <span className="block text-xs text-amber-200/70">{advice.prevReps.join(', ')} → {advice.lastReps.join(', ')} at {advice.lastKg} kg</span>
          </span>
        </div>
      )
    case 'hold':
      return (
        <div className="flex gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-[13px] leading-snug text-slate-300">
          <Repeat className="mt-0.5 size-4 shrink-0 text-cyan-400" aria-hidden />
          <span>
            Last: {advice.lastKg} kg × {advice.lastReps.join(', ')}. <b className="text-slate-100">Beat it: {advice.targetReps.join(', ')}.</b> Add load once both sets reach {top}.
          </span>
        </div>
      )
    default:
      return (
        <div className="flex gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-[13px] leading-snug text-slate-300">
          <Info className="mt-0.5 size-4 shrink-0 text-cyan-400" aria-hidden />
          <span>First time on the {machine.name.toLowerCase()}: pick a weight you could do about {top + 2} times and stop 1–2 reps short. Log it and the app takes it from there.</span>
        </div>
      )
  }
}

function SlotBlock({ slot, entry, session, edit, onSetDone, superset }: {
  slot: Slot
  entry: ExerciseLog
  session: WorkoutSession
  edit: Edit
  onSetDone: (slot: Slot, setIndex: number) => void
  superset: boolean
}) {
  const { state, actions } = useStore()
  const machine = machineFor(slot, entry.exerciseId)
  const advice = adviceFor(slot, machine, state.workouts, session.id)
  const [low, top] = repRange(slot, machine)
  const inc = incrementFor(slot, machine)
  const warmups = warmupsFor(slot, entry.sets[0]?.kg ?? null, inc)
  const anyDone = entry.sets.some((s) => s.done)
  const idx = slot.machines.findIndex((m) => m.id === machine.id)

  const swap = () => {
    const next = (idx + 1) % slot.machines.length
    const nextMachine = slot.machines[next]
    actions.setSwap(slot.id, next)
    edit((s) => mapEntry(s, slot.id, (e) => ({
      ...e,
      exerciseId: nextMachine.id,
      warmups: e.warmups.map(() => false),
      sets: entryDefaults(slot, nextMachine, state.workouts, s.id),
    })))
  }

  const setField = (i: number, patch: { kg?: number | null; reps?: number | null }) => {
    edit((s) => mapEntry(s, slot.id, (e) => ({
      ...e,
      sets: e.sets.map((x, j) => {
        if (j === i) return { ...x, ...patch }
        // Changing set 1's weight carries over to an untouched set 2.
        if (i === 0 && j > 0 && patch.kg !== undefined && !x.done && x.kg === e.sets[0].kg) return { ...x, kg: patch.kg }
        return x
      }),
    })))
  }

  const toggleSet = (i: number) => {
    const wasDone = entry.sets[i].done
    edit((s) => mapEntry(s, slot.id, (e) => ({ ...e, sets: e.sets.map((x, j) => (j === i ? { ...x, done: !x.done } : x)) })), true)
    if (!wasDone) onSetDone(slot, i)
  }

  const toggleWarmup = (k: number) => {
    edit((s) => mapEntry(s, slot.id, (e) => ({ ...e, warmups: e.warmups.map((w, j) => (j === k ? !w : w)) })), true)
  }

  const highlight = advice.kind === 'progress'
  return (
    <div className="space-y-2.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-base font-bold leading-tight text-slate-50">{machine.name}</h3>
            <Chip>{machine.type}</Chip>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            <span className="whitespace-nowrap">{slot.focus}</span> · <b className="whitespace-nowrap text-slate-200">2 × {low}–{top} @ 1 RIR</b>
            {!superset && <span className="whitespace-nowrap"> · rest {fmtDuration(slot.restSec * 1000)}</span>}
          </p>
          <p className="mt-1 text-xs leading-snug text-slate-500">{slot.why}</p>
        </div>
        <button
          type="button"
          onClick={swap}
          disabled={anyDone}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-40"
          title={anyDone ? 'Sets already logged on this machine' : 'Machine busy, or you hate it? Swap to an equivalent'}
          aria-label={`Swap machine: ${idx + 1} of ${slot.machines.length}. Machine busy or disliked`}
        >
          <Shuffle className="size-4" aria-hidden />
          <span className="leading-tight">Busy?<br />Swap {idx + 1}/{slot.machines.length}</span>
        </button>
      </div>
      {machine.note && <p className="text-xs text-amber-200/80">{machine.note}</p>}
      <AdviceBanner advice={advice} machine={machine} top={top} />

      <div className="space-y-1.5">
        {warmups.map((w, k) => (
          <button
            key={k}
            type="button"
            onClick={() => toggleWarmup(k)}
            aria-pressed={entry.warmups[k] ?? false}
            className={`flex h-11 w-full items-center gap-3 rounded-xl border px-3 text-left text-sm ${
              entry.warmups[k] ? 'border-slate-700 bg-slate-800/60 text-slate-400' : 'border-dashed border-slate-700 text-slate-300'
            }`}
          >
            <span className={`grid size-6 place-items-center rounded-md border ${entry.warmups[k] ? 'border-slate-500 bg-slate-600 text-white' : 'border-slate-600'}`}>
              {entry.warmups[k] && <Check className="size-4" aria-hidden />}
            </span>
            <span className="flex-1">{k === 0 ? 'Warm-up' : 'Ramp'} · {w.pct}% × {w.reps}</span>
            <span className="font-semibold tabular-nums">{w.kg !== null ? `${w.kg} kg` : 'set weight first'}</span>
          </button>
        ))}
      </div>

      <div className="space-y-1">
        <div className={`grid ${SET_COLS} gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500`}>
          <span className="text-center">Weight kg</span>
          <span className="text-center">Reps</span>
          <span className="text-center">Done</span>
        </div>
        {entry.sets.map((set, i) => (
          <div key={i} className={`grid ${SET_COLS} items-center gap-1.5 rounded-xl p-1 ${set.done ? 'bg-emerald-500/10' : ''}`}>
            <Stepper compact value={set.kg} onChange={(kg) => setField(i, { kg })} step={inc} min={0} max={500} label={`Set ${i + 1} weight in kg`} highlight={highlight && set.kg === (advice.kind === 'progress' ? advice.nextKg : null)} placeholder="kg" decimal />
            <Stepper compact value={set.reps} onChange={(reps) => setField(i, { reps })} step={1} min={0} max={50} label={`Set ${i + 1} reps`} placeholder="reps" />
            <button
              type="button"
              onClick={() => toggleSet(i)}
              disabled={set.kg === null || set.reps === null}
              aria-pressed={set.done}
              aria-label={set.done ? `Undo set ${i + 1}` : `Mark set ${i + 1} done`}
              className={`flex h-12 flex-col items-center justify-center rounded-xl border-2 leading-none transition active:scale-95 disabled:opacity-30 ${
                set.done ? 'border-emerald-400 bg-emerald-500 text-slate-950' : 'border-slate-600 text-slate-300 hover:border-emerald-400'
              }`}
            >
              <span className="text-[9px] font-bold uppercase tracking-wide">Set {i + 1}</span>
              <Check className="size-5" strokeWidth={3} aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export function WorkoutLoggerView() {
  const { state, actions } = useStore()
  const today = useToday()
  const timer = useRestTimer()
  const [chosen, setChosen] = useState<SessionId | null>(null)
  const [deleting, setDeleting] = useState<WorkoutSession | null>(null)
  const stored = state.workouts.find((w) => w.date === today)
  const sessionId: SessionId = stored?.session ?? chosen ?? nextSessionId(state.workouts, today)
  const planned = useMemo(() => newSession(today, sessionId, state.swaps, state.workouts), [today, sessionId, state.swaps, state.workouts])
  const session = stored ?? planned
  const started = session.startedAt !== null
  const live = started && session.finishedAt === null
  const now = useNow(live)
  const elapsed = session.startedAt === null ? 0 : (session.finishedAt ?? (now || session.startedAt)) - session.startedAt
  const done = doneSets(session)
  const total = totalSets(session)
  const slots = slotsFor(sessionId)
  const stations = [...new Set(slots.map((s) => s.station))]
  const history = state.workouts.filter((w) => w.date !== today && doneSets(w) > 0).slice(-8).reverse()

  const edit: Edit = (fn, start) => actions.editSession(today, sessionId, fn, start)

  const onSetDone = (slot: Slot, setIndex: number) => {
    if (slot.superset === 'a') return
    const isLastSet = setIndex === 1
    const lastStation = slot.station === stations[stations.length - 1]
    if (isLastSet && lastStation) return
    const nextSlot = slots.find((s) => s.station === slot.station + 1)
    const label = isLastSet && nextSlot
      ? `next: ${machineFor(nextSlot, session.entries.find((e) => e.slotId === nextSlot.id)?.exerciseId ?? '').name}`
      : slot.superset === 'b' ? 'round 2 next' : `set ${setIndex + 2} next`
    timer.start(slot.restSec, label)
  }

  const switchSession = (v: SessionId) => {
    if (stored && !started) actions.deleteSession(stored.id)
    setChosen(v)
  }

  const finish = () => {
    actions.finishSession(today)
    timer.stop()
  }

  const earned = session.entries.filter((e) => {
    const slot = slotById(e.slotId)
    if (!slot) return false
    const [, top] = repRange(slot, machineFor(slot, e.exerciseId))
    return e.sets.length > 0 && e.sets.every((s) => s.done && (s.reps ?? 0) >= top)
  }).length

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{fmtDay(today)} · Session {sessionId}</p>
            <h2 className="text-lg font-bold leading-tight text-slate-50">{SESSION_TITLE[sessionId]}</h2>
          </div>
          <div className={`shrink-0 rounded-xl border px-3 py-1.5 text-right ${elapsed > CAP_MS ? 'border-rose-500/50 text-rose-300' : elapsed > CAP_MS - 5 * 60_000 ? 'border-amber-500/50 text-amber-300' : 'border-slate-700 text-slate-200'}`}>
            <div className="flex items-center justify-end gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500"><Timer className="size-3" aria-hidden />Cap 35:00</div>
            <div className="font-mono text-xl font-bold tabular-nums">{fmtDuration(elapsed)}</div>
          </div>
        </div>
        <Segmented
          label="Session"
          value={sessionId}
          onChange={switchSession}
          disabled={started}
          options={[{ value: 'A', label: 'Session A', sub: 'Width + quads' }, { value: 'B', label: 'Session B', sub: 'Back + press' }]}
        />
        <p className="mt-2 text-xs text-slate-500">
          {started ? 'Locked once you start. ' : ''}Mon/Wed/Fri alternate A/B/A, then B/A/B. It follows your last session, so a missed day doesn't break the split.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1"><ProgressBar value={done} max={total} label="Working sets done" /></div>
          <span className="text-sm font-bold tabular-nums text-slate-300">{done}/{total} sets</span>
        </div>
        <div className="mt-3">
          <Disclosure title="The rules (MED high-tension training)" icon={Info}>
            <ol className="space-y-2">
              {RULES.map((r, i) => (
                <li key={r.title} className="flex gap-2">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-[11px] font-bold text-emerald-300">{i + 1}</span>
                  <span><b className="text-slate-100">{r.title}.</b> {r.body}</span>
                </li>
              ))}
            </ol>
          </Disclosure>
        </div>
      </Card>

      {stations.map((station) => {
        const group = slots.filter((s) => s.station === station)
        const isSuperset = group.length > 1
        return (
          <Card key={`${sessionId}-${station}`}>
            <div className="mb-3 flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-slate-800 text-sm font-black text-slate-200">{station}</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Station {station} of {stations.length}{isSuperset ? ` · superset, ${group[1].restSec} s rest after both` : ''}
              </span>
            </div>
            <div className={isSuperset ? 'space-y-5 divide-y divide-slate-800 [&>*+*]:pt-5' : ''}>
              {group.map((slot) => {
                const entry = session.entries.find((e) => e.slotId === slot.id)
                if (!entry) return null
                return <SlotBlock key={slot.id} slot={slot} entry={entry} session={session} edit={edit} onSetDone={onSetDone} superset={isSuperset} />
              })}
            </div>
          </Card>
        )
      })}

      {session.finishedAt ? (
        <Card tone="emerald">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-emerald-300" aria-hidden />
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-emerald-100">Done: in and out in {fmtDuration(elapsed)}</h2>
              <p className="mt-1 text-sm text-slate-300">
                {done}/{total} working sets · {Math.round(sessionVolume(session)).toLocaleString()} kg moved.
                {earned > 0 && <> <b className="text-emerald-200">{earned} machine{earned > 1 ? 's' : ''}</b> earned a load jump next time.</>}
              </p>
              <Button variant="ghost" className="mt-2 px-0" onClick={() => edit((s) => ({ ...s, finishedAt: null }))}>Reopen to edit</Button>
            </div>
          </div>
        </Card>
      ) : (
        <Button variant="primary" className="h-14 w-full text-base" disabled={done === 0} onClick={finish}>
          <Flag className="size-5" aria-hidden /> Finish session
        </Button>
      )}

      {history.length > 0 && (
        <Card>
          <SectionTitle icon={History}>Recent sessions</SectionTitle>
          <ul className="divide-y divide-slate-800">
            {history.map((w) => (
              <li key={w.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-800 font-black text-slate-200">{w.session}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-slate-200">{fmtDay(w.date)}</span>
                  <span className="block text-xs tabular-nums text-slate-400">
                    {doneSets(w)}/{totalSets(w)} sets · {Math.round(sessionVolume(w)).toLocaleString()} kg
                    {w.startedAt && w.finishedAt ? ` · ${fmtDuration(w.finishedAt - w.startedAt)}` : ''}
                  </span>
                </span>
                <button type="button" onClick={() => setDeleting(w)} className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-800 hover:text-rose-300" aria-label={`Delete session from ${fmtDay(w.date)}`}>
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this session?"
        confirmLabel="Delete"
        onConfirm={() => deleting && actions.deleteSession(deleting.id)}
        onClose={() => setDeleting(null)}
      >
        <p>{deleting ? `Session ${deleting.session} from ${fmtDay(deleting.date)} will be removed, along with its progression history.` : ''}</p>
      </ConfirmDialog>
    </div>
  )
}
