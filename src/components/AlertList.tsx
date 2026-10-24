import { CalendarHeart, Info, PartyPopper, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { Alert } from '../lib/model.ts'

const STYLE: Record<Alert['tone'], { box: string; icon: LucideIcon; title: string }> = {
  amber: { box: 'border-amber-500/50 bg-amber-950/40', icon: CalendarHeart, title: 'text-amber-200' },
  rose: { box: 'border-rose-500/50 bg-rose-950/40', icon: TriangleAlert, title: 'text-rose-200' },
  cyan: { box: 'border-cyan-500/40 bg-cyan-950/30', icon: Info, title: 'text-cyan-200' },
  emerald: { box: 'border-emerald-500/40 bg-emerald-950/30', icon: PartyPopper, title: 'text-emerald-200' },
}

export function AlertList({ alerts }: { alerts: Alert[] }) {
  if (!alerts.length) return null
  return (
    <div className="space-y-2">
      {alerts.map((a) => {
        const s = STYLE[a.tone]
        const Icon = s.icon
        return (
          <div key={a.id} role={a.tone === 'rose' ? 'alert' : 'status'} className={`flex gap-3 rounded-2xl border p-3.5 ${s.box}`}>
            <Icon className={`mt-0.5 size-5 shrink-0 ${s.title}`} aria-hidden />
            <div className="min-w-0">
              <p className={`text-sm font-bold ${s.title}`}>{a.title}</p>
              <p className="mt-0.5 text-[13px] leading-snug text-slate-300">{a.body}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
