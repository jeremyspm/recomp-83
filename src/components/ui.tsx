import { ChevronDown, Minus, Plus, type LucideIcon } from 'lucide-react'
import { useId, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'

type Tone = 'emerald' | 'amber' | 'cyan' | 'rose' | 'slate'

const CHIP: Record<Tone, string> = {
  emerald: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  amber: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  cyan: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
  rose: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
  slate: 'border-slate-700 bg-slate-800/80 text-slate-300',
}

const CARD_TONE: Record<Tone, string> = {
  emerald: 'border-emerald-500/30 bg-emerald-950/30',
  amber: 'border-amber-500/40 bg-amber-950/30',
  cyan: 'border-cyan-500/30 bg-cyan-950/20',
  rose: 'border-rose-500/40 bg-rose-950/30',
  slate: 'border-slate-800 bg-slate-900/70',
}

const BAR: Record<Tone, string> = {
  emerald: 'bg-emerald-400',
  amber: 'bg-amber-400',
  cyan: 'bg-cyan-400',
  rose: 'bg-rose-400',
  slate: 'bg-slate-500',
}

export function Card({ children, tone = 'slate', className = '' }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <section className={`rounded-2xl border p-4 max-[359px]:p-3 ${CARD_TONE[tone]} ${className}`}>{children}</section>
}

export function SectionTitle({ icon: Icon, children, right }: { icon?: LucideIcon; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="flex min-w-0 items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        {Icon && <Icon className="size-4 shrink-0 text-slate-500" aria-hidden />}
        <span className="truncate">{children}</span>
      </h2>
      {right}
    </div>
  )
}

export function Chip({ tone = 'slate', children, className = '' }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${CHIP[tone]} ${className}`}>
      {children}
    </span>
  )
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'amber' | 'danger'
const BUTTON: Record<ButtonVariant, string> = {
  primary: 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-400',
  secondary: 'border border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700 disabled:opacity-50',
  ghost: 'text-slate-300 hover:bg-slate-800 disabled:opacity-50',
  amber: 'border border-amber-500/50 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 disabled:opacity-50',
  danger: 'border border-rose-500/50 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25 disabled:opacity-50',
}

export function Button({
  variant = 'secondary',
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition active:scale-[0.98] disabled:active:scale-100 ${BUTTON[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  disabled = false,
}: {
  options: { value: T; label: ReactNode; sub?: ReactNode }[]
  value: T
  onChange: (v: T) => void
  label: string
  disabled?: boolean
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-1 rounded-xl border border-slate-800 bg-slate-950 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={`min-h-11 rounded-lg px-2 py-1.5 text-sm font-semibold transition disabled:opacity-60 ${
              active ? 'bg-slate-800 text-emerald-300 shadow-inner shadow-black/40 ring-1 ring-emerald-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="block leading-tight">{o.label}</span>
            {o.sub && <span className="mt-0.5 block text-[11px] font-medium leading-tight text-slate-500">{o.sub}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; description?: ReactNode }) {
  const id = useId()
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block text-sm font-semibold text-slate-100">{label}</label>
        {description && <p className="mt-0.5 text-xs text-slate-400">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 rounded-full border transition ${checked ? 'border-emerald-400 bg-emerald-500/80' : 'border-slate-600 bg-slate-800'}`}
      >
        <span className={`absolute top-1 size-6 rounded-full bg-white shadow transition-all ${checked ? 'left-7' : 'left-1'}`} />
      </button>
    </div>
  )
}

/** Numeric field with big −/+ buttons. Accepts decimals; null means empty. */
export function Stepper({
  value,
  onChange,
  step,
  min = 0,
  max = 999,
  decimal = false,
  label,
  unit,
  highlight = false,
  placeholder,
  compact = false,
}: {
  value: number | null
  onChange: (v: number | null) => void
  step: number
  min?: number
  max?: number
  decimal?: boolean
  label: string
  unit?: string
  highlight?: boolean
  placeholder?: string
  /** Narrower ± buttons for tight rows (workout sets). */
  compact?: boolean
}) {
  const btn = compact ? 'w-8 max-[359px]:w-7' : 'w-10'
  const [draft, setDraft] = useState<string | null>(null)
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 100) / 100))
  const shown = draft ?? (value === null ? '' : String(Math.round(value * 100) / 100))
  const bump = (dir: 1 | -1) => {
    setDraft(null)
    onChange(clamp((value ?? (dir > 0 ? min : step)) + dir * step))
  }
  return (
    <div className={`flex h-12 min-w-0 items-stretch overflow-hidden rounded-xl border bg-slate-950 ${highlight ? 'border-emerald-400 ring-2 ring-emerald-500/30' : 'border-slate-700'}`}>
      <button type="button" onClick={() => bump(-1)} className={`grid ${btn} shrink-0 place-items-center text-slate-300 active:bg-slate-800`} aria-label={`Decrease ${label}`}>
        <Minus className="size-4" aria-hidden />
      </button>
      <label className="flex min-w-0 flex-1 items-center justify-center gap-1">
        <span className="sr-only">{label}</span>
        <input
          inputMode={decimal || step % 1 !== 0 ? 'decimal' : 'numeric'}
          value={shown}
          placeholder={placeholder}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => {
            const text = e.target.value.replace(',', '.')
            setDraft(text)
            if (text.trim() === '') onChange(null)
            else if (!Number.isNaN(Number(text))) onChange(clamp(Number(text)))
          }}
          onBlur={() => setDraft(null)}
          className={`w-full min-w-0 bg-transparent text-center text-lg font-bold tabular-nums outline-none placeholder:text-slate-600 max-[359px]:text-base ${highlight ? 'text-emerald-300' : 'text-slate-100'}`}
        />
        {unit && <span className="shrink-0 pr-1 text-xs text-slate-500">{unit}</span>}
      </label>
      <button type="button" onClick={() => bump(1)} className={`grid ${btn} shrink-0 place-items-center text-slate-300 active:bg-slate-800`} aria-label={`Increase ${label}`}>
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  )
}

export function Stat({ label, value, unit, sub, tone = 'slate' }: { label: string; value: ReactNode; unit?: string; sub?: ReactNode; tone?: Tone }) {
  const valueTone = tone === 'slate' ? 'text-slate-50' : CHIP[tone].split(' ').find((c) => c.startsWith('text-'))
  return (
    <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5">
      <div className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className={`mt-0.5 flex items-baseline gap-1 ${valueTone}`}>
        <span className="text-2xl font-bold tabular-nums leading-tight">{value}</span>
        {unit && <span className="text-xs font-medium text-slate-500">{unit}</span>}
      </div>
      {sub && <div className="mt-0.5 truncate text-xs text-slate-400">{sub}</div>}
    </div>
  )
}

export function ProgressBar({ value, max, tone = 'emerald', label }: { value: number; max: number; tone?: Tone; label?: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(value)}>
      <div className={`h-full rounded-full transition-[width] duration-300 ${BAR[tone]}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Disclosure({ title, children, defaultOpen = false, icon: Icon }: { title: ReactNode; children: ReactNode; defaultOpen?: boolean; icon?: LucideIcon }) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-slate-200"
      >
        {Icon && <Icon className="size-4 shrink-0 text-slate-500" aria-hidden />}
        <span className="flex-1">{title}</span>
        <ChevronDown className={`size-4 shrink-0 text-slate-500 transition ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && <div id={id} className="border-t border-slate-800 px-3 py-3 text-sm text-slate-300">{children}</div>}
    </div>
  )
}
