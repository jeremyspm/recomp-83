import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App.tsx'
import { localISO } from './lib/dates.ts'
import { isStandalone } from './lib/device.ts'
import { demoState } from './lib/demo.ts'
import { readSaved } from './lib/persist.ts'
import { RestTimerProvider } from './state/RestTimerProvider.tsx'
import { StoreProvider } from './state/StoreProvider.tsx'

// First launch (nothing saved yet) opens on the Week 1 demo so every chart and
// badge has something to show; "Reset to Day 1" starts the real thing.
const today = localISO(new Date())
const initial = readSaved(today) ?? demoState(today)

const root = document.getElementById('root')
if (!root) throw new Error('#root missing from index.html')

createRoot(root).render(
  <StrictMode>
    <StoreProvider initial={initial}>
      <RestTimerProvider>
        <App />
      </RestTimerProvider>
    </StoreProvider>
  </StrictMode>,
)

// Offline support (public/sw.js). Production only, so dev never serves stale files.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}
// Installed apps ask the browser not to evict their data under storage pressure.
// Only when installed: some browsers show a permission prompt for this in a plain tab.
if (isStandalone) navigator.storage?.persist?.().catch(() => {})
