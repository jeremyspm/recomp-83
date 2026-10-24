// What kind of screen the app is running on. Read once at load; it doesn't change mid-session.

const nav = navigator as Navigator & { standalone?: boolean }

/** Opened from the home screen (installed), not in a browser tab. */
export const isStandalone = window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true

/** A phone or tablet (finger, not mouse). */
export const isTouchDevice = window.matchMedia('(pointer: coarse)').matches

/** iPhone/iPad, including iPadOS reporting itself as a Mac. */
export const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)
