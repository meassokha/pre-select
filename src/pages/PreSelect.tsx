import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, CheckCircle2, Copy, Filter, Pencil, Plus, Send, ShieldBan, Trash2, Users as UsersIcon } from 'lucide-react'
import { StageNote, isPending } from '../components/Approval'
import { Button, Empty, Field, IconButton, PageHeader, Panel, Pill, Segmented, Toggle, statusTone } from '../components/ui'
import { KO_DEFS, KO_GROUPS, OPERATORS, VARIABLES, defaultKo, evaluate, variable } from '../data/customers'
import type { Cond, KoState, PreSelect as PS } from '../data/types'
import { rise, stagger } from '../lib/motion'
import { today, uid, useCan, useStore } from '../store'

const newCond = (connector: Cond['connector'] = 'AND'): Cond => ({ id: uid('c'), key: 'age', op: '≥', value: '', value2: '', list: [], connector })
const fmt = (n: number) => n.toLocaleString('en-US')

export function PreSelectPage() {
  const [editing, setEditing] = useState<PS | null>(null)
  return <AnimatePresence mode="wait" initial={false}>{editing ? <Builder key="b" initial={editing} onBack={() => setEditing(null)} /> : <List key="l" onEdit={setEditing} />}</AnimatePresence>
}

/* ============================ list ============================ */
function List({ onEdit }: { onEdit: (p: PS) => void }) {
  const items = useStore((s) => s.preselects)
  const programs = useStore((s) => s.programs)
  const workflow = useStore((s) => s.workflow)
  const remove = useStore((s) => s.removePreselect)
  const save = useStore((s) => s.savePreselect)
  const notify = useStore((s) => s.notify)
  const me = useStore((s) => s.users.find((u) => u.id === s.meId))
  const can = useCan()
  const blank = (): PS => ({ id: uid('ps'), name: '', programIds: [programs.find((p) => p.status === 'Active')?.id ?? programs[0]?.id].filter((x): x is string => !!x), status: 'Draft', trail: [], conds: [newCond()], ko: defaultKo(['pep', 'red_zone', 'high_risk_industry', 'dpd2', 'writeoff']), updated: today(), owner: me?.name ?? '' })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.1 } }}>
      <PageHeader title="Pre-select" subtitle="Choose which customers are offered a lending program: selection rules decide who is in, knock-out rules decide who is always out."
        action={<Button icon={Plus} disabled={!can('preselect', 'create')} onClick={() => onEdit(blank())}>New pre-select</Button>} />
      {items.length === 0 ? <Empty>No pre-select rule sets yet.</Empty> : (
        <motion.div className="grid gap-5 lg:grid-cols-2" initial="hidden" animate="show" variants={stagger}>
          {items.map((p) => {
            const progs = programs.filter((x) => p.programIds.includes(x.id))
            const ev = evaluate(p.conds, p.ko)
            const koOn = KO_DEFS.filter((d) => p.ko[d.key]?.on).length
            return (
              <motion.div key={p.id} variants={rise}>
                <motion.article whileHover={{ y: -3 }} className="card card-interactive flex flex-col gap-4 p-5">
                  <header className="flex items-start justify-between gap-3">
                    <div><h2 className="text-[16px] font-bold">{p.name}</h2><p className="text-muted text-xs">{progs.length ? progs.map((x) => x.name).join(', ') : 'Program removed'} · by {p.owner} · {p.updated}</p></div>
                    <Pill tone={statusTone(p.status)}>{p.status}</Pill>
                  </header>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="profile-fact rounded-[var(--radius-sm)] p-3"><div className="text-xl font-bold tabular-nums">{fmt(ev.selected)}</div><div className="text-muted text-xs">selected</div></div>
                    <div className="profile-fact rounded-[var(--radius-sm)] p-3"><div className="text-danger text-xl font-bold tabular-nums">{fmt(ev.selected - ev.eligible)}</div><div className="text-muted text-xs">knocked out</div></div>
                    <div className="profile-fact rounded-[var(--radius-sm)] p-3"><div className="text-primary-ink text-xl font-bold tabular-nums">{fmt(ev.eligible)}</div><div className="text-muted text-xs">eligible</div></div>
                  </div>
                  <StageNote status={p.status} trail={p.trail} />
                  <footer className="flex items-center justify-between gap-2">
                    <span className="text-muted text-xs">{p.conds.length} selection rule{p.conds.length === 1 ? '' : 's'} · {koOn} knock-out rule{koOn === 1 ? '' : 's'}</span>
                    <div className="flex gap-1">
                      {(p.status === 'Draft' || p.status === 'Rejected') && <IconButton icon={Send} label="Submit for approval" disabled={!can('preselect', 'edit')} onClick={() => { workflow('preselect', p.id, 'submit', me?.name ?? ''); notify(`${p.name} sent to the Line Manager for approval`) }} />}
                      <IconButton icon={Copy} label="Duplicate" disabled={!can('preselect', 'create')} onClick={() => { save({ ...p, id: uid('ps'), name: `${p.name} (copy)`, status: 'Draft', trail: [], updated: today(), conds: p.conds.map((c) => ({ ...c, id: uid('c') })) }); notify('Duplicated as Draft') }} />
                      <IconButton icon={Pencil} label={can('preselect', 'edit') && !isPending(p.status) ? 'Edit' : 'View'} onClick={() => onEdit(p)} />
                      <IconButton icon={Trash2} danger label="Delete" disabled={!can('preselect', 'delete') || p.status === 'Active' || isPending(p.status)} onClick={() => { if (window.confirm(`Delete "${p.name}"?`)) { remove(p.id); notify('Deleted') } }} />
                    </div>
                  </footer>
                </motion.article>
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </motion.div>
  )
}

/* ============================ builder ============================ */
function Builder({ initial, onBack }: { initial: PS; onBack: () => void }) {
  const programs = useStore((s) => s.programs)
  const exists = useStore((s) => s.preselects.some((x) => x.id === initial.id))
  const save = useStore((s) => s.savePreselect)
  const notify = useStore((s) => s.notify)
  const can = useCan()
  const locked = isPending(initial.status)
  const readOnly = locked || (exists ? !can('preselect', 'edit') : !can('preselect', 'create'))
  const [f, setF] = useState<PS>(initial)
  const [err, setErr] = useState<Record<string, string>>({})
  const [view, setView] = useState<'eligible' | 'knocked' | 'out'>('knocked')
  const ev = useMemo(() => evaluate(f.conds, f.ko), [f.conds, f.ko])
  const koOnCount = KO_DEFS.filter((d) => f.ko[d.key]?.on).length

  const setCond = (id: string, p: Partial<Cond>) => setF((x) => ({ ...x, conds: x.conds.map((c) => (c.id === id ? { ...c, ...p } : c)) }))
  const setKo = (k: string, p: Partial<KoState[string]>) => setF((x) => ({ ...x, ko: { ...x.ko, [k]: { ...x.ko[k], ...p } } }))

  const submit = () => {
    const e: Record<string, string> = {}
    if (!f.name.trim()) e.name = 'Give this pre-select a name'
    if (!f.programIds.length) e.programIds = 'Choose at least one lending program'
    f.conds.forEach((c, i) => {
      const v = variable(c.key)
      if (v.months && (!Number.isInteger(c.months ?? 3) || (c.months ?? 3) < 1 || (c.months ?? 3) > 24)) e[`c${c.id}`] = `Condition ${i + 1}: months must be a whole number from 1 to 24`
      else if (v.type === 'number' && (c.value === '' || (c.op === 'Between' && (c.value2 === '' || Number(c.value2) < Number(c.value))))) e[`c${c.id}`] = `Condition ${i + 1}: enter ${c.op === 'Between' ? 'a valid range' : 'a value'}`
      else if (v.type === 'text' && c.op.includes('list') && !c.list.length) e[`c${c.id}`] = `Condition ${i + 1}: pick at least one value`
      else if (v.type === 'text' && !c.op.includes('list') && !c.value) e[`c${c.id}`] = `Condition ${i + 1}: pick a value`
    })
    setErr(e)
    if (Object.keys(e).length) { notify('Fix the highlighted fields first'); return }
    const reapprove = exists && f.status === 'Active'
    save({ ...f, status: reapprove ? 'Draft' : f.status, name: f.name.trim(), updated: today() })
    notify(exists ? (reapprove ? 'Saved and set back to Draft. Submit it for approval again.' : 'Pre-select saved') : 'Pre-select created as Draft')
    onBack()
  }

  const rows = ev.rows.filter((r) => r.selected && (view === 'eligible' ? !r.reasons.length : view === 'knocked' ? r.reasons.length : true)).slice(0, 12)
  const progs = programs.filter((p) => f.programIds.includes(p.id))

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.1 } }}>
      <button type="button" onClick={onBack} className="text-muted mb-3 inline-flex items-center gap-1.5 text-sm font-semibold hover:text-[var(--fg)]"><ArrowLeft size={16} aria-hidden /> Back to pre-select list</button>
      <PageHeader title={exists ? (readOnly ? 'View pre-select' : 'Edit pre-select') : 'New pre-select'} subtitle="Step 1 name it, step 2 pick who qualifies, step 3 set who is always excluded. The preview updates as you type."
        action={<div className="flex gap-2"><Button variant="secondary" onClick={onBack}>Cancel</Button><Button disabled={readOnly} onClick={submit} icon={CheckCircle2}>Save pre-select</Button></div>} />
      {readOnly && <p className="card card-flat mb-4 p-3 text-sm">{locked ? "This pre-select is in the approval process and is locked until it is approved or rejected." : "Your role can only view this pre-select. Switch \"Viewing as\" to the Product Manager or Credit Risk role to edit."}</p>}

      <div className="grid items-start gap-5 xl:grid-cols-12">
        <div className="flex flex-col gap-5 xl:col-span-8">
          {/* step 1 */}
          <Panel title="1. Basics">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Pre-select name" required error={err.name}>{(id) => <input id={id} className="field" disabled={readOnly} aria-invalid={!!err.name} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Payroll customers - Salary Advance" />}</Field>
              <Field label="Lending programs" required error={err.programIds} hint={`${progs.length} selected. The same rules apply to every selected program.`}>
                {() => <div className="flex flex-wrap gap-1.5" role="group" aria-label="Lending programs">{programs.map((p) => <button key={p.id} type="button" className="chip" disabled={readOnly} aria-pressed={f.programIds.includes(p.id)} title={`${p.productType} / ${p.subType} · ${p.status}`} onClick={() => setF((x) => ({ ...x, programIds: x.programIds.includes(p.id) ? x.programIds.filter((i) => i !== p.id) : [...x.programIds, p.id] }))}>{p.name}</button>)}</div>}
              </Field>
            </div>
          </Panel>

          {/* step 2 */}
          <Panel title="2. Selection rules" sub="Include conditions decide who is in the target group and combine top to bottom: 1 AND 2 OR 3 means (1 AND 2) OR 3. Exclude conditions always remove the customers they match."
            action={<div className="flex gap-2"><Button small variant="secondary" icon={Plus} disabled={readOnly} onClick={() => setF((x) => ({ ...x, conds: [...x.conds, newCond('AND')] }))}>Add condition</Button><Button small variant="secondary" icon={Plus} disabled={readOnly} onClick={() => setF((x) => ({ ...x, conds: [...x.conds, { ...newCond('AND'), exclude: true }] }))}>Add exclusion</Button></div>}>
            {f.conds.length === 0 && <Empty>No selection rules: every customer is in the target group before knock-out.</Empty>}
            <ul className="flex flex-col gap-3">
              <AnimatePresence initial={false}>
                {f.conds.map((c, i) => {
                  const v = variable(c.key)
                  const showConn = !c.exclude && f.conds.slice(0, i).some((k) => !k.exclude)
                  return (
                    <motion.li key={c.id} layout="position" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="flex flex-col gap-2">
                      {showConn && (
                        <div className="flex items-center gap-2 pl-1">
                          <Segmented id={`conn-${c.id}`} label={`Connector for condition ${i + 1}`} value={c.connector} onChange={(x) => !readOnly && setCond(c.id, { connector: x })} options={[{ value: 'AND', label: 'AND' }, { value: 'OR', label: 'OR' }]} />
                        </div>
                      )}
                      <div className="card card-flat flex flex-wrap items-start gap-3 p-3">
                        <div className="selected-num grid size-9 shrink-0 place-items-center rounded-full bg-[var(--primary-soft)] text-sm font-bold text-[var(--primary)]" aria-label={`Condition ${i + 1}`}>{i + 1}</div>
                        <select aria-label={`Mode ${i + 1}`} className={`field !w-[130px] ${c.exclude ? '!text-[var(--danger)] font-semibold' : ''}`} disabled={readOnly} value={c.exclude ? 'exclude' : 'include'} onChange={(e) => setCond(c.id, { exclude: e.target.value === 'exclude' })}><option value="include">Include</option><option value="exclude">Exclude</option></select>
                        <select aria-label={`Variable ${i + 1}`} className="field !w-[260px]" disabled={readOnly} value={c.key} onChange={(e) => { const nv = variable(e.target.value); setCond(c.id, { key: e.target.value, op: OPERATORS[nv.type][0], value: '', value2: '', list: [], months: nv.months ? 3 : undefined }) }}>
                          {VARIABLES.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
                        </select>
                        {v.months && (
                          <label className="text-muted flex items-center gap-1.5 text-sm">last<input aria-label={`Months ${i + 1}`} type="number" min={1} max={24} className="field !w-[80px]" disabled={readOnly} value={c.months ?? 3} onChange={(e) => setCond(c.id, { months: Number(e.target.value) })} />months</label>
                        )}
                        {!v.noOp && <select aria-label={`Operator ${i + 1}`} className="field !w-[130px]" disabled={readOnly} value={c.op} onChange={(e) => setCond(c.id, { op: e.target.value })}>{OPERATORS[v.type].map((o) => <option key={o}>{o}</option>)}</select>}
                        {v.type === 'number' && (
                          <>
                            <input aria-label={`Value ${i + 1}`} type="number" className="field !w-[120px]" disabled={readOnly} value={c.value} onChange={(e) => setCond(c.id, { value: e.target.value })} placeholder={c.op === 'Between' ? 'From' : 'Value'} />
                            {c.op === 'Between' && <input aria-label={`Upper value ${i + 1}`} type="number" className="field !w-[120px]" disabled={readOnly} value={c.value2} onChange={(e) => setCond(c.id, { value2: e.target.value })} placeholder="To" />}
                            {v.unit && <span className="text-muted self-center text-sm">{v.unit}</span>}
                          </>
                        )}
                        {v.type === 'text' && !c.op.includes('list') && (
                          <select aria-label={`Value ${i + 1}`} className="field !w-[190px]" disabled={readOnly} value={c.value} onChange={(e) => setCond(c.id, { value: e.target.value })}><option value="">Choose...</option>{v.options?.map((o) => <option key={o}>{o}</option>)}</select>
                        )}
                        {v.type === 'text' && c.op.includes('list') && (
                          <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Values ${i + 1}`}>
                            {v.options?.map((o) => <button key={o} type="button" className="chip" disabled={readOnly} aria-pressed={c.list.includes(o)} onClick={() => setCond(c.id, { list: c.list.includes(o) ? c.list.filter((x) => x !== o) : [...c.list, o] })}>{o}</button>)}
                          </div>
                        )}
                        <div className="ml-auto flex items-center gap-2">
                          <span className="text-muted text-xs tabular-nums" title="Customers matching this condition on its own">{fmt(ev.condReach[i] ?? 0)} {c.exclude ? 'excluded' : 'match'}</span>
                          <IconButton icon={Trash2} danger label={`Remove condition ${i + 1}`} disabled={readOnly} onClick={() => setF((x) => ({ ...x, conds: x.conds.filter((k) => k.id !== c.id).map((k, j) => (j === 0 ? { ...k, connector: 'AND' } : k)) }))} />
                        </div>
                        {err[`c${c.id}`] && <p className="err w-full" role="alert">{err[`c${c.id}`]}</p>}
                      </div>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </ul>
          </Panel>

          {/* step 3 */}
          <Panel title="3. Knock-out rules" sub="Anyone matching an enabled knock-out rule is removed, even if they match the selection rules. The count shows how many selected customers each rule removes on its own."
            action={<div className="flex gap-2"><Button small variant="secondary" disabled={readOnly} onClick={() => setF((x) => ({ ...x, ko: Object.fromEntries(Object.entries(x.ko).map(([k, v]) => [k, { ...v, on: true }])) }))}>Enable all</Button><Button small variant="ghost" disabled={readOnly} onClick={() => setF((x) => ({ ...x, ko: Object.fromEntries(Object.entries(x.ko).map(([k, v]) => [k, { ...v, on: false }])) }))}>Clear</Button></div>}>
            <div className="flex flex-col gap-5">
              {KO_GROUPS.map((g) => {
                const defs = KO_DEFS.filter((d) => d.group === g)
                const allOn = defs.every((d) => f.ko[d.key]?.on)
                return (
                  <section key={g} aria-label={g}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <h3 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide"><ShieldBan size={15} className="text-danger" aria-hidden /> {g}</h3>
                      {g === 'Bad credit history' && (
                        <label className="text-muted flex items-center gap-2 text-xs font-semibold">All bad credit rules <Toggle label="Toggle all bad credit history rules" checked={allOn} disabled={readOnly} onChange={(v) => defs.forEach((d) => setKo(d.key, { on: v }))} /></label>
                      )}
                    </div>
                    <ul className={`flex flex-col gap-2 ${g === 'Bad credit history' ? 'border-l-2 border-[var(--border-hover)] pl-4' : ''}`}>
                      {defs.map((d) => {
                        const st = f.ko[d.key]
                        return (
                          <li key={d.key} className="ko-row p-3" data-on={st?.on || undefined}>
                            <div className="flex items-center gap-3">
                              <Toggle label={d.label} checked={!!st?.on} disabled={readOnly} onChange={(v) => setKo(d.key, { on: v })} />
                              <div className="min-w-0 flex-1"><div className="font-semibold">{d.label}</div><div className="text-muted text-[12.5px]">{d.desc}</div></div>
                              {st?.on && <Pill tone="danger">removes {fmt(ev.koHits[d.key] ?? 0)}</Pill>}
                            </div>
                            {st?.on && d.param?.kind === 'num' && (
                              <div className="mt-2 flex items-center gap-2 pl-14 text-sm"><label htmlFor={`p-${d.key}`} className="text-muted">{d.param.label}</label><input id={`p-${d.key}`} type="number" min={1} className="field !h-8 !w-[90px]" disabled={readOnly} value={st.num ?? d.param.def} onChange={(e) => setKo(d.key, { num: Math.max(1, Number(e.target.value)) })} /><span className="text-muted">{d.param.unit}</span></div>
                            )}
                            {st?.on && d.param?.kind === 'list' && (
                              <div className="mt-2 flex flex-wrap gap-1.5 pl-14" role="group" aria-label={d.param.label}>
                                {d.param.options.map((o) => <button key={o} type="button" className="chip" disabled={readOnly} aria-pressed={!!st.list?.includes(o)} onClick={() => setKo(d.key, { list: st.list?.includes(o) ? st.list.filter((x) => x !== o) : [...(st.list ?? []), o] })}>{o}</button>)}
                              </div>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                )
              })}
            </div>
          </Panel>
        </div>

        {/* live preview */}
        <div className="sticky-col flex flex-col gap-5 xl:col-span-4">
          <Panel title="Live preview" sub={`Sample base of ${fmt(ev.total)} customers`}>
            <ol className="flex flex-col gap-3" aria-label="Customer funnel">
              {[{ l: 'Customer base', v: ev.total, c: 'var(--chart-4)' }, { l: 'Match selection rules', v: ev.selected, c: 'var(--chart-2)' }, { l: `After ${koOnCount} knock-out rule${koOnCount === 1 ? '' : 's'}`, v: ev.eligible, c: 'var(--chart-1)' }].map((s) => (
                <li key={s.l}>
                  <div className="flex justify-between text-sm"><span className="text-muted">{s.l}</span><b className="tabular-nums">{fmt(s.v)} <span className="text-muted font-medium">({((s.v / ev.total) * 100).toFixed(1)}%)</span></b></div>
                  <div className="progress-track mt-1 h-3 overflow-hidden rounded-full"><motion.div className="h-full origin-left rounded-full" style={{ background: s.c, width: `${Math.max((s.v / ev.total) * 100, 1)}%` }} layout transition={{ type: 'spring', stiffness: 300, damping: 32 }} /></div>
                </li>
              ))}
            </ol>
            <div className="mt-4 rounded-[var(--radius-sm)] border border-[var(--border)] p-3 text-center">
              <div className="text-muted text-xs font-semibold uppercase">Eligible for {progs.length ? progs.map((x) => x.name).join(', ') : 'program'}</div>
              <div className="text-primary-ink text-3xl font-bold tabular-nums">{fmt(ev.eligible)}</div>
              <div className="text-muted text-xs">{fmt(ev.selected - ev.eligible)} selected customers knocked out</div>
            </div>
            {koOnCount > 0 && (
              <div className="mt-4">
                <h3 className="mb-1.5 text-[13px] font-bold">Knock-outs by rule</h3>
                <ul className="flex flex-col gap-1 text-[13px]">
                  {KO_DEFS.filter((d) => f.ko[d.key]?.on).sort((a, b) => (ev.koHits[b.key] ?? 0) - (ev.koHits[a.key] ?? 0)).map((d) => (
                    <li key={d.key} className="flex justify-between gap-2"><span className="text-muted truncate">{d.label}</span><b className="tabular-nums">{fmt(ev.koHits[d.key] ?? 0)}</b></li>
                  ))}
                </ul>
                <p className="hint mt-2">Rules overlap, so the rows add up to more than the knocked-out total.</p>
              </div>
            )}
          </Panel>
        </div>

        <Panel className="xl:col-span-12" title="Customer sample" sub="First customers from the preview, with the exact knock-out reasons"
          action={<Segmented id="view" label="Customer view" value={view} onChange={setView} options={[{ value: 'knocked', label: 'Knocked out' }, { value: 'eligible', label: 'Eligible' }, { value: 'out', label: 'All selected' }]} />}>
          {rows.length === 0 ? <Empty>No customers in this view.</Empty> : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead><tr><th>Customer</th><th className="text-right">Age</th><th>Province</th><th>Workplace</th><th className="text-right">Employees</th><th>Result</th></tr></thead>
                <tbody>
                  {rows.map(({ c, reasons }) => (
                    <tr key={c.id} className="data-row">
                      <td><div className="font-semibold">{c.name}</div><div className="text-muted text-xs">{c.id}</div></td>
                      <td className="text-right tabular-nums">{c.age}</td><td>{c.province}</td>
                      <td>{c.industry}<div className="text-muted text-xs">{c.zone} zone{c.rgc ? ' · RGC' : ''}</div></td>
                      <td className="text-right tabular-nums">{fmt(c.employees)}</td>
                      <td>{reasons.length ? <div className="flex flex-wrap gap-1">{reasons.map((r) => <Pill key={r} tone="danger">{r}</Pill>)}</div> : <Pill tone="success">Eligible</Pill>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-muted mt-3 flex items-center gap-1.5 text-xs"><UsersIcon size={14} aria-hidden /> <Filter size={14} aria-hidden /> Prototype: customers are synthetic. Real runs would use CIF, AML, credit bureau and HR data.</p>
        </Panel>
      </div>
    </motion.div>
  )
}
