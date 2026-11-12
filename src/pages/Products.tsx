import { useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { ArrowLeft, CheckCircle2, Pause, Pencil, Play, Plus, Send, Trash2 } from 'lucide-react'
import { StageNote, isPending } from '../components/Approval'
import { Button, Empty, Field, IconButton, PageHeader, Pill, Segmented, Toggle, money, statusTone } from '../components/ui'
import { KHR_RATE, PRODUCT_TYPES, SUB_TYPES, repayOptions } from '../data/seed'
import type { Program } from '../data/types'
import { rise, stagger } from '../lib/motion'
import { today, uid, useCan, useStore } from '../store'

const blank = (): Program => ({
  id: uid('p'), code: '', name: '', productType: 'Unsecured Loan', subType: 'Personal Loan', currency: 'USD', amountBasis: 'loan', minAmt: 100, maxAmt: 1000, minTenor: 3, maxTenor: 12,
  rate: 18, rateFlexible: false, trail: [], fee: 1, feeFlexible: false, repay: 'Equal Monthly installment (EMI)', earlyRepay: true, earlyFee: 1, lateFee: 27, graceDays: 4, defaultRate: 18, insurance: false, insuranceRate: 0.5, insurancePeriod: 'upfront', insuranceBasis: 'original', status: 'Draft', created: today(),
})
const khr = (usd: number) => `${Math.round(usd * KHR_RATE).toLocaleString('en-US')} KHR`

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="form-section"><h3>{title}</h3><div className="card card-flat grid gap-4 p-4 sm:grid-cols-2">{children}</div></section>
}

