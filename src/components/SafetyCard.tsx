import { ShieldAlert } from 'lucide-react'
import { useStore } from '../state/store.ts'
import { Button, Card } from './ui.tsx'

export function SafetyCard() {
  const { state, actions } = useStore()
  if (state.settings.safetyDismissed) return null
  return (
    <Card tone="rose">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-rose-300" aria-hidden />
        <div className="min-w-0 space-y-2 text-sm text-slate-200">
          <h2 className="font-bold text-rose-100">Before you start: a 2-minute safety check</h2>
          <ul className="list-disc space-y-1.5 pl-4 text-[13px] leading-snug text-slate-300">
            <li><b className="text-slate-100">See your GP first.</b> A BMI near 40 plus a ~1,500 kcal/day deficit is a big change. Ask for blood pressure, HbA1c, lipids, liver and kidney function, and uric acid.</li>
            <li><b className="text-slate-100">On blood-pressure or diabetes medicine?</b> Doses often need to drop as the weight comes off. Without a medication review you risk low blood pressure or low blood sugar.</li>
            <li><b className="text-slate-100">Gallstones:</b> eat the ≥ 15 g fat meal every day. The app warns you if you lose more than 1.5 kg/week after week 2.</li>
            <li><b className="text-slate-100">Stop and get help</b> for chest pain, fainting, a racing heartbeat, severe pain under the right ribs (often after fatty food), yellow skin or eyes, or a hot, swollen joint (gout).</li>
            <li><b className="text-slate-100">Creatine and salt:</b> skip creatine with kidney disease, and skip the pre-workout salt with high blood pressure, heart or kidney disease, unless your GP says it's OK.</li>
          </ul>
          <Button variant="secondary" className="w-full" onClick={() => actions.updateSettings({ safetyDismissed: true })}>
            Got it, hide this
          </Button>
        </div>
      </div>
    </Card>
  )
}
