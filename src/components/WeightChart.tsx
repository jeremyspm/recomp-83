import { useMemo } from 'react'
import {
  CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { daysBetween, fmtDay, addDays } from '../lib/dates.ts'
import { REFEED_WEEKS, type ProjectionPoint } from '../lib/physiology.ts'
import { trendSeries } from '../lib/stats.ts'
import type { WeighIn } from '../lib/types.ts'

interface Row {
  day: number
  projected?: number
  weighIn?: number
  trend?: number
}

const C = {
  grid: '#1e293b',
  axis: '#64748b',
  projected: '#22d3ee',
  trend: '#34d399',
  weighIn: '#f8fafc',
  goal: '#10b981',
  refeed: '#f59e0b',
  today: '#94a3b8',
}

export function WeightChart({ points, weighIns, startDate, goalKg, fromWeek = 0, toWeek, today, height = 250 }: {
  points: ProjectionPoint[]
  weighIns: WeighIn[]
  startDate: string
  goalKg: number
  fromWeek?: number
  toWeek: number
  today: string
  height?: number
}) {
  const minDay = fromWeek * 7
  const maxDay = toWeek * 7
  const { rows, yDomain, xTicks, yTicks } = useMemo(() => {
    const byDay = new Map<number, Row>()
    const row = (day: number) => {
      let r = byDay.get(day)
      if (!r) byDay.set(day, (r = { day }))
      return r
    }
    for (const p of points) if (p.week >= fromWeek && p.week <= toWeek) row(p.week * 7).projected = Math.round(p.scaleKg * 10) / 10
    for (const w of trendSeries(weighIns)) {
      const day = daysBetween(startDate, w.date)
      if (day < minDay || day > maxDay) continue
      const r = row(day)
      r.weighIn = w.kg
      r.trend = Math.round(w.trend * 10) / 10
    }
    const rows = [...byDay.values()].sort((a, b) => a.day - b.day)
    const vals = rows.flatMap((r) => [r.projected, r.weighIn]).filter((v): v is number => v !== undefined)
    const showGoal = Math.min(...vals) - goalKg < 6
    const lo = Math.floor(Math.min(...vals, ...(showGoal ? [goalKg] : [])) - 1)
    const hi = Math.ceil(Math.max(...vals) + 1)
    const span = toWeek - fromWeek
    const xStep = span > 30 ? 8 : span > 14 ? 4 : span > 7 ? 2 : 1
    const xTicks: number[] = []
    for (let w = Math.ceil(fromWeek / xStep) * xStep; w <= toWeek; w += xStep) xTicks.push(w * 7)
    const yStep = hi - lo > 24 ? 10 : hi - lo > 10 ? 5 : 2
    const yTicks: number[] = []
    for (let v = Math.ceil(lo / yStep) * yStep; v <= hi; v += yStep) yTicks.push(v)
    return { rows, yDomain: [lo, hi] as [number, number], xTicks, yTicks }
  }, [points, weighIns, startDate, goalKg, fromWeek, toWeek, minDay, maxDay])

  const todayDay = daysBetween(startDate, today)

  return (
    <div style={{ height }} className="w-full" role="img" aria-label="Projected weight curve against logged weigh-ins">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 10, right: 6, bottom: 0, left: -14 }}>
          <CartesianGrid stroke={C.grid} strokeDasharray="3 3" vertical={false} />
          {REFEED_WEEKS.filter((w) => w > fromWeek && w <= toWeek).map((w) => (
            <ReferenceArea key={w} x1={(w - 1) * 7} x2={w * 7} fill={C.refeed} fillOpacity={0.08} stroke="none" ifOverflow="hidden" />
          ))}
          <XAxis
            dataKey="day"
            type="number"
            domain={[minDay, maxDay]}
            ticks={xTicks}
            tickFormatter={(d: number) => `W${d / 7}`}
            stroke={C.axis}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: C.grid }}
            allowDataOverflow
          />
          <YAxis
            domain={yDomain}
            ticks={yTicks}
            allowDecimals={false}
            stroke={C.axis}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={44}
            allowDataOverflow
          />
          <ReferenceLine
            y={goalKg}
            stroke={C.goal}
            strokeDasharray="5 4"
            label={{ value: `Goal ${goalKg} kg`, position: 'insideBottomRight', fill: C.goal, fontSize: 11 }}
          />
          {todayDay >= minDay && todayDay <= maxDay && (
            <ReferenceLine x={todayDay} stroke={C.today} strokeDasharray="2 3" label={{ value: 'Today', position: 'insideTopLeft', fill: C.today, fontSize: 10 }} />
          )}
          <Tooltip
            cursor={{ stroke: '#475569' }}
            content={({ active, label, payload }) => {
              if (!active || !payload?.length) return null
              const day = Number(label)
              const get = (k: string) => payload.find((p) => p.dataKey === k)?.value as number | undefined
              return (
                <div className="rounded-xl border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs shadow-xl">
                  <div className="mb-1 font-semibold text-slate-200">Week {Math.floor(day / 7) + 1} · {fmtDay(addDays(startDate, day))}</div>
                  {get('projected') !== undefined && <div className="text-cyan-300">Projected {get('projected')?.toFixed(1)} kg</div>}
                  {get('weighIn') !== undefined && <div className="text-slate-100">Weigh-in {get('weighIn')?.toFixed(1)} kg</div>}
                  {get('trend') !== undefined && <div className="text-emerald-300">7-day trend {get('trend')?.toFixed(1)} kg</div>}
                </div>
              )
            }}
          />
          <Line type="monotone" dataKey="projected" name="Projected" stroke={C.projected} strokeWidth={2.5} dot={false} connectNulls isAnimationActive={false} />
          <Line type="monotone" dataKey="trend" name="7-day trend" stroke={C.trend} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
          <Line
            dataKey="weighIn"
            name="Weigh-ins"
            stroke="none"
            dot={{ r: 3, fill: C.weighIn, stroke: '#020617', strokeWidth: 1 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
            legendType="circle"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ChartLegend() {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
      <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-cyan-400" />Projected</span>
      <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-slate-50" />Weigh-ins</span>
      <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-emerald-400" />7-day trend</span>
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-3 rounded-sm bg-amber-400/30" />Refeed weeks</span>
    </div>
  )
}
