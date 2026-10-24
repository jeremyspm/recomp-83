import { addDays, daysBetween } from './dates.ts'
import type { WeighIn } from './types.ts'

export const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

/** Mean of weigh-ins in the `days`-day window ending on `endDate` (inclusive). */
export function windowAverage(weighIns: WeighIn[], endDate: string, days = 7): { avg: number; n: number } | null {
  const from = addDays(endDate, -(days - 1))
  const vals = weighIns.filter((w) => w.date >= from && w.date <= endDate).map((w) => w.kg)
  return vals.length ? { avg: mean(vals), n: vals.length } : null
}

/** Each weigh-in with its trailing 7-day average. */
export function trendSeries(weighIns: WeighIn[]): (WeighIn & { trend: number })[] {
  return weighIns.map((w) => ({ ...w, trend: windowAverage(weighIns, w.date)?.avg ?? w.kg }))
}

/** kg lost per week: this week's average against last week's (positive = losing). */
export function weeklyLoss(weighIns: WeighIn[], today: string): number | null {
  const now = windowAverage(weighIns, today)
  const prev = windowAverage(weighIns, addDays(today, -7))
  if (!now || !prev || now.n < 2 || prev.n < 2) return null
  return prev.avg - now.avg
}

/** Least-squares line with the standard error of its slope. */
export function linearFit(xs: number[], ys: number[]): { slope: number; intercept: number; slopeSE: number } | null {
  const n = xs.length
  if (n < 3) return null
  const mx = mean(xs)
  const my = mean(ys)
  let sxx = 0
  let sxy = 0
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - mx) ** 2
    sxy += (xs[i] - mx) * (ys[i] - my)
  }
  if (sxx === 0) return null
  const slope = sxy / sxx
  const intercept = my - slope * mx
  let ssr = 0
  for (let i = 0; i < n; i++) ssr += (ys[i] - (intercept + slope * xs[i])) ** 2
  return { slope, intercept, slopeSE: Math.sqrt(ssr / (n - 2) / sxx) }
}

/**
 * Least-squares slope (kg/day) over the last `days` days, skipping the first two
 * weeks of the protocol (the glycogen/water flush would exaggerate it). Needs the
 * weigh-ins to span at least `minSpanDays`.
 */
export function recentSlope(weighIns: WeighIn[], startDate: string, today: string, minSpanDays: number, days = 21) {
  const from = [addDays(today, -(days - 1)), addDays(startDate, 14)].sort().at(-1) as string
  const pts = weighIns.filter((w) => w.date >= from && w.date <= today)
  if (pts.length < 6 || daysBetween(pts[0].date, pts[pts.length - 1].date) < minSpanDays) return null
  const xs = pts.map((w) => daysBetween(startDate, w.date))
  const fit = linearFit(xs, pts.map((w) => w.kg))
  if (!fit) return null
  return { ...fit, from, n: pts.length, todayKg: fit.intercept + fit.slope * daysBetween(startDate, today) }
}