export function Products() {
  const programs = useStore((s) => s.programs)
  const save = useStore((s) => s.saveProgram)
  const patch = useStore((s) => s.patchProgram)
  const workflow = useStore((s) => s.workflow)
  const me = useStore((s) => s.users.find((u) => u.id === s.meId))
  const remove = useStore((s) => s.removeProgram)
  const notify = useStore((s) => s.notify)
  const preselects = useStore((s) => s.preselects)
  const can = useCan()
  const [draft, setDraft] = useState<Program | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState<'All' | 'Pending' | Program['status']>('All')

  const set = <K extends keyof Program>(k: K, v: Program[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d))
  const withSub = (d: Program, productType: string, subType: string): Program => {
    const opts = repayOptions(subType)
    return { ...d, productType, subType, repay: opts.includes(d.repay) ? d.repay : opts[0] }
  }
  const setProductType = (t: string) => setDraft((d) => (d ? withSub(d, t, SUB_TYPES[t].includes(d.subType) ? d.subType : SUB_TYPES[t][0]) : d))
  const setSubType = (v: string) => setDraft((d) => (d ? withSub(d, d.productType, v) : d))
  const open = (p: Program | null) => { window.scrollTo(0, 0); setErrs({}); setIsNew(!p); setDraft(p ? { ...p } : blank()) }
  const submit = () => {
    if (!draft) return
    const e: Record<string, string> = {}
    if (!draft.name.trim()) e.name = 'Program name is required'
    if (!draft.code.trim()) e.code = 'Program code is required'
    else if (programs.some((p) => p.code.toLowerCase() === draft.code.trim().toLowerCase() && p.id !== draft.id)) e.code = 'This code is already used'
    if (draft.minAmt <= 0 || draft.maxAmt < draft.minAmt) e.amt = 'Max amount must be at least the min amount'
    if (draft.minTenor <= 0 || draft.maxTenor < draft.minTenor) e.tenor = 'Max tenor must be at least the min tenor'
    if (!draft.rateFlexible && (draft.rate < 0 || draft.rate > 100)) e.rate = 'Rate must be between 0 and 100'
    if (!draft.rateFlexible && draft.defaultRate < draft.rate) e.defaultRate = 'Default rate should not be lower than the normal rate'
    if (draft.insurance && draft.insuranceRate <= 0) e.insuranceRate = 'Enter the insurance rate'
    setErrs(e)
    if (Object.keys(e).length) { notify('Fix the highlighted fields first'); return }
    const reapprove = !isNew && draft.status === 'Active'
    save({ ...draft, status: reapprove ? 'Draft' : draft.status, code: draft.code.trim().toUpperCase(), name: draft.name.trim() })
    notify(isNew ? `Lending program "${draft.name}" created as Draft` : reapprove ? 'Updated and set back to Draft. Submit it for approval again.' : 'Lending program updated')
    setDraft(null)
  }
  const list = programs.filter((p) => filter === 'All' || (filter === 'Pending' ? isPending(p.status) : p.status === filter))
  const num = (v: string) => (v === '' ? 0 : Number(v))
  const cur = draft?.currency
  const amtUnit = cur === 'KHR' ? 'KHR' : 'USD'

  return (
    <>
      {!draft && <>
      <PageHeader title="Product configuration" subtitle="Create and manage lending programs: type, limits, pricing, repayment rules and insurance. Pre-select rules attach to a program."
        action={<Button icon={Plus} disabled={!can('products', 'create')} onClick={() => open(null)} title={can('products', 'create') ? undefined : 'Your role cannot create programs'}>New lending program</Button>} />

      <div className="mb-4"><Segmented id="pfilter" label="Filter by status" value={filter} onChange={setFilter} options={(['All', 'Active', 'Draft', 'Pending', 'Rejected', 'Paused', 'Retired'] as const).map((v) => ({ value: v, label: v }))} /></div>

      {list.length === 0 ? <Empty>No programs with this status.</Empty> : (
        <motion.div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" initial="hidden" animate="show" variants={stagger} key={filter}>
          {list.map((p) => {
            const rules = preselects.filter((x) => x.programIds.includes(p.id)).length
            return (
              <motion.div key={p.id} variants={rise} className="h-full">
                <motion.article whileHover={{ y: -3 }} className="card card-interactive flex h-full flex-col gap-4 p-5">
                  <header className="flex items-start justify-between gap-3">
                    <div><h2 className="text-[16px] font-bold">{p.name}</h2><p className="text-muted text-xs">{p.code} · {p.productType} / {p.subType}</p></div>
                    <Pill tone={statusTone(p.status)}>{p.status}</Pill>
                  </header>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div className="profile-fact col-span-2 rounded-[var(--radius-sm)] p-3"><dt className="text-muted text-xs">{p.amountBasis === 'cash' ? 'Cash on hand' : 'Loan amount'} ({p.currency})</dt><dd className="font-bold tabular-nums">{money(p.minAmt, p.currency)} - {money(p.maxAmt, p.currency)}</dd></div>
                    <div className="profile-fact rounded-[var(--radius-sm)] p-3"><dt className="text-muted text-xs">Tenor</dt><dd className="font-bold tabular-nums">{p.minTenor === p.maxTenor ? `${p.minTenor} mo` : `${p.minTenor} - ${p.maxTenor} mo`}</dd></div>
                    <div className="profile-fact rounded-[var(--radius-sm)] p-3"><dt className="text-muted text-xs">Interest / fee</dt><dd className="font-bold tabular-nums">{p.rateFlexible ? 'Flexible' : `${p.rate}% p.a.`} · {p.feeFlexible ? 'Flexible' : `${p.fee}%`}</dd></div>
                    <div className="profile-fact rounded-[var(--radius-sm)] p-3"><dt className="text-muted text-xs">Early repayment</dt><dd className="font-bold">{p.earlyRepay ? `Allowed (${p.earlyFee}% fee)` : 'Not allowed'}</dd></div>
                    <div className="profile-fact rounded-[var(--radius-sm)] p-3"><dt className="text-muted text-xs">Insurance</dt><dd className="font-bold">{p.insurance ? `${p.insuranceRate}% ${p.insurancePeriod === 'upfront' ? 'one-time' : p.insurancePeriod === 'monthly' ? 'monthly' : 'yearly'} · ${p.insuranceBasis === 'declining' ? 'declining' : 'flat'}` : 'None'}</dd></div>
                  </dl>
                  <StageNote status={p.status} trail={p.trail} />
                  <footer className="mt-auto flex items-center justify-between gap-2 pt-1">
                    <span className="text-muted text-xs">{rules} pre-select rule set{rules === 1 ? '' : 's'} · {p.created}</span>
                    <div className="flex gap-1">
                      {(p.status === 'Draft' || p.status === 'Rejected') && <IconButton icon={Send} label="Submit for approval" disabled={!can('products', 'edit')} onClick={() => { workflow('program', p.id, 'submit', me?.name ?? ''); notify(`${p.name} sent to the Line Manager for approval`) }} />}
                      {p.status === 'Paused' && <IconButton icon={Play} label="Resume program" disabled={!can('approvals', 'approve2')} onClick={() => { patch(p.id, { status: 'Active' }); notify(`${p.name} resumed`) }} />}
                      {p.status === 'Active' && <IconButton icon={Pause} label="Pause program" disabled={!can('approvals', 'approve2')} onClick={() => { patch(p.id, { status: 'Paused' }); notify(`${p.name} paused`) }} />}
                      <IconButton icon={Pencil} label="Edit program" disabled={!can('products', 'edit') || isPending(p.status)} onClick={() => open(p)} />
                      <IconButton icon={Trash2} danger label="Delete program" disabled={!can('products', 'delete') || p.status === 'Active' || isPending(p.status)} onClick={() => { if (window.confirm(`Delete "${p.name}"?`)) { remove(p.id); notify('Program deleted') } }} />
                    </div>
                  </footer>
                </motion.article>
              </motion.div>
            )
          })}
        </motion.div>
      )}
      <p className="hint mt-4">A new program starts as Draft. Submit it for approval: the Line Manager approves first, then the CPO, and only then it goes Active (see the Approvals page). Pausing or resuming an active program is a CPO action.</p>

      </>}

      {draft && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <button type="button" onClick={() => setDraft(null)} className="text-muted mb-3 inline-flex items-center gap-1.5 text-sm font-semibold hover:text-[var(--fg)]"><ArrowLeft size={16} aria-hidden /> Back to product configuration</button>
          <PageHeader title={isNew ? 'New lending program' : 'Edit lending program'} subtitle="New programs start as Draft. After saving, submit it for approval (Line Manager, then CPO)."
            action={<div className="flex gap-2"><Button variant="secondary" onClick={() => setDraft(null)}>Cancel</Button><Button icon={CheckCircle2} onClick={submit}>{isNew ? 'Create program' : 'Save changes'}</Button></div>} />
          <div className="max-w-4xl">
            <Section title="1. Product">
              <Field label="Program name" required error={errs.name}>{(id) => <input id={id} autoFocus={isNew} className="field" aria-invalid={!!errs.name} value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Salary Advance" />}</Field>
              <Field label="Program code" required error={errs.code} hint="Unique, shown in reports">{(id) => <input id={id} className="field uppercase" aria-invalid={!!errs.code} value={draft.code} onChange={(e) => set('code', e.target.value)} placeholder="SAL-ADV" />}</Field>
              <Field label="Product type">{(id) => <select id={id} className="field" value={draft.productType} onChange={(e) => setProductType(e.target.value)}>{PRODUCT_TYPES.map((t) => <option key={t}>{t}</option>)}</select>}</Field>
              <Field label="Sub product type" hint={`${SUB_TYPES[draft.productType].length} options for ${draft.productType}`}>{(id) => <select id={id} className="field" value={draft.subType} onChange={(e) => setSubType(e.target.value)}>{SUB_TYPES[draft.productType].map((t) => <option key={t}>{t}</option>)}</select>}</Field>
              <Field label="Currency" className="sm:col-span-2">{(id) => <select id={id} className="field" value={draft.currency} onChange={(e) => set('currency', e.target.value as Program['currency'])}><option value="USD">USD</option><option value="KHR">KHR</option><option value="Both">Both (USD and KHR)</option></select>}</Field>
            </Section>

            <Section title="2. Amount and tenor">
              <fieldset className="sm:col-span-2">
                <legend className="mb-1.5 text-sm font-semibold">Amount basis</legend>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {([['loan', 'Loan amount'], ['cash', 'Cash on hand']] as const).map(([v, l]) => (
                    <label key={v} className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium">
                      <input type="radio" name="amountBasis" value={v} checked={draft.amountBasis === v} onChange={() => set('amountBasis', v)} className="h-4 w-4 accent-[var(--primary-solid)]" />{l}
                    </label>
                  ))}
                </div>
                <p className="hint mt-1.5">{draft.amountBasis === 'loan' ? 'Limits apply to the approved loan amount (principal).' : 'Limits apply to the cash the customer receives in hand, after fees and insurance are deducted.'}</p>
              </fieldset>
              {cur === 'Both' && <p className="hint sm:col-span-2">Both currencies: set the limit in USD. The KHR limit is calculated at 1 USD = {KHR_RATE.toLocaleString('en-US')} KHR.</p>}
              <Field label={`Min ${draft.amountBasis === 'loan' ? 'loan amount' : 'cash on hand'} (${amtUnit})`} error={errs.amt} hint={cur === 'Both' ? `= ${khr(draft.minAmt)}` : undefined}>{(id) => <input id={id} type="number" min={0} className="field" aria-invalid={!!errs.amt} value={draft.minAmt} onChange={(e) => set('minAmt', num(e.target.value))} />}</Field>
              <Field label={`Max ${draft.amountBasis === 'loan' ? 'loan amount' : 'cash on hand'} (${amtUnit})`} hint={cur === 'Both' ? `= ${khr(draft.maxAmt)}` : undefined}>{(id) => <input id={id} type="number" min={0} className="field" value={draft.maxAmt} onChange={(e) => set('maxAmt', num(e.target.value))} />}</Field>
              <Field label="Min tenor (months)" error={errs.tenor}>{(id) => <input id={id} type="number" min={1} className="field" aria-invalid={!!errs.tenor} value={draft.minTenor} onChange={(e) => set('minTenor', num(e.target.value))} />}</Field>
              <Field label="Max tenor (months)">{(id) => <input id={id} type="number" min={1} className="field" value={draft.maxTenor} onChange={(e) => set('maxTenor', num(e.target.value))} />}</Field>
            </Section>

            <Section title="3. Pricing">
              <Field label="Interest rate (% per year)" error={errs.rate} hint={draft.rateFlexible ? 'No fixed rate. The front-end sets it per customer (e.g. by income or CBC score).' : undefined}>{(id) => <div className="flex items-center gap-3"><input id={id} type="number" min={0} step={0.5} className="field min-w-0 flex-1" disabled={draft.rateFlexible} aria-invalid={!!errs.rate} value={draft.rateFlexible ? '' : draft.rate} placeholder={draft.rateFlexible ? 'Flexible' : undefined} onChange={(e) => set('rate', num(e.target.value))} /><label className="inline-flex shrink-0 cursor-pointer items-center gap-2 text-sm font-medium"><input type="checkbox" className="h-4 w-4 accent-[var(--primary-solid)]" checked={draft.rateFlexible} onChange={(e) => set('rateFlexible', e.target.checked)} />Flexible</label></div>}</Field>
              <Field label="Default interest rate (% per year)" error={errs.defaultRate} hint="Applied to overdue amounts">{(id) => <input id={id} type="number" min={0} step={0.5} className="field" aria-invalid={!!errs.defaultRate} value={draft.defaultRate} onChange={(e) => set('defaultRate', num(e.target.value))} />}</Field>
              <Field label="Processing fee (%)" hint={draft.feeFlexible ? 'No fixed fee. Set by the front-end per customer.' : undefined}>{(id) => <div className="flex items-center gap-3"><input id={id} type="number" min={0} step={0.1} className="field min-w-0 flex-1" disabled={draft.feeFlexible} value={draft.feeFlexible ? '' : draft.fee} placeholder={draft.feeFlexible ? 'Flexible' : undefined} onChange={(e) => set('fee', num(e.target.value))} /><label className="inline-flex shrink-0 cursor-pointer items-center gap-2 text-sm font-medium"><input type="checkbox" className="h-4 w-4 accent-[var(--primary-solid)]" checked={draft.feeFlexible} onChange={(e) => set('feeFlexible', e.target.checked)} />Flexible</label></div>}</Field>
              <Field label="Repayment method">{(id) => <select id={id} className="field" value={draft.repay} onChange={(e) => set('repay', e.target.value)}>{repayOptions(draft.subType).map((t) => <option key={t}>{t}</option>)}</select>}</Field>
            </Section>

            <Section title="4. Repayment rules">
              <div className="flex items-center justify-between gap-3 sm:col-span-2">
                <div><div className="text-[13px] font-semibold">Early repayment</div><div className="text-muted text-[12.5px]">{draft.earlyRepay ? 'Customers may repay before maturity' : 'Customers cannot repay before maturity'}</div></div>
                <Toggle label="Early repayment allowed" checked={draft.earlyRepay} onChange={(v) => set('earlyRepay', v)} />
              </div>
              {draft.earlyRepay && <Field label="Early repayment fee (% of outstanding principal)" className="sm:col-span-2">{(id) => <input id={id} type="number" min={0} step={0.1} className="field" value={draft.earlyFee} onChange={(e) => set('earlyFee', num(e.target.value))} />}</Field>}
              <Field label="Late repayment penalty fee (% per year on overdue amount)">{(id) => <input id={id} type="number" min={0} step={0.5} className="field" value={draft.lateFee} onChange={(e) => set('lateFee', num(e.target.value))} />}</Field>
              <Field label="Grace period (days)" hint="No penalty during these days after the due date">{(id) => <input id={id} type="number" min={0} className="field" value={draft.graceDays} onChange={(e) => set('graceDays', num(e.target.value))} />}</Field>
            </Section>

            <Section title="5. Insurance">
              <div className="flex items-center justify-between gap-3 sm:col-span-2">
                <div><div className="text-[13px] font-semibold">Loan insurance</div><div className="text-muted text-[12.5px]">{draft.insurance ? 'Insurance is charged on this program' : 'No insurance on this program'}</div></div>
                <Toggle label="Insurance included" checked={draft.insurance} onChange={(v) => set('insurance', v)} />
              </div>
              {draft.insurance && <>
                <Field label="Insurance premium (%)" error={errs.insuranceRate}>{(id) => <input id={id} type="number" min={0} step={0.05} className="field" aria-invalid={!!errs.insuranceRate} value={draft.insuranceRate} onChange={(e) => set('insuranceRate', num(e.target.value))} />}</Field>
                <Field label="Charged">{(id) => <select id={id} className="field" value={draft.insurancePeriod} onChange={(e) => set('insurancePeriod', e.target.value as Program['insurancePeriod'])}><option value="upfront">One-time at disbursement</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select>}</Field>
                <Field label="Calculation basis" className="sm:col-span-2" hint={draft.insuranceBasis === 'declining' ? 'Premium follows the outstanding principal, so it shrinks as the customer repays.' : 'Premium is calculated on the original loan amount.'}>{(id) => <select id={id} className="field" value={draft.insuranceBasis} onChange={(e) => set('insuranceBasis', e.target.value as Program['insuranceBasis'])}><option value="original">Original loan amount (flat)</option><option value="declining">Declining balance (outstanding principal)</option></select>}</Field>
              </>}
            </Section>
          <div className="flex justify-end gap-2 pb-4"><Button variant="secondary" onClick={() => setDraft(null)}>Cancel</Button><Button icon={CheckCircle2} onClick={submit}>{isNew ? 'Create program' : 'Save changes'}</Button></div>
          </div>
        </motion.div>
      )}
    </>
  )
}
