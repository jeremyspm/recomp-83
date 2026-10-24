import { RotateCcw, Settings } from 'lucide-react'
import { fmtDay } from '../lib/dates.ts'
import { protocolDay } from '../lib/model.ts'
import { useToday } from '../state/clock.ts'
import { useSaveOk, useStore } from '../state/store.ts'
import { ProgressBar } from './ui.tsx'

export function Header({ onSettings, onReset }: { onSettings: () => void; onReset: () => void }) {
  const { state } = useStore()
  const today = useToday()
  const saveOk = useSaveOk()
  const { day, week, dayNumber } = protocolDay(state, today)
  const totalDays = state.profile.planWeeks * 7
  const status = day < 0
    ? `Starts ${fmtDay(state.profile.startDate)}`
    : day >= totalDays
      ? `Block complete · week ${week}`
      : `Week ${week} of ${state.profile.planWeeks} · Day ${dayNumber}`

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto max-w-xl px-4 pb-2.5 pt-2">
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 64 64" className="size-9 shrink-0" aria-hidden>
            <rect x="2" y="2" width="60" height="60" rx="13" fill="#0f172a" stroke="#10b981" strokeWidth="3" />
            <path d="M14 44 L26 30 L34 37 L50 19" fill="none" stroke="#22d3ee" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="50" cy="19" r="5" fill="#f59e0b" />
          </svg>
          <div className="min-w-0 flex-1">
            <h1 className="text-[15px] font-black tracking-[0.2em] text-slate-50">
              RECOMP<span className="text-emerald-400">83</span>
            </h1>
            <p className="truncate text-xs tabular-nums text-slate-400">{status}</p>
          </div>
          <button
            type="button"
            onClick={onSettings}
            className="grid size-11 shrink-0 place-items-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
            aria-label="Settings, backup and profile"
          >
            <Settings className="size-5" aria-hidden />
          </button>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <ProgressBar value={Math.max(0, Math.min(day + 1, totalDays))} max={totalDays} tone="cyan" label="Protocol progress" />
          </div>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/20"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Reset to Day 1 ({state.profile.startWeightKg.toFixed(1)} kg)
          </button>
        </div>
        {!saveOk && (
          <p className="mt-2 rounded-lg border border-rose-500/40 bg-rose-950/40 px-2 py-1 text-xs text-rose-200">
            This browser isn't saving (private mode or storage full). Export a backup from Settings.
          </p>
        )}
      </div>
    </header>
  )
}
