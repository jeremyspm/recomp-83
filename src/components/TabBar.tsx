import { Dumbbell, FlaskConical, LayoutDashboard, Utensils, type LucideIcon } from 'lucide-react'
import type { TabId } from '../state/route.ts'

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'workout', label: 'Workout', icon: Dumbbell },
  { id: 'nutrition', label: 'Nutrition', icon: Utensils },
  { id: 'simulator', label: 'Simulator', icon: FlaskConical },
]

export function TabBar({ tab, onChange, badges }: { tab: TabId; onChange: (t: TabId) => void; badges: Partial<Record<TabId, boolean>> }) {
  return (
    <nav aria-label="Sections" className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-slate-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto grid max-w-xl grid-cols-4">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-current={active ? 'page' : undefined}
              className={`relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition ${
                active ? 'text-emerald-300' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {active && <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-emerald-400" aria-hidden />}
              <span className="relative">
                <Icon className="size-6" aria-hidden />
                {badges[id] && <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-amber-400 ring-2 ring-slate-950" aria-label="needs attention" />}
              </span>
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
