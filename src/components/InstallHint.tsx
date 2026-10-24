import { Smartphone } from 'lucide-react'
import { isIOS, isStandalone, isTouchDevice } from '../lib/device.ts'
import { useStore } from '../state/store.ts'
import { Button, Card } from './ui.tsx'

/** Shown on phones in a browser tab: install first, because iOS gives the installed app its own storage. */
export function InstallHint() {
  const { state, actions } = useStore()
  if (isStandalone || !isTouchDevice || state.settings.installHintDismissed) return null
  return (
    <Card tone="cyan">
      <div className="flex items-start gap-3">
        <Smartphone className="mt-0.5 size-5 shrink-0 text-cyan-300" aria-hidden />
        <div className="min-w-0 space-y-2 text-sm text-slate-200">
          <h2 className="font-bold text-cyan-100">Put it on your home screen first</h2>
          <p className="text-[13px] leading-snug text-slate-300">
            {isIOS
              ? <>In Safari, tap <b>Share</b> → <b>Add to Home Screen</b>.</>
              : <>Tap the browser menu <b>⋮</b> → <b>Install app</b> (or <b>Add to Home screen</b>).</>}
            {' '}It then opens full screen like an app and works with no signal, e.g. in the gym.
          </p>
          {isIOS && (
            <p className="text-[13px] leading-snug text-amber-200/90">
              On iPhone the home-screen app keeps its own data, separate from Safari, so install it before you start logging.
            </p>
          )}
          <Button variant="secondary" className="w-full" onClick={() => actions.updateSettings({ installHintDismissed: true })}>
            Got it
          </Button>
        </div>
      </div>
    </Card>
  )
}
