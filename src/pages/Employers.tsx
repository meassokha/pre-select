import { useRef, useState } from 'react'
import { motion } from 'motion/react'
import * as XLSX from 'xlsx'
import { Download, Plus, Search, Trash2, Upload } from 'lucide-react'
import { Button, Empty, Field, IconButton, PageHeader, Panel, Segmented } from '../components/ui'
import { EMPLOYER_CATEGORIES } from '../data/seed'
import type { EmployerCategory } from '../data/types'
import { useCan, useStore } from '../store'

const COL_ACC = 'Company account number'
const COL_NAME = 'Company Name'

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

function downloadTemplate(label: string) {
  const ws = XLSX.utils.aoa_to_sheet([[COL_ACC, COL_NAME]])
  ws['!cols'] = [{ wch: 28 }, { wch: 40 }]
  // force the account column to text so leading zeros survive
  const help = XLSX.utils.aoa_to_sheet([
    ['How to use'],
    [`1. Fill one company per row on the "Employers" sheet. Keep the two column names exactly as they are: "${COL_ACC}" and "${COL_NAME}".`],
    ['2. Format the account number column as Text so leading zeros are kept.'],
    [`3. Save the file and upload it in the "${label}" section of Employer configuration.`],
  ])
  help['!cols'] = [{ wch: 110 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Employers')
  XLSX.utils.book_append_sheet(wb, help, 'Instructions')
  XLSX.writeFile(wb, `${label.toLowerCase().replace(/[^a-z]+/g, '-')}-template.xlsx`)
}

export function Employers() {
  const employers = useStore((s) => s.employers)
  const add = useStore((s) => s.addEmployers)
  const remove = useStore((s) => s.removeEmployer)
  const notify = useStore((s) => s.notify)
  const me = useStore((s) => s.users.find((u) => u.id === s.meId))
  const can = useCan()
  const [cat, setCat] = useState<EmployerCategory>('highRisk')
  const [q, setQ] = useState('')
  const [acc, setAcc] = useState('')
  const [name, setName] = useState('')
  const [err, setErr] = useState<{ acc?: string; name?: string }>({})
  const [report, setReport] = useState<{ file: string; added: number; skipped: string[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const def = EMPLOYER_CATEGORIES.find((c) => c.id === cat)!
  const inCat = employers.filter((e) => e.category === cat)
  const list = inCat.filter((e) => !q.trim() || norm(e.accountNo + ' ' + e.name).includes(norm(q)))
  const canCreate = can('employers', 'create')

  const switchCat = (c: EmployerCategory) => { setCat(c); setQ(''); setErr({}); setReport(null) }

  const addOne = () => {
    const e: typeof err = {}
    if (!acc.trim()) e.acc = 'Enter the company account number'
    else if (inCat.some((x) => norm(x.accountNo) === norm(acc))) e.acc = 'This account number is already in the list'
    if (!name.trim()) e.name = 'Enter the company name'
    setErr(e)
    if (Object.keys(e).length) return
    add(cat, [{ accountNo: acc.trim(), name: name.trim() }], me?.name ?? '')
    notify(`Added to ${def.label}`)
    setAcc(''); setName('')
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false })
      const keys = rows.length ? Object.keys(rows[0]) : (XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })[0] ?? []).map(String)
      const kAcc = keys.find((k) => norm(k) === norm(COL_ACC))
      const kName = keys.find((k) => norm(k) === norm(COL_NAME))
      if (!kAcc || !kName) {
        setReport({ file: file.name, added: 0, skipped: [`Columns not found. The first row must contain "${COL_ACC}" and "${COL_NAME}". Download the template to get the right layout.`] })
        return
      }
      const seen = new Set(inCat.map((x) => norm(x.accountNo)))
      const good: { accountNo: string; name: string }[] = []
      const skipped: string[] = []
      rows.forEach((r, i) => {
        const a = String(r[kAcc] ?? '').trim()
        const n = String(r[kName] ?? '').trim()
        if (!a && !n) return
        const line = `Row ${i + 2}`
        if (!a || !n) { skipped.push(`${line}: ${!a ? 'account number' : 'company name'} is empty`); return }
        if (seen.has(norm(a))) { skipped.push(`${line}: ${a} is a duplicate or already in the list`); return }
        seen.add(norm(a))
        good.push({ accountNo: a, name: n })
      })
      if (good.length) add(cat, good, me?.name ?? '')
      setReport({ file: file.name, added: good.length, skipped })
      notify(good.length ? `${good.length} compan${good.length === 1 ? 'y' : 'ies'} added to ${def.label}` : 'Nothing was added')
    } catch {
      setReport({ file: file.name, added: 0, skipped: ['This file could not be read. Use the .xlsx template or a .csv with the same two columns.'] })
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.1 } }}>
      <PageHeader title="Employer configuration" subtitle="Maintain the employer lists used by the knock-out rules: high-risk employers, low staff companies, RGC companies and Red-zone companies. Add one by one or upload a batch from Excel." />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented id="ecat" label="Employer list" value={cat} onChange={switchCat}
          options={EMPLOYER_CATEGORIES.map((c) => ({ value: c.id, label: `${c.label} (${employers.filter((e) => e.category === c.id).length})` }))} />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-12">
        <Panel className="xl:col-span-4" title="Add companies" sub={def.desc}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="text-[13px] font-semibold">Batch upload</div>
              <p className="text-muted text-[12.5px]">Download the template, fill in {COL_ACC} and {COL_NAME}, then upload it. Companies go into <strong>{def.label}</strong>.</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" icon={Download} onClick={() => downloadTemplate(def.label)}>Download template (Excel)</Button>
                <Button icon={Upload} disabled={!canCreate} title={canCreate ? undefined : 'Your role cannot add employers'} onClick={() => fileRef.current?.click()}>Upload file</Button>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" aria-label={`Upload ${def.label} file`} onChange={(e) => onFile(e.target.files?.[0])} />
              </div>
              {report && (
                <div className="card card-flat p-3 text-sm" role="status">
                  <div className="font-semibold">{report.file}</div>
                  <div className={report.added ? 'text-primary-ink' : 'text-danger'}>{report.added} added, {report.skipped.length} skipped</div>
                  {report.skipped.length > 0 && <ul className="text-muted mt-1 max-h-32 list-disc overflow-y-auto pl-5 text-[12.5px]">{report.skipped.slice(0, 20).map((s) => <li key={s}>{s}</li>)}{report.skipped.length > 20 && <li>and {report.skipped.length - 20} more</li>}</ul>}
                </div>
              )}
            </div>
            <hr className="border-[var(--border)]" />
            <div className="flex flex-col gap-3">
              <div className="text-[13px] font-semibold">Add one company</div>
              <Field label={COL_ACC} error={err.acc}>{(id) => <input id={id} className="field" disabled={!canCreate} aria-invalid={!!err.acc} value={acc} onChange={(e) => setAcc(e.target.value)} placeholder="e.g. 001234567" />}</Field>
              <Field label={COL_NAME} error={err.name}>{(id) => <input id={id} className="field" disabled={!canCreate} aria-invalid={!!err.name} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addOne()} placeholder="e.g. Angkor Gaming Co., Ltd." />}</Field>
              <div><Button icon={Plus} disabled={!canCreate} onClick={addOne}>Add to {def.label}</Button></div>
              {!canCreate && <p className="hint">Your role can view this list but not change it. Switch "Viewing as" to Payroll Team or System Administrator.</p>}
            </div>
          </div>
        </Panel>

        <Panel className="xl:col-span-8" title={`${def.label}: ${inCat.length} compan${inCat.length === 1 ? 'y' : 'ies'}`}
          action={<div className="relative"><Search size={15} className="text-muted pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" aria-hidden /><input aria-label="Search companies" className="field !h-9 !w-[220px] !pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" /></div>}>
          {list.length === 0 ? <Empty>{inCat.length ? 'No company matches your search.' : 'No companies in this list yet. Upload a file or add one.'}</Empty> : (
            <div className="max-h-[560px] overflow-auto">
              <table className="data-table">
                <thead><tr><th>{COL_ACC}</th><th>{COL_NAME}</th><th>Added</th><th>By</th><th className="text-right">Actions</th></tr></thead>
                <tbody>
                  {list.map((e) => (
                    <tr key={e.id} className="data-row">
                      <td className="tabular-nums">{e.accountNo}</td>
                      <td className="font-semibold">{e.name}</td>
                      <td className="text-muted">{e.added}</td>
                      <td className="text-muted">{e.addedBy}</td>
                      <td><div className="flex justify-end"><IconButton icon={Trash2} danger label={`Remove ${e.name}`} disabled={!can('employers', 'delete')} onClick={() => { remove(e.id); notify('Company removed') }} /></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </motion.div>
  )
}
