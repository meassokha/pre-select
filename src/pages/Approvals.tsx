import { useState } from 'react'
import { motion } from 'motion/react'
import { Check, X } from 'lucide-react'
import { ApprovalFlow, STEP_LABEL, isPending, submitter } from '../components/Approval'
import { Button, Empty, Field, Modal, PageHeader, Panel, Pill, statusTone } from '../components/ui'
import type { Approval, Status } from '../data/types'
import { useCan, useStore } from '../store'

interface Item { kind: 'program' | 'preselect'; id: string; name: string; sub: string; status: Status; trail: Approval[] }

export function Approvals() {
  const programs = useStore((s) => s.programs)
  const preselects = useStore((s) => s.preselects)
  const workflow = useStore((s) => s.workflow)
  const notify = useStore((s) => s.notify)
  const me = useStore((s) => s.users.find((u) => u.id === s.meId))
  const can = useCan()
  const [rej, setRej] = useState<Item | null>(null)
  const [note, setNote] = useState('')
  const [noteErr, setNoteErr] = useState('')

  const items: Item[] = [
    ...programs.map((p) => ({ kind: 'program' as const, id: p.id, name: p.name, sub: `${p.code} · ${p.productType} / ${p.subType}`, status: p.status, trail: p.trail })),
    ...preselects.map((p) => ({ kind: 'preselect' as const, id: p.id, name: p.name, sub: programs.filter((x) => p.programIds.includes(x.id)).map((x) => x.name).join(', '), status: p.status, trail: p.trail })),
  ]
  const pending = items.filter((i) => isPending(i.status))
  const rejected = items.filter((i) => i.status === 'Rejected')
  const mine = pending.filter((i) => can('approvals', i.status === 'Pending CPO' ? 'approve2' : 'approve')).length

  const blocked = (i: Item) => {
    const need = i.status === 'Pending CPO' ? 'approve2' : 'approve'
    if (!can('approvals', need)) return i.status === 'Pending CPO' ? 'Only the CPO can approve at level 2' : 'Only a Line Manager can approve at level 1'
    if (submitter(i.trail) === me?.name) return 'You cannot approve something you submitted'
    return ''
  }
  const approve = (i: Item) => {
    workflow(i.kind, i.id, 'approve', me?.name ?? '')
    notify(i.status === 'Pending CPO' ? `${i.name} approved and is now Active` : `${i.name} approved, now waiting for the CPO`)
  }
  const confirmReject = () => {
    if (!rej) return
    if (!note.trim()) { setNoteErr('Give the requester a reason'); return }
    workflow(rej.kind, rej.id, 'reject', me?.name ?? '', note.trim())
    notify(`${rej.name} rejected and sent back`)
    setRej(null)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.1 } }}>
      <PageHeader title="Approvals" subtitle="New lending programs and pre-select customer groups need two approvals before they go live: the Line Manager first, then the Chief Product Officer (CPO)." />
      <div className="mb-5"><ApprovalFlow /></div>

      <Panel title={`Waiting for approval (${pending.length})`} sub={mine ? `${mine} waiting for your role.` : 'Nothing is waiting for your role. Switch "Viewing as" to Line Manager or CPO to try the approvals.'}>
        {pending.length === 0 ? <Empty>No requests are waiting.</Empty> : (
          <ul className="flex flex-col gap-3">
            {pending.map((i) => {
              const why = blocked(i)
              return (
                <li key={`${i.kind}-${i.id}`} className="card card-flat flex flex-wrap items-start gap-4 p-4">
                  <div className="min-w-[240px] flex-1">
                    <div className="flex flex-wrap items-center gap-2"><Pill tone="grey">{i.kind === 'program' ? 'Lending program' : 'Pre-select'}</Pill><span className="font-bold">{i.name}</span></div>
                    <p className="text-muted mt-0.5 text-xs">{i.sub}</p>
                    <ol className="text-muted mt-2 flex flex-col gap-0.5 text-[12.5px]">
                      {i.trail.map((t, k) => <li key={k}>{t.decision === 'submitted' ? 'Submitted by' : `${STEP_LABEL[t.step]} ${t.decision}:`} {t.by} · {t.at}{t.note ? ` ("${t.note}")` : ''}</li>)}
                    </ol>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Pill tone="warning">{i.status === 'Pending CPO' ? 'Waiting for CPO (level 2)' : 'Waiting for Line Manager (level 1)'}</Pill>
                    <div className="flex gap-2">
                      <Button small variant="secondary" icon={X} disabled={!!why} title={why || undefined} onClick={() => { setRej(i); setNote(''); setNoteErr('') }}>Reject</Button>
                      <Button small icon={Check} disabled={!!why} title={why || undefined} onClick={() => approve(i)}>{i.status === 'Pending CPO' ? 'Approve (final)' : 'Approve'}</Button>
                    </div>
                    {why && <p className="text-muted max-w-[260px] text-right text-[12px]">{why}</p>}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      <div className="mt-5">
        <Panel title={`Rejected (${rejected.length})`} sub="Sent back to the Product Manager. Edit and submit again from Product configuration or Pre-select.">
          {rejected.length === 0 ? <Empty>No rejected requests.</Empty> : (
            <ul className="flex flex-col gap-3">
              {rejected.map((i) => {
                const r = [...i.trail].reverse().find((t) => t.decision === 'rejected')
                return (
                  <li key={`${i.kind}-${i.id}`} className="card card-flat flex flex-wrap items-center justify-between gap-3 p-4">
                    <div><div className="flex flex-wrap items-center gap-2"><Pill tone="grey">{i.kind === 'program' ? 'Lending program' : 'Pre-select'}</Pill><span className="font-bold">{i.name}</span></div><p className="text-muted mt-0.5 text-xs">{i.sub}</p></div>
                    <div className="text-sm"><Pill tone={statusTone(i.status)}>{i.status}</Pill><p className="text-muted mt-1 text-[12.5px]">{STEP_LABEL[r?.step ?? 'l1']} {r?.by}: {r?.note}</p></div>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>

      <Modal open={!!rej} onClose={() => setRej(null)} title={`Reject "${rej?.name ?? ''}"`} width={480}
        footer={<><Button variant="secondary" onClick={() => setRej(null)}>Cancel</Button><Button variant="danger" onClick={confirmReject}>Reject and send back</Button></>}>
        <Field label="Reason" required error={noteErr} hint="The Product Manager sees this note.">{(id) => <textarea id={id} className="field !h-24 py-2" autoFocus value={note} onChange={(e) => setNote(e.target.value)} />}</Field>
      </Modal>
    </motion.div>
  )
}
