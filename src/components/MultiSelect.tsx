import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

export interface MsOption { value: string; label: string; hint?: string }

/** dropdown with a checkbox per option; `value` is the list of ticked option values (never empty) */
export function MultiSelect({ label, options, value, onChange, allLabel, noun }: {
  label: string; options: MsOption[]; value: string[]; onChange: (v: string[]) => void; allLabel: string; noun: string
}) {
  const [open, setOpen] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const all = value.length === options.length

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus() } }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  const toggle = (v: string) => {
    if (value.includes(v)) { if (value.length > 1) onChange(value.filter((x) => x !== v)) } // keep at least one
    else onChange(options.map((o) => o.value).filter((x) => x === v || value.includes(x)))
  }
  const summary = all ? allLabel : value.length === 1 ? options.find((o) => o.value === value[0])?.label ?? '' : `${value.length} ${noun}`

  return (
    <div className="relative" ref={wrap}>
      <button ref={btn} type="button" className="field flex !w-[250px] items-center justify-between gap-2 text-left" aria-haspopup="true" aria-expanded={open} aria-controls={panelId} aria-label={`${label}: ${summary}`} onClick={() => setOpen((o) => !o)}>
        <span className="truncate">{summary}</span>
        <ChevronDown size={16} className={`text-muted shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <div id={panelId} role="group" aria-label={label} className="absolute left-0 top-[calc(100%+6px)] z-20 w-[300px] rounded-[var(--radius-sm)] border border-[var(--border)] p-2" style={{ background: "var(--surface-solid)", boxShadow: "var(--shadow-hover)" }}>
          <label className="ms-row flex cursor-pointer items-center gap-3 rounded-[var(--radius-sm)] px-2 py-2 text-sm font-semibold hover:bg-[var(--hover-wash)]">
            <input type="checkbox" className="h-4 w-4 accent-[var(--primary-solid)]" checked={all} onChange={() => onChange(all ? [options[0].value] : options.map((o) => o.value))} />
            {allLabel}
          </label>
          <hr className="my-1 border-[var(--border)]" />
          <ul className="max-h-64 overflow-y-auto">
            {options.map((o) => (
              <li key={o.value}>
                <label className="flex cursor-pointer items-center gap-3 rounded-[var(--radius-sm)] px-2 py-2 text-sm hover:bg-[var(--hover-wash)]">
                  <input type="checkbox" className="h-4 w-4 accent-[var(--primary-solid)]" checked={value.includes(o.value)} disabled={value.length === 1 && value[0] === o.value} onChange={() => toggle(o.value)} />
                  <span className="min-w-0"><span className="block truncate font-medium">{o.label}</span>{o.hint && <span className="text-muted block truncate text-xs">{o.hint}</span>}</span>
                </label>
              </li>
            ))}
          </ul>
          <p className="text-muted px-2 pb-1 pt-2 text-xs">At least one {noun.replace(/s$/, '')} stays selected.</p>
        </div>
      )}
    </div>
  )
}
