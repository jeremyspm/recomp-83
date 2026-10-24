import { Download } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ConfirmDialog } from './components/ConfirmDialog.tsx'
import { Header } from './components/Header.tsx'
import { SettingsModal } from './components/SettingsModal.tsx'
import { TabBar } from './components/TabBar.tsx'
import { Button } from './components/ui.tsx'
import { downloadBackup } from './lib/backup.ts'
import { fmtDay } from './lib/dates.ts'
import { alertsFor, isRefeedWeek, protocolDay } from './lib/model.ts'
import { useToday } from './state/clock.ts'
import { useTab } from './state/route.ts'
import { useStore } from './state/store.ts'
import { useRestTimer } from './state/timer.ts'
import { DashboardView } from './views/DashboardView.tsx'
import { NutritionCycleView } from './views/NutritionCycleView.tsx'
import { RecompSimulatorView } from './views/RecompSimulatorView.tsx'
import { WorkoutLoggerView } from './views/WorkoutLoggerView.tsx'

export function App() {
  const [tab, go] = useTab()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const { state, actions } = useStore()
  const { timer } = useRestTimer()
  const today = useToday()
  const { week } = protocolDay(state, today)
  const startKg = state.profile.startWeightKg.toFixed(1)
  const badges = {
    dashboard: alertsFor(state, today).some((a) => a.tone === 'rose'),
    nutrition: isRefeedWeek(week),
  }

  // Each tab opens at the top, however you got there (tap, link or back button).
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [tab])

  return (
    <div className="min-h-dvh">
      <Header onSettings={() => setSettingsOpen(true)} onReset={() => setResetOpen(true)} />
      <main className={`mx-auto max-w-xl px-4 pt-4 ${timer ? 'pb-[calc(11rem+env(safe-area-inset-bottom))]' : 'pb-[calc(6rem+env(safe-area-inset-bottom))]'}`}>
        {tab === 'dashboard' && <DashboardView go={go} />}
        {tab === 'workout' && <WorkoutLoggerView />}
        {tab === 'nutrition' && <NutritionCycleView />}
        {tab === 'simulator' && <RecompSimulatorView />}
        <footer className="mt-8 text-center text-[11px] leading-relaxed text-slate-600">
          Recomp 83 · general information, not medical advice · your data stays on this device
        </footer>
      </main>
      <TabBar tab={tab} onChange={go} badges={badges} />

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} onReset={() => setResetOpen(true)} />
      <ConfirmDialog
        open={resetOpen}
        title={`Reset to Day 1 (${startKg} kg)?`}
        confirmLabel="Reset"
        onConfirm={() => actions.resetToDay1(today)}
        onClose={() => setResetOpen(false)}
        extra={<Button onClick={() => downloadBackup(state, today)}><Download className="size-4" aria-hidden />Export first</Button>}
      >
        <p>
          This clears every weigh-in, macro log, checklist and workout, then starts Day 1 today ({fmtDay(today)}) at {startKg} kg.
          Your profile and settings stay.
        </p>
        <p className="text-slate-400">It can't be undone, so export a backup first if you might want this history back.</p>
      </ConfirmDialog>
    </div>
  )
}
