import { ArrowRight, CheckCircle2, Clock, XCircle } from 'lucide-react'
import type { Approval, Status } from '../data/types'

export const isPending = (s: Status) => s === 'Pending Line Manager' || s === 'Pending CPO'
export const submitter = (trail: Approval[]) => [...trail].reverse().find((t) => t.decision === 'submitted')?.by ?? ''

/** one-line explanation of where an item is in the approval flow, shown on cards */
export function StageNote({ status, trail }: { status: Status; trail: Approval[] }) {
  if (isPending(status)) {
    return <p className="text-muted flex items-center gap-1.5 text-xs"><Clock size={13} aria-hidden /> Waiting for {status === 'Pending CPO' ? 'CPO (level 2)' : 'Line Manager (level 1)'} · submitted by {submitter(trail)}</p>
  }
  if (status === 'Rejected') {
    const r = [...trail].reverse().find((t) => t.decision === 'rejected')
    return <p className="text-danger flex items-start gap-1.5 text-xs"><XCircle size={13} className="mt-0.5 shrink-0" aria-hidden /> Rejected by {r?.by}{r?.note ? `: ${r.note}` : ''}. Edit and submit again.</p>
  }
  return null
}

const STEPS = [
  { title: 'Product Manager', text: 'Creates the program or pre-select and submits it' },
  { title: 'Level 1: Line Manager', text: 'Reviews the setup and approves or rejects' },
  { title: 'Level 2: CPO', text: 'Chief Product Officer gives the final approval' },
  { title: 'Active', text: 'Program or pre-select goes live' },
]

export function ApprovalFlow() {
  return (
    <ol className="grid gap-3 md:grid-cols-4" aria-label="Approval flow">
      {STEPS.map((s, i) => (
        <li key={s.title} className="card card-flat relative flex flex-col gap-1 p-3">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-[var(--primary-soft)] text-xs font-bold text-[var(--primary)]">{i === 3 ? <CheckCircle2 size={14} aria-hidden /> : i + 1}</span>
            <span className="text-[13px] font-bold">{s.title}</span>
            {i < 3 && <ArrowRight size={14} className="text-muted ml-auto hidden md:block" aria-hidden />}
          </div>
          <p className="text-muted text-[12.5px]">{s.text}</p>
        </li>
      ))}
    </ol>
  )
}

export const STEP_LABEL: Record<Approval['step'], string> = { submitted: 'Submitted', l1: 'Line Manager', l2: 'CPO' }
