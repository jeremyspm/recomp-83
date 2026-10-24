import { Scale } from 'lucide-react'
import { ffmi, forbesPath, pctOf, targetBand, type GoalCrossing } from '../lib/physiology.ts'
import type { Profile } from '../lib/types.ts'
import { Card, SectionTitle } from './ui.tsx'

const half = (x: number) => Math.round(x * 2) / 2
const f1 = (x: number) => x.toFixed(1)

interface Body {
  key: string
  title: string
  kg: number
  ffm: number
  fat: number
  ffmText: string
  fatText: string
  bfText: string
  ffmiText: string
  verdict: string
  tone: 'rose' | 'emerald' | 'cyan'
}

const TONE = {
  rose: { title: 'text-rose-300', ring: 'border-rose-500/40', verdict: 'text-rose-200/80' },
  emerald: { title: 'text-emerald-300', ring: 'border-emerald-500/50', verdict: 'text-emerald-200/80' },
  cyan: { title: 'text-cyan-300', ring: 'border-cyan-500/40', verdict: 'text-cyan-200/80' },
}

const BAR_PX = 150

function BodyColumn({ body, scaleKg }: { body: Body; scaleKg: number }) {
  const t = TONE[body.tone]
  return (
    <div className={`flex min-w-0 flex-col items-center rounded-xl border bg-slate-950/60 px-1.5 pb-2.5 pt-2 ${t.ring}`}>
      <div className={`text-center text-[11px] font-bold uppercase leading-tight tracking-wide ${t.title}`}>{body.title}</div>
      <div className="mt-0.5 text-lg font-black tabular-nums text-slate-50">{body.kg} kg</div>
      <div className="mt-1.5 flex w-11 flex-col-reverse overflow-hidden rounded-lg" style={{ height: BAR_PX }}>
        <div className="flex items-center justify-center bg-emerald-500/85 text-[10px] font-bold text-slate-950" style={{ height: (body.ffm / scaleKg) * BAR_PX }}>
          FFM
        </div>
        <div className="flex items-center justify-center bg-amber-400/90 text-[10px] font-bold text-slate-950" style={{ height: (body.fat / scaleKg) * BAR_PX }}>
          fat
        </div>
        <div className="flex-1" />
      </div>
      <dl className="mt-2 w-full space-y-0.5 text-center text-[11px] leading-tight tabular-nums">
        <div><dt className="sr-only">Fat-free mass</dt><dd className="font-semibold text-emerald-300">{body.ffmText} FFM</dd></div>
        <div><dt className="sr-only">Fat</dt><dd className="font-semibold text-amber-300">{body.fatText} fat</dd></div>
        <div><dt className="sr-only">Body fat</dt><dd className="text-slate-300">{body.bfText}</dd></div>
        <div><dt className="sr-only">FFMI</dt><dd className="text-slate-400">FFMI {body.ffmiText}</dd></div>
      </dl>
      <p className={`mt-1.5 text-center text-[10.5px] leading-snug ${t.verdict}`}>{body.verdict}</p>
    </div>
  )
}

const G = { min: 17, max: 25, cx: 130, cy: 128, r: 96 }
const angle = (v: number) => Math.PI * (1 - (Math.min(G.max, Math.max(G.min, v)) - G.min) / (G.max - G.min))
const pt = (v: number, r = G.r) => [G.cx + r * Math.cos(angle(v)), G.cy - r * Math.sin(angle(v))] as const

