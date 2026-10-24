import { Plus, TimerReset, X } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { fmtDuration } from '../lib/dates.ts'
import { useNow } from './clock.ts'
import { beep, primeAudio, RestTimerContext, type RestTimerApi, type RunningTimer } from './timer.ts'

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [timer, setTimer] = useState<RunningTimer | null>(null)

  const actions = useMemo<Omit<RestTimerApi, 'timer'>>(() => ({
    start(seconds, label) {
      primeAudio()
      setTimer({ endAt: Date.now() + seconds * 1000, total: seconds, label })
    },
    extend(seconds) {
      setTimer((t) => (t ? { ...t, endAt: t.endAt + seconds * 1000, total: Math.max(1, t.total + seconds) } : t))
    },
    stop() {
      setTimer(null)
    },
  }), [])
  const api = useMemo<RestTimerApi>(() => ({ timer, ...actions }), [timer, actions])

  return (
    <RestTimerContext.Provider value={api}>
      {children}
      {timer && <RestPill key={timer.endAt - timer.total * 1000} timer={timer} api={api} />}
    </RestTimerContext.Provider>
  )
}

function RestPill({ timer, api }: { timer: RunningTimer; api: RestTimerApi }) {
  const now = useNow(true)
  const remaining = now === 0 ? timer.total * 1000 : timer.endAt - now
  const done = remaining <= 0
  const progress = Math.min(1, Math.max(0, 1 - remaining / (timer.total * 1000)))

  useEffect(() => {
    if (!done) return
    try {
      navigator.vibrate?.([220, 120, 220])
    } catch {
      /* vibration unsupported */
    }
    beep()
    const id = window.setTimeout(api.stop, 5000)
    return () => window.clearTimeout(id)
  }, [done, api.stop])

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4">
      <div
        role="timer"
        aria-live="polite"
        className={`pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl shadow-black/60 backdrop-blur ${
          done ? 'pulse-go border-emerald-400 bg-emerald-500/95 text-slate-950' : 'border-cyan-500/40 bg-slate-900/95 text-slate-100'
        }`}
      >
        <div className="flex items-center gap-3 px-4 py-2.5">
          <TimerReset className={`size-5 shrink-0 ${done ? 'text-slate-950' : 'text-cyan-400'}`} aria-hidden />
          <div className="min-w-0 flex-1">
            <div className={`truncate text-[11px] font-semibold uppercase tracking-[0.14em] ${done ? 'text-slate-900' : 'text-slate-400'}`}>
              {done ? 'Go: next set' : `Rest · ${timer.label}`}
            </div>
            <div className="font-mono text-3xl font-bold leading-none tabular-nums">
              {done ? '0:00' : fmtDuration(remaining)}
            </div>
          </div>
          {!done && (
            <>
              <button
                type="button"
                onClick={() => api.extend(-15)}
                className="h-11 rounded-xl border border-slate-700 bg-slate-800 px-3 text-sm font-semibold tabular-nums active:scale-95"
                aria-label="Take 15 seconds off the rest"
              >
                −15
              </button>
              <button
                type="button"
                onClick={() => api.extend(30)}
                className="flex h-11 items-center gap-0.5 rounded-xl border border-slate-700 bg-slate-800 px-3 text-sm font-semibold tabular-nums active:scale-95"
                aria-label="Add 30 seconds of rest"
              >
                <Plus className="size-3.5" aria-hidden />30
              </button>
            </>
          )}
          <button
            type="button"
            onClick={api.stop}
            className={`grid size-11 place-items-center rounded-xl active:scale-95 ${done ? 'bg-slate-950/15' : 'border border-slate-700 bg-slate-800'}`}
            aria-label={done ? 'Dismiss' : 'Skip rest'}
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="h-1 bg-slate-800/60">
          <div className={`h-full transition-[width] duration-200 ${done ? 'bg-slate-950/40' : 'bg-cyan-400'}`} style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
    </div>
  )
}
