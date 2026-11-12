import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip as CTip, XAxis, YAxis } from 'recharts'
import { BadgeCheck, FileText, Percent, ShieldAlert, Wallet } from 'lucide-react'
import { MultiSelect } from '../components/MultiSelect'
import { KpiCard, PageHeader, Panel, Pill, Segmented, compact, money } from '../components/ui'
import type { Program } from '../data/types'
import { rise, stagger } from '../lib/motion'
import { useStore } from '../store'

/* ---- seeded 730 days of synthetic loan-application performance, per lending program ---- */
const DAY = 86400000
const N = 730
const END = new Date(2026, 10, 12, 12) // last day with data
const dateOf = (i: number) => new Date(END.getTime() - (N - 1 - i) * DAY)
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const idxOf = (v: string) => { const [y, m, d] = v.split('-').map(Number); return Math.round((new Date(y, m - 1, d, 12).getTime() - dateOf(0).getTime()) / DAY) }
const MIN_ISO = iso(dateOf(0))
const MAX_ISO = iso(dateOf(N - 1))
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmtDate = (v: string) => { const [y, m, d] = v.split('-').map(Number); return `${d} ${MON[m - 1]} ${y}` }

const hash = (s: string) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) } return (h >>> 0) / 4294967296 }
const noise = (a: number, b: number) => { const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return x - Math.floor(x) }

interface Day { apps: number; approved: number; disbursed: number; amount: number; par: number }
type Agg = { apps: number; approved: number; disbursed: number; amount: number }
const zero = (): Agg => ({ apps: 0, approved: 0, disbursed: 0, amount: 0 })

/** one program's numbers for every day; shares are normalised over all programs so "all products" matches the old totals */
function buildSeries(programs: Program[]): Record<string, Day[]> {
  const w = Object.fromEntries(programs.map((p) => [p.id, 0.6 + hash(p.code) * 0.9]))
  const tot = programs.reduce((a, p) => a + w[p.id], 0) || 1
  const out: Record<string, Day[]> = {}
  for (const p of programs) {
    const share = w[p.id] / tot
    const seed = hash(p.code) * 1000
    const rOff = (hash(p.code + 'r') - 0.5) * 0.14
    const ticket = (0.6 + hash(p.code + 't')) * (p.currency === 'KHR' ? 0.35 : 1)
    const pOff = (hash(p.code + 'p') - 0.5) * 2.4
    out[p.id] = Array.from({ length: N }, (_, i) => {
      const t = i / 30.4
      const wd = dateOf(i).getDay()
      const dow = wd === 0 ? 0.35 : wd === 6 ? 0.7 : 1.15
      const all = ((1900 + t * 95 + Math.sin(t / 1.9) * 140 + Math.cos(t * 1.3) * 70) / 30.4) * dow
      const apps = Math.round(all * share * (0.9 + 0.2 * noise(i, seed)))
      const approved = Math.round(apps * Math.min(0.95, 0.5 + t * 0.0048 + Math.sin(t / 2.4) * 0.012 + rOff))
      const disbursed = Math.round(approved * (0.8 + Math.sin(t / 3) * 0.02))
      return { apps, approved, disbursed, amount: Math.round(disbursed * (560 + t * 7) * ticket), par: Math.max(0.4, 3.9 - t * 0.04 + Math.sin(t / 1.7) * 0.18 + pOff) }
    })
  }
  return out
}
const sumRange = (days: Day[][], i0: number, i1: number): Agg => {
  const a = zero()
  for (const d of days) for (let i = i0; i <= i1; i++) { a.apps += d[i].apps; a.approved += d[i].approved; a.disbursed += d[i].disbursed; a.amount += d[i].amount }
  return a
}
/** PAR 30 at a date: average of the last 7 days, averaged across the selected programs */
const parAt = (days: Day[][], i1: number) => {
  let t = 0, n = 0
  for (const d of days) for (let i = Math.max(0, i1 - 6); i <= i1; i++) { t += d[i].par; n++ }
  return n ? t / n : 0
}

const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0)
const PRESETS = [{ v: '30', label: '30 days', days: 30 }, { v: '90', label: '90 days', days: 90 }, { v: '182', label: '6 months', days: 182 }, { v: '365', label: '12 months', days: 365 }]
const tip = {
  contentStyle: { background: 'var(--surface-solid)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--fg)', boxShadow: '0 8px 24px rgb(0 0 0 / 0.18)' },
  labelStyle: { color: 'var(--fg)', fontWeight: 700 }, itemStyle: { color: 'var(--fg)' },
}
const tick = { fill: 'var(--fg-muted)', fontSize: 12 }