function arc(from: number, to: number, r = G.r) {
  const [x1, y1] = pt(from, r)
  const [x2, y2] = pt(to, r)
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`
}

function Needle({ value, color }: { value: number; color: string }) {
  const [x, y] = pt(value, G.r - 12)
  return (
    <g>
      <line x1={G.cx} y1={G.cy} x2={x} y2={y} stroke={color} strokeWidth={3.5} strokeLinecap="round" />
      <circle cx={G.cx} cy={G.cy} r={6} fill="#0f172a" stroke={color} strokeWidth={2} />
    </g>
  )
}

function FfmiGauge({ crash, band, projected }: { crash: number; band: readonly [number, number]; projected: number | null }) {
  const zones: [number, number, string, string][] = [
    [17, 19, '#9f1239', 'Depleted'],
    [19, 21, '#334155', 'Average'],
    [21, 23, '#0e7490', 'Athletic'],
    [23, 25, '#047857', 'Jacked'],
  ]
  return (
    <svg viewBox="0 0 260 150" className="mx-auto w-full max-w-xs" role="img" aria-label={`Fat-free mass index gauge: crash diet ${f1(crash)}, target ${f1(band[0])} to ${f1(band[1])}${projected ? `, your projection ${f1(projected)}` : ''}`}>
      {zones.map(([a, b, color]) => <path key={a} d={arc(a, b)} stroke={color} strokeWidth={18} fill="none" />)}
      <path d={arc(band[0], band[1], G.r + 13)} stroke="#34d399" strokeWidth={5} strokeLinecap="round" fill="none" />
      {zones.map(([a, , , label]) => {
        const [x, y] = pt(a + 1, G.r)
        const deg = 90 - (angle(a + 1) * 180) / Math.PI
        return (
          <text key={label} x={x} y={y} fill="#f8fafc" fillOpacity={0.9} fontSize={8.5} fontWeight={700} textAnchor="middle" dominantBaseline="central" transform={`rotate(${deg.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})`}>
            {label}
          </text>
        )
      })}
      {[17, 19, 21, 23, 25].map((v) => {
        const [x, y] = pt(v, G.r + 24)
        return <text key={v} x={x} y={y} fill="#64748b" fontSize={9} textAnchor="middle" dominantBaseline="middle">{v}</text>
      })}
      <Needle value={crash} color="#fb7185" />
      {projected !== null && <Needle value={projected} color="#22d3ee" />}
      <text x={G.cx} y={G.cy + 18} fill="#cbd5e1" fontSize={10} fontWeight={700} textAnchor="middle">FFMI · muscle per height²</text>
    </svg>
  )
}

export function CompositionGauge({ profile, crossing }: { profile: Profile; crossing: GoalCrossing | null }) {
  const goal = profile.goalWeightKg
  const crashKg = goal - 10
  const crashRaw = forbesPath(profile, crashKg)
  const crash = { ffm: half(crashRaw.ffmKg), fat: half(crashRaw.fatKg) }
  const band = targetBand(profile)
  const h = profile.heightCm
  const bodies: Body[] = [
    {
      key: 'crash', title: 'Crash diet', kg: crashKg, ffm: crash.ffm, fat: crash.fat,
      ffmText: `${f1(crash.ffm)} kg`, fatText: `${f1(crash.fat)} kg`,
      bfText: `${f1(pctOf(crash.fat, crashKg))}% BF`, ffmiText: f1(ffmi(crashRaw.ffmKg, h)),
      verdict: 'Depleted, narrow shoulders, "skinny-fat"', tone: 'rose',
    },
    {
      key: 'target', title: 'Power recomp', kg: goal, ffm: band.ffm[1], fat: band.fat[0],
      ffmText: `${f1(band.ffm[0])}–${f1(band.ffm[1])}`, fatText: `${f1(band.fat[0])}–${f1(band.fat[1])}`,
      bfText: `${f1(pctOf(band.fat[0], goal))}–${f1(pctOf(band.fat[1], goal))}%`,
      ffmiText: `${f1(ffmi(band.ffm[0], h))}–${f1(ffmi(band.ffm[1], h))}`,
      verdict: 'Thick, broad V-taper, full muscle (best case)', tone: 'emerald',
    },
  ]
  if (crossing) {
    bodies.push({
      key: 'you', title: 'Your projection', kg: goal, ffm: crossing.ffmKg, fat: crossing.fatKg,
      ffmText: `${f1(crossing.ffmKg)} kg`, fatText: `${f1(crossing.fatKg)} kg`,
      bfText: `${f1(crossing.bfPct)}% BF`, ffmiText: f1(ffmi(crossing.ffmKg, h)),
      verdict: `Model at your settings, week ${crossing.week}`, tone: 'cyan',
    })
  }
  const ffmGain = band.ffm[0] - crash.ffm

  return (
    <Card>
      <SectionTitle icon={Scale}>Why {goal} kg beats {crashKg} kg</SectionTitle>
      <div className={`grid gap-2 ${bodies.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {bodies.map((b) => <BodyColumn key={b.key} body={b} scaleKg={goal} />)}
      </div>
      <p className="mt-3 text-sm leading-snug text-slate-200">
        <b className="text-emerald-300">About the same fat. {f1(ffmGain)}–{f1(band.ffm[1] - crash.ffm)} kg more muscle, organ and glycogen.</b>{' '}
        The 10 kg heavier body is the leaner-looking one, at a lower body-fat %.
      </p>
      <div className="mt-3">
        <FfmiGauge crash={ffmi(crashRaw.ffmKg, h)} band={[ffmi(band.ffm[0], h), ffmi(band.ffm[1], h)]} projected={crossing ? ffmi(crossing.ffmKg, h) : null} />
        <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5"><span className="h-1 w-4 rounded bg-rose-400" />Crash {f1(ffmi(crashRaw.ffmKg, h))}</span>
          <span className="flex items-center gap-1.5"><span className="h-1 w-4 rounded bg-emerald-400" />Target {f1(ffmi(band.ffm[0], h))}–{f1(ffmi(band.ffm[1], h))} (≈ today)</span>
          {crossing && <span className="flex items-center gap-1.5"><span className="h-1 w-4 rounded bg-cyan-400" />You {f1(ffmi(crossing.ffmKg, h))}</span>}
        </div>
      </div>
      {crossing && (
        <p className="mt-3 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs leading-snug text-slate-400">
          Your projection keeps <b className="text-slate-200">{f1(crossing.ffmKg - crash.ffm)} kg more FFM</b> than the crash diet. Reaching the best-case band takes about 90%+ lean protection: every session done, protein hit, creatine daily, and some beginner muscle gain.
          A scan reads FFM 1–2 kg low while glycogen is depleted, even with no muscle lost.
        </p>
      )}
    </Card>
  )
}
