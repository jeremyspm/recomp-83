import { createContext, useContext } from 'react'

export interface RunningTimer {
  endAt: number
  total: number
  label: string
}

export interface RestTimerApi {
  timer: RunningTimer | null
  start(seconds: number, label: string): void
  extend(seconds: number): void
  stop(): void
}

export const RestTimerContext = createContext<RestTimerApi | null>(null)

export function useRestTimer(): RestTimerApi {
  const api = useContext(RestTimerContext)
  if (!api) throw new Error('useRestTimer must be used inside <RestTimerProvider>')
  return api
}

// One AudioContext, unlocked by the tap that starts a rest (browsers block audio
// until a user gesture).
let audio: AudioContext | null = null

export function primeAudio() {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') void audio.resume()
  } catch {
    audio = null
  }
}

export function beep() {
  if (!audio) return
  try {
    const t0 = audio.currentTime
    for (const [i, freq] of [880, 1320].entries()) {
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, t0 + i * 0.18)
      gain.gain.exponentialRampToValueAtTime(0.25, t0 + i * 0.18 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.18 + 0.16)
      osc.connect(gain).connect(audio.destination)
      osc.start(t0 + i * 0.18)
      osc.stop(t0 + i * 0.18 + 0.17)
    }
  } catch {
    /* audio unavailable */
  }
}