function ChartBox({ label, className = 'h-72', children }: { label: string; className?: string; children: React.ReactElement }) {
  return <div className={className} role="img" aria-label={label}><ResponsiveContainer width="100%" height="100%" debounce={200}>{children}</ResponsiveContainer></div>
}
function Legend({ items }: { items: { label: string; color: string; value?: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {items.map((i) => <li key={i.label} className="flex items-center gap-1.5"><span aria-hidden className="inline-block size-2.5 rounded-[3px]" style={{ background: i.color }} /><span className="text-muted">{i.label}</span>{i.value && <b className="tabular-nums">{i.value}</b>}</li>)}
    </ul>
  )
}

export function Dashboard() {
  const reduce = useReducedMotion()
  const programs = useStore((s) => s.programs)
  const source = useMemo(() => programs.filter((p) => p.status === 'Active' || p.status === 'Paused' || p.status === 'Retired'), [programs])
  const series = useMemo(() => buildSeries(source), [source])
  const [picked, setPicked] = useState<string[] | null>(null) // null = all products
  const [to, setTo] = useState(MAX_ISO)
  const [from, setFrom] = useState(iso(new Date(END.getTime() - 181 * DAY)))

  const selIds = picked ? source.filter((p) => picked.includes(p.id)).map((p) => p.id) : source.map((p) => p.id)
  const sel = source.filter((p) => selIds.includes(p.id))
  const days = sel.map((p) => series[p.id])
  const i0 = Math.max(0, idxOf(from)), i1 = Math.min(N - 1, idxOf(to))
  const len = i1 - i0 + 1
  const hasPrev = i0 - len >= 0
  const preset = PRESETS.find((x) => x.days === len && to === MAX_ISO)?.v ?? 'custom'

  const setPreset = (v: string) => {
    const x = PRESETS.find((p) => p.v === v)
    if (!x) return
    setTo(MAX_ISO); setFrom(iso(new Date(END.getTime() - (x.days - 1) * DAY)))
  }
  const onFrom = (v: string) => { if (!v) return; setFrom(v); if (v > to) setTo(v) }
  const onTo = (v: string) => { if (!v) return; setTo(v); if (v < from) setFrom(v) }

  const d = useMemo(() => {
    const c = sumRange(days, i0, i1)
    const pr = hasPrev ? sumRange(days, i0 - len, i0 - 1) : null
    const par = parAt(days, i1)
    const pPar = hasPrev ? parAt(days, i0 - 1) : 0
    return {
      apps: c.apps, appr: c.approved, disb: c.disbursed, amt: c.amount, rate: c.apps ? (c.approved / c.apps) * 100 : 0,
      dApps: pr ? pct(c.apps, pr.apps) : 0, dRate: pr && c.apps && pr.apps ? pct(c.approved / c.apps, pr.approved / pr.apps) : 0, dAmt: pr ? pct(c.amount, pr.amount) : 0,
      par, dPar: hasPrev ? pct(par, pPar) : 0,
    }
  }, [days, i0, i1, len, hasPrev])

  // chart buckets: daily up to 31 days, weekly up to ~4 months, monthly beyond
  const grain = len <= 31 ? 'day' : len <= 120 ? 'week' : 'month'
  const cur = useMemo(() => {
    const map = new Map<string, { m: string; apps: number; approved: number; disbursed: number }>()
    const multiYear = dateOf(i0).getFullYear() !== dateOf(i1).getFullYear()
    for (let i = i0; i <= i1; i++) {
      const dt = dateOf(i)
      const key = grain === 'day' ? String(i) : grain === 'week' ? String(Math.floor((i - i0) / 7)) : `${dt.getFullYear()}-${dt.getMonth()}`
      let b = map.get(key)
      if (!b) {
        const label = grain === 'month' ? (multiYear ? `${MON[dt.getMonth()]} ${String(dt.getFullYear()).slice(2)}` : MON[dt.getMonth()]) : `${dt.getDate()} ${MON[dt.getMonth()]}`
        b = { m: label, apps: 0, approved: 0, disbursed: 0 }; map.set(key, b)
      }
      for (const dd of days) { b.apps += dd[i].apps; b.approved += dd[i].approved; b.disbursed += dd[i].disbursed }
    }
    return [...map.values()]
  }, [days, i0, i1, grain])

  const funnel = [
    { name: 'Pre-selected offers', v: Math.round(d.apps * 3.6), c: 'var(--chart-4)' },
    { name: 'Applications', v: d.apps, c: 'var(--chart-2)' },
    { name: 'Passed knock-out', v: Math.round(d.apps * 0.86), c: 'var(--chart-5)' },
    { name: 'Approved', v: d.appr, c: 'var(--chart-1)' },
    { name: 'Disbursed', v: d.disb, c: 'var(--chart-3)' },
  ]
  const outcomes = [
    { name: 'Disbursed', v: d.disb, c: 'var(--chart-1)' },
    { name: 'Approved, not taken', v: d.appr - d.disb, c: 'var(--chart-2)' },
    { name: 'Rejected', v: Math.round(d.apps * 0.34), c: 'var(--danger)' },
    { name: 'Withdrawn', v: Math.round(d.apps * 0.06), c: 'var(--chart-4)' },
  ]
  const outTotal = outcomes.reduce((s, o) => s + o.v, 0)
  const reasons = [
    { name: 'Knock-out: bad credit history', v: 31 }, { name: 'Low credit score', v: 24 }, { name: 'Knock-out: workplace / industry risk', v: 15 },
    { name: 'Income not verified', v: 12 }, { name: 'Knock-out: PEP / AML', v: 8 }, { name: 'Over-indebted (DTI)', v: 10 },
  ]

  const rows = sel.map((p) => {
    const a = sumRange([series[p.id]], i0, i1)
    return { p, apps: a.apps, rate: a.apps ? Math.round((a.approved / a.apps) * 100) : 0, disb: a.amount, par: parAt([series[p.id]], i1) }
  })
  const anim = !reduce

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`Loan application performance · ${picked && sel.length < source.length ? (sel.length === 1 ? sel[0].name : `${sel.length} products`) : 'all products'} · ${fmtDate(iso(dateOf(i0)))} to ${fmtDate(iso(dateOf(i1)))}`} />

      <div className="card card-flat mb-5 flex flex-wrap items-end gap-x-4 gap-y-3 p-3" role="group" aria-label="Dashboard filters">
        <div><div className="label">Product</div>
          <MultiSelect label="Product" noun="products" allLabel="All products" value={selIds} onChange={(v) => setPicked(v.length === source.length ? null : v)} options={source.map((p) => ({ value: p.id, label: p.name, hint: `${p.code} · ${p.subType}` }))} />
        </div>
        <div><label className="label" htmlFor="d-from">From</label><input id="d-from" type="date" className="field !w-[160px]" min={MIN_ISO} max={to} value={from} onChange={(e) => onFrom(e.target.value)} /></div>
        <div><label className="label" htmlFor="d-to">To</label><input id="d-to" type="date" className="field !w-[160px]" min={from} max={MAX_ISO} value={to} onChange={(e) => onTo(e.target.value)} /></div>
        <div className="ml-auto"><div className="label">Quick period</div><Segmented id="range" label="Quick period" value={preset} onChange={setPreset} options={[...PRESETS.map((x) => ({ value: x.v, label: x.label })), { value: 'custom', label: 'Custom' }]} /></div>
      </div>

      <motion.div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4" initial="hidden" animate="show" variants={stagger}>
        {[
          <KpiCard key="a" label="Loan applications" value={d.apps} format={(v) => Math.round(v).toLocaleString('en-US')} icon={FileText} delta={d.dApps} />,
          <KpiCard key="b" label="Approval rate" value={d.rate} format={(v) => `${v.toFixed(1)}%`} icon={Percent} delta={d.dRate} />,
          <KpiCard key="c" label="Disbursed amount" value={d.amt} format={(v) => `$${compact(v)}`} icon={Wallet} delta={d.dAmt} />,
          <KpiCard key="d" label="PAR 30" value={d.par} format={(v) => `${v.toFixed(2)}%`} icon={ShieldAlert} delta={d.dPar} good="down" note={hasPrev ? 'vs period start' : 'no earlier data to compare'} />,
        ].map((c) => <motion.div key={c.key} variants={rise}>{c}</motion.div>)}
      </motion.div>

      <div className="mt-5 grid gap-5 xl:grid-cols-12">
        <Panel className="xl:col-span-8" title="Application volume" sub={`Applications, approvals and disbursements per ${grain}${grain === 'week' ? ' (weeks start on the date shown)' : ''}`}
          action={<Legend items={[{ label: 'Applications', color: 'var(--chart-2)' }, { label: 'Approved', color: 'var(--chart-1)' }, { label: 'Disbursed', color: 'var(--chart-3)' }]} />}>
          <ChartBox label={`Monthly applications grew from ${cur[0].apps.toLocaleString()} to ${cur[cur.length - 1].apps.toLocaleString()} over the period, with approvals tracking about ${d.rate.toFixed(0)}% of applications.`}>
            <AreaChart data={cur} margin={{ left: -10, right: 8, top: 8 }}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis dataKey="m" tick={tick} axisLine={false} tickLine={false} />
              <YAxis tick={tick} axisLine={false} tickLine={false} tickFormatter={compact} />
              <CTip {...tip} />
              <Area dataKey="apps" name="Applications" stroke="var(--chart-2)" strokeWidth={2.5} fill="var(--chart-2)" fillOpacity={0.1} isAnimationActive={anim} activeDot={{ r: 5 }} />
              <Area dataKey="approved" name="Approved" stroke="var(--chart-1)" strokeWidth={2.5} fill="var(--chart-1)" fillOpacity={0.18} isAnimationActive={anim} activeDot={{ r: 5 }} />
              <Area dataKey="disbursed" name="Disbursed" stroke="var(--chart-3)" strokeWidth={2.5} fill="var(--chart-3)" fillOpacity={0.08} isAnimationActive={anim} activeDot={{ r: 5 }} />
            </AreaChart>
          </ChartBox>
        </Panel>

        <Panel className="xl:col-span-4" title="Application outcomes" sub="Share of applications in the period">
          <div className="relative mx-auto h-48 w-full max-w-[220px]" role="img" aria-label={`${((d.disb / outTotal) * 100).toFixed(0)}% of applications end in a disbursement; ${((outcomes[2].v / outTotal) * 100).toFixed(0)}% are rejected.`}>
            <ResponsiveContainer width="100%" height="100%" debounce={200}>
              <PieChart>
                <CTip {...tip} />
                <Pie data={outcomes} dataKey="v" nameKey="name" innerRadius="64%" paddingAngle={3} cornerRadius={6} stroke="none" isAnimationActive={anim}>
                  {outcomes.map((o) => <Cell key={o.name} fill={o.c} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><div className="text-xl font-bold tabular-nums">{compact(outTotal)}</div><div className="text-muted text-xs">applications</div></div></div>
          </div>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {outcomes.map((o) => <li key={o.name} className="flex items-center gap-2"><span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: o.c }} /><span className="text-muted flex-1">{o.name}</span><b className="tabular-nums">{((o.v / outTotal) * 100).toFixed(1)}%</b></li>)}
          </ul>
        </Panel>

        <Panel className="xl:col-span-6" title="Conversion funnel" sub="From pre-selected offer to disbursement">
          <ChartBox className="h-64" label={`Of ${funnel[0].v.toLocaleString()} pre-selected offers, ${funnel[1].v.toLocaleString()} apply and ${funnel[4].v.toLocaleString()} are disbursed.`}>
            <BarChart data={funnel} layout="vertical" margin={{ left: 10, right: 70 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={130} tick={tick} axisLine={false} tickLine={false} />
              <CTip {...tip} cursor={{ fill: 'var(--hover-wash)' }} />
              <Bar dataKey="v" name="Customers" radius={[0, 8, 8, 0]} isAnimationActive={anim}>
                {funnel.map((f) => <Cell key={f.name} fill={f.c} />)}
                <LabelList dataKey="v" position="right" formatter={(v: unknown) => Number(v).toLocaleString('en-US')} style={{ fill: 'var(--fg)', fontSize: 12, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ChartBox>
        </Panel>

        <Panel className="xl:col-span-6" title="Why applications are rejected" sub="Share of rejections; knock-out rules come from Pre-select">
          <ChartBox className="h-64" label="Bad credit history knock-outs are the largest single rejection reason at 31%, followed by low credit score at 24%.">
            <BarChart data={reasons} layout="vertical" margin={{ left: 10, right: 40 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={200} tick={tick} axisLine={false} tickLine={false} />
              <CTip {...tip} cursor={{ fill: 'var(--hover-wash)' }} formatter={(v) => `${v}%`} />
              <Bar dataKey="v" name="Share" radius={[0, 8, 8, 0]} fill="var(--chart-1)" isAnimationActive={anim}>
                <LabelList dataKey="v" position="right" formatter={(v: unknown) => `${v}%`} style={{ fill: 'var(--fg)', fontSize: 12, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ChartBox>
        </Panel>

        <Panel className="xl:col-span-12" title="Performance by lending program" sub="Selected products in the chosen period">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Program</th><th>Status</th><th className="text-right">Applications</th><th className="text-right">Approval rate</th><th className="text-right">Disbursed</th><th className="text-right">PAR 30</th></tr></thead>
              <tbody>
                {rows.map(({ p, apps, rate, disb, par }) => (
                  <tr key={p.id} className="data-row">
                    <td><div className="font-semibold">{p.name}</div><div className="text-muted text-xs">{p.code} · {p.productType} / {p.subType}</div></td>
                    <td><Pill tone={p.status === 'Active' ? 'success' : 'warning'}>{p.status}</Pill></td>
                    <td className="text-right tabular-nums">{apps.toLocaleString('en-US')}</td>
                    <td className="text-right tabular-nums">{rate}%</td>
                    <td className="text-right tabular-nums">{money(disb)}</td>
                    <td className="text-right"><Pill tone={par > 3.5 ? 'danger' : par > 2.5 ? 'warning' : 'success'}>{par.toFixed(1)}%</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-muted mt-3 flex items-center gap-1.5 text-xs"><BadgeCheck size={14} aria-hidden /> Prototype data: figures are synthetic and generated for demonstration only.</p>
        </Panel>
      </div>
    </>
  )
}
