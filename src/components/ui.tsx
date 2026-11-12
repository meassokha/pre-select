import { useEffect, useId, useRef, type ReactNode } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { ArrowDownRight, ArrowUpRight, X, type LucideIcon } from 'lucide-react'
import { ease, duration, hover, hoverTransition } from '../lib/motion'
import { useStore } from '../store'

export function Button({ children, variant = 'primary', onClick, disabled, icon: Icon, title, type = 'button', small, className = '' }: {
  children?: ReactNode; variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'blue'; onClick?: () => void; disabled?: boolean
  icon?: LucideIcon; title?: string; type?: 'button' | 'submit'; small?: boolean; className?: string
}) {
  return (
    <motion.button type={type} onClick={onClick} disabled={disabled} title={title}
      whileHover={disabled ? undefined : hover.button} whileFocus={disabled ? undefined : hover.button} whileTap={disabled ? undefined : hover.tap} transition={hoverTransition}
      className={`btn btn-${variant} inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] text-sm ${small ? 'h-8 px-3 text-[13px]' : 'h-10 px-4'} ${className}`}>
      {Icon && <Icon size={small ? 15 : 17} aria-hidden />}
      {children}
    </motion.button>
  )
}

export function IconButton({ icon: Icon, label, onClick, disabled, danger }: { icon: LucideIcon; label: string; onClick?: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <motion.button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
      whileHover={disabled ? undefined : hover.button} whileTap={disabled ? undefined : hover.tap} transition={hoverTransition}
      className={`icon-btn grid size-9 place-items-center rounded-[var(--radius-sm)] ${danger ? 'hover:!text-[var(--danger)]' : ''}`}>
      <Icon size={18} aria-hidden />
    </motion.button>
  )
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted mt-1 max-w-3xl text-[15px]">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Panel({ title, action, children, className = '', flat, sub }: { title?: string; sub?: string; action?: ReactNode; children: ReactNode; className?: string; flat?: boolean }) {
  return (
    <section className={`card ${flat ? 'card-flat' : ''} @container flex flex-col p-5 ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[15.5px] font-bold">{title}</h2>
            {sub && <p className="text-muted mt-0.5 text-[13px]">{sub}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

export function Pill({ tone = 'grey', children }: { tone?: 'success' | 'warning' | 'danger' | 'blue' | 'grey'; children: ReactNode }) {
  return <span className={`pill pill-${tone}`}>{children}</span>
}
export const statusTone = (s: string) => (s === 'Active' ? 'success' : s === 'Paused' || s === 'Invited' || s.startsWith('Pending') ? 'warning' : s === 'Rejected' ? 'danger' : s === 'Draft' ? 'blue' : 'grey') as 'success' | 'warning' | 'danger' | 'blue' | 'grey'

export function Field({ label, required, hint, error, children, className = '' }: { label: string; required?: boolean; hint?: ReactNode; error?: string; children: (id: string) => ReactNode; className?: string }) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="label">{label}{required && <span className="text-danger"> *</span>}</label>
      {children(id)}
      {hint && !error && <p className="hint mt-1">{hint}</p>}
      {error && <p className="err" role="alert">{error}</p>}
    </div>
  )
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
      className={`toggle relative box-border h-[24px] w-[44px] shrink-0 rounded-full p-0 ${checked ? 'toggle-on' : ''}`}>
      <motion.span initial={false} animate={{ x: checked ? 22 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 32 }} className="toggle-knob absolute left-0 top-[2px] block size-[18px] rounded-full" />
    </button>
  )
}

export function Segmented<T extends string>({ value, options, onChange, label, id }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string; id: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="segmented relative inline-flex rounded-[var(--radius-sm)] p-1">
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className="relative z-10 h-8 rounded-[10px] px-3 text-[13px] font-semibold outline-none focus-visible:outline-2 focus-visible:outline-[var(--ring)]">
          {value === o.value && <motion.span layoutId={`seg-${id}`} className="segmented-active absolute inset-0 rounded-[inherit]" transition={{ type: 'spring', stiffness: 520, damping: 34 }} />}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  )
}

export function Modal({ open, onClose, title, children, footer, width = 560 }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; width?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose })
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current()
    window.addEventListener('keydown', onKey)
    // focus the first form field (not the Close button) once, when the dialog opens
    const t = setTimeout(() => ref.current?.querySelector<HTMLElement>('input,select,textarea')?.focus(), 0)
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(t) }
  }, [open])
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] grid place-items-center p-4">
          <motion.div className="scrim absolute inset-0" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div ref={ref} role="dialog" aria-modal="true" aria-label={title} style={{ width }} className="card relative flex max-h-[90dvh] max-w-full flex-col"
            initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 380, damping: 30 } }} exit={{ opacity: 0, y: 10, transition: { duration: 0.12 } }}>
            <header className="flex items-center justify-between px-6 pb-2 pt-5">
              <h2 className="text-lg font-bold">{title}</h2>
              <IconButton icon={X} label="Close" onClick={onClose} />
            </header>
            <div className="overflow-y-auto px-6 py-3">{children}</div>
            {footer && <footer className="flex justify-end gap-2 px-6 pb-5 pt-3">{footer}</footer>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export const Empty = ({ children }: { children: ReactNode }) => <div className="text-muted grid place-items-center rounded-[var(--radius-sm)] border border-dashed border-[var(--border-hover)] p-8 text-sm">{children}</div>

export function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const reduce = useReducedMotion()
  const mv = useMotionValue(reduce ? value : 0)
  const text = useTransform(mv, (v) => format(v))
  useEffect(() => {
    if (reduce) { mv.set(value); return }
    const c = animate(mv, value, { duration: duration.countUp, ease: ease.out })
    return () => c.stop()
  }, [value, reduce, mv])
  return <motion.span className="tabular-nums">{text}</motion.span>
}

export function KpiCard({ label, value, format, icon: Icon, delta, good = 'up', note }: { label: string; value: number; format: (n: number) => string; icon: LucideIcon; delta: number; good?: 'up' | 'down'; note?: string }) {
  const up = delta >= 0
  const Trend = up ? ArrowUpRight : ArrowDownRight
  const positive = up === (good === 'up')
  return (
    <motion.article tabIndex={0} aria-label={`${label}: ${format(value)}, ${up ? 'up' : 'down'} ${Math.abs(delta).toFixed(1)}%`}
      className="card card-interactive flex h-full flex-col gap-3 p-5 outline-none" initial="rest" animate="rest" whileHover="hover" whileFocus="hover"
      variants={{ rest: { y: 0 }, hover: hover.card }} transition={hoverTransition}>
      <div className="flex items-center justify-between">
        <span className="text-muted text-sm font-semibold">{label}</span>
        <motion.span className="kpi-icon grid size-10 place-items-center rounded-[var(--radius-sm)]" variants={{ rest: { scale: 1, rotate: 0 }, hover: hover.icon }} transition={hoverTransition}>
          <Icon size={20} aria-hidden />
        </motion.span>
      </div>
      <div className="text-3xl font-bold tracking-tight"><CountUp value={value} format={format} /></div>
      <div className="delta-chip inline-flex w-fit items-center gap-1.5 px-2.5 py-1 text-[13px]" data-trend={positive ? 'up' : 'down'}>
        <Trend size={15} aria-hidden className="delta-chip-value" />
        <span className="delta-chip-value font-bold tabular-nums"><span className="sr-only">{up ? 'Up' : 'Down'} </span>{Math.abs(delta).toFixed(1)}%</span>
        <span className="text-muted">{note ?? 'vs previous period'}</span>
      </div>
    </motion.article>
  )
}

export function ToastHost() {
  const t = useStore((s) => s.toast)
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[90] grid place-items-center px-4" aria-live="polite">
      <AnimatePresence>
        {t && (
          <motion.div key={t.id} className="tooltip px-4 py-2.5 text-sm font-semibold" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8, transition: { duration: 0.12 } }}>
            {t.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Both = amounts are set in USD and shown with the KHR equivalent at 1 USD = 4,000 KHR */
export const money = (n: number, cur: 'USD' | 'KHR' | 'Both' = 'USD') =>
  cur === 'KHR' ? `${Math.round(n).toLocaleString('en-US')} KHR` : cur === 'Both' ? `$${Math.round(n).toLocaleString('en-US')} / ${Math.round(n * 4000).toLocaleString('en-US')} KHR` : `$${Math.round(n).toLocaleString('en-US')}`

/* ---------- right-hand side page (slides in over the content) ---------- */
export function Drawer({ open, onClose, title, subtitle, children, footer, width = 680 }: { open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; width?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose })
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current()
    window.addEventListener('keydown', onKey)
    const t = setTimeout(() => ref.current?.querySelector<HTMLElement>('input,select,textarea')?.focus(), 150)
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(t) }
  }, [open])
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="scrim fixed inset-0 z-[55]" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} />
          <motion.aside ref={ref} role="dialog" aria-modal="true" aria-label={title} style={{ width }} className="drawer-panel fixed inset-y-0 right-0 z-[60] flex max-w-full flex-col"
            initial={{ x: '100%' }} animate={{ x: 0, transition: { type: 'spring', stiffness: 320, damping: 34 } }} exit={{ x: '100%', transition: { duration: 0.2, ease: [0.7, 0, 0.84, 0] } }}>
            <header className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-6 py-4">
              <div><h2 className="text-xl font-bold">{title}</h2>{subtitle && <p className="text-muted mt-0.5 text-[13.5px]">{subtitle}</p>}</div>
              <IconButton icon={X} label="Close" onClick={onClose} />
            </header>
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && <footer className="flex justify-end gap-2 border-t border-[var(--border)] px-6 py-4">{footer}</footer>}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
export const compact = (n: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
