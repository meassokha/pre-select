import type { Cond, KoState } from './types'

/* ---------- synthetic customer base (seeded, so numbers are stable between reloads) ---------- */
export interface Customer {
  id: string; name: string; age: number; province: string; payroll: boolean; avgSalary: number; acctAge: number; balance: number
  activeLoan: boolean; logins30: number
  pep: boolean; zone: 'Green' | 'Amber' | 'Red'; industry: string; employees: number; rgc: boolean
  lastDigitalLoan: number | null // months since last digital loan disbursement
  lastDpd1: number | null // months since last DPD (#1) record
  dpd2: boolean; writeOff: boolean; grade: string
  vip: boolean; vvip: boolean; activeDigital: boolean; activeConv: boolean
  kyc: 'Full KYC' | 'Partial KYC' | 'Basic KYC'; nationality: 'Cambodian' | 'Expat'
}

export const PROVINCES = ['Phnom Penh', 'Siem Reap', 'Battambang', 'Kampong Cham', 'Sihanoukville', 'Kandal']
export const INDUSTRIES = ['Garment & Footwear', 'Retail', 'Construction', 'Hospitality', 'Banking & Finance', 'Education', 'Logistics', 'Casino & Gambling', 'Money Exchange', 'Crypto / Virtual Assets', 'Karaoke & Nightlife']
export const HIGH_RISK_DEFAULT = ['Casino & Gambling', 'Money Exchange', 'Crypto / Virtual Assets', 'Karaoke & Nightlife']

function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const FIRST = ['Sokha', 'Dara', 'Vannak', 'Srey', 'Chantha', 'Rithy', 'Sophea', 'Bopha', 'Visal', 'Kunthea', 'Piseth', 'Maly', 'Narith', 'Sreyneang', 'Pheakdey', 'Lina']
const LAST = ['Chea', 'Sok', 'Kim', 'Ly', 'Heng', 'Meas', 'Chan', 'Phan', 'Keo', 'Ros', 'Touch', 'Nguon']

export const POP: Customer[] = (() => {
  const r = rng(20261111)
  const pick = (a: string[]) => a[Math.floor(r() * a.length)]
  const out: Customer[] = []
  for (let i = 0; i < 5000; i++) {
    const payroll = r() < 0.55
    const hr = r() < 0.045
    const employees = Math.round(Math.exp(3.4 + r() * 4.2))
    const salary = Math.round(150 + r() * r() * 1500)
    const z = r()
    out.push({
      id: `C${100000 + i}`, name: `${pick(FIRST)} ${pick(LAST)}`,
      age: Math.round(19 + r() * 41), province: r() < 0.45 ? 'Phnom Penh' : pick(PROVINCES), payroll,
      avgSalary: payroll ? salary : Math.round(r() * 120), acctAge: Math.round(r() * 96), balance: Math.round(r() * r() * 4000),
      activeLoan: r() < 0.22, logins30: Math.round(r() * r() * 40),
      pep: r() < 0.012, zone: z < 0.06 ? 'Red' : z < 0.2 ? 'Amber' : 'Green',
      industry: hr ? pick(HIGH_RISK_DEFAULT) : pick(INDUSTRIES.slice(0, 7)), employees, rgc: r() < 0.09,
      lastDigitalLoan: r() < 0.16 ? Math.floor(r() * 12) : null,
      lastDpd1: r() < 0.14 ? Math.floor(r() * 18) : null,
      dpd2: r() < 0.05, writeOff: r() < 0.012,
      kyc: 'Full KYC', nationality: 'Cambodian', grade: 'CC', vip: false, vvip: false, activeDigital: false, activeConv: false,
    })
    r(); r() // keep the random stream identical to earlier versions (two removed attributes)
  }
  // new attributes use their own generator so the original population stays unchanged
  const r2 = rng(424242)
  for (const c of out) {
    const k = r2()
    c.kyc = k < 0.62 ? 'Full KYC' : k < 0.88 ? 'Partial KYC' : 'Basic KYC'
    c.nationality = r2() < 0.07 ? 'Expat' : 'Cambodian'
    const g = r2()
    c.grade = g < 0.17 ? 'AA' : g < 0.40 ? 'BB' : g < 0.62 ? 'CC' : g < 0.80 ? 'DD' : g < 0.93 ? 'EE' : `SE${1 + Math.floor(r2() * 7)}`
  }
  // another independent generator for the later attributes
  const r3 = rng(909090)
  for (const c of out) {
    const t = r3()
    c.vvip = t < 0.015
    c.vip = !c.vvip && t < 0.075
    if (c.activeLoan) {
      const k = r3()
      c.activeDigital = k < 0.4 || k >= 0.9
      c.activeConv = k >= 0.4
    }
  }
  return out
})()

/* ---------- selection variables (same idea as the NBO prototype) ---------- */
export type FieldType = 'number' | 'text' | 'yesno'
export interface Variable { key: keyof Customer; label: string; type: FieldType; unit?: string; options?: string[]; months?: boolean; noOp?: boolean }
export const GRADES = ['AA', 'BB', 'CC', 'DD', 'EE', 'SE1', 'SE2', 'SE3', 'SE4', 'SE5', 'SE6', 'SE7']
export const GRADE_OPTIONS = [
  'AA - 1400 and more', 'BB - 1251 to 1400', 'CC - 1101 to 1250', 'DD - 926 to 1100', 'EE - 100 to 925',
  'SE1 - No information with bureau', 'SE2 - Age under 18 or over 80', 'SE3 - No primary account or no valid repayment status', 'SE4 - No active bureau information in any currency',
  'SE5 - Deceased', 'SE6 - Latest payment 90+ days past due in the last 30 days', 'SE7 - Written off with no active account',
]
export const KYC_LEVELS = ['Full KYC', 'Partial KYC', 'Basic KYC']
export const KYC_OPTIONS = [...KYC_LEVELS, 'All KYC types']
export const NATIONALITIES = ['Cambodian', 'Expat', 'Both']
/** average salary over the last m months (synthetic: each customer has a small stable up/down trend; m = 3 equals avgSalary) */
export function avgSalaryFor(c: Customer, m: number): number {
  const trend = (((Number(c.id.slice(1)) * 37) % 21) - 10) / 100
  return Math.max(0, Math.round(c.avgSalary * (1 + (trend * (m - 3)) / 9)))
}
export const VARIABLES: Variable[] = [
  { key: 'age', label: 'Age', type: 'number', unit: 'years' },
  { key: 'province', label: 'Province', type: 'text', options: PROVINCES },
  { key: 'payroll', label: 'Payroll customer', type: 'yesno' },
  { key: 'avgSalary', label: 'Avg salary (last N months)', type: 'number', unit: 'USD', months: true },
  { key: 'acctAge', label: 'Account age', type: 'number', unit: 'months' },
  { key: 'balance', label: 'Avg ending balance (3m)', type: 'number', unit: 'USD' },
  { key: 'activeLoan', label: 'Has active all type of loan', type: 'yesno' },
  { key: 'activeDigital', label: 'Has active Digital Loan', type: 'yesno' },
  { key: 'activeConv', label: 'Has active Conventional Loan', type: 'yesno' },
  { key: 'vip', label: 'VIP', type: 'yesno' },
  { key: 'vvip', label: 'VVIP', type: 'yesno' },
  { key: 'logins30', label: 'App logins in last 30 days', type: 'number' },
  { key: 'kyc', label: 'KYC level', type: 'text', options: KYC_OPTIONS, noOp: true },
  { key: 'nationality', label: 'Nationality', type: 'text', options: NATIONALITIES, noOp: true },
]
export const OPERATORS: Record<FieldType, string[]> = {
  number: ['=', '≠', '>', '≥', '<', '≤', 'Between'],
  text: ['Equals', 'Not equals', 'In list', 'Not in list'],
  yesno: ['Is Yes', 'Is No'],
}
export const variable = (k: string) => VARIABLES.find((v) => v.key === k) ?? VARIABLES[0]

export function matchCond(c: Customer, k: Cond): boolean {
  const v = variable(k.key)
  const x = v.key === 'avgSalary' ? avgSalaryFor(c, k.months ?? 3) : c[v.key]
  if (v.type === 'yesno') return k.op === 'Is Yes' ? x === true : x === false
  if (v.type === 'text') {
    // nationality "Both" means Cambodian and expat
    const exp = (a: string[]) => (v.key === 'nationality' && a.includes('Both') ? NATIONALITIES : v.key === 'kyc' && a.includes('All KYC types') ? KYC_LEVELS : a)
    if (k.op === 'In list') return exp(k.list).includes(String(x))
    if (k.op === 'Not in list') return !exp(k.list).includes(String(x))
    return k.op === 'Equals' ? exp([k.value]).includes(String(x)) : !exp([k.value]).includes(String(x))
  }
  const n = x as number
  const a = Number(k.value)
  const b = Number(k.value2)
  switch (k.op) {
    case '=': return n === a
    case '≠': return n !== a
    case '>': return n > a
    case '≥': return n >= a
    case '<': return n < a
    case '≤': return n <= a
    default: return n >= a && n <= b
  }
}
/** include conditions combine top to bottom: "1 AND 2 OR 3" means (1 AND 2) OR 3. Exclude conditions always remove the customers they match. */
export function matchAll(c: Customer, conds: Cond[]): boolean {
  const inc = conds.filter((k) => !k.exclude)
  if (conds.some((k) => k.exclude && matchCond(c, k))) return false
  if (!inc.length) return true
  let res = matchCond(c, inc[0])
  for (const k of inc.slice(1)) res = k.connector === 'AND' ? res && matchCond(c, k) : res || matchCond(c, k)
  return res
}

/* ---------- knock-out rules ---------- */
export type KoGroup = 'Compliance & risk' | 'Employer' | 'Credit behaviour' | 'Bad credit history'
export interface KoDef {
  key: string; label: string; group: KoGroup; desc: string
  param?: { kind: 'num'; label: string; unit: string; def: number } | { kind: 'list'; label: string; options: string[]; def: string[] }
  hit: (c: Customer, p: { num?: number; list?: string[] }) => boolean
}
export const KO_GROUPS: KoGroup[] = ['Compliance & risk', 'Employer', 'Credit behaviour', 'Bad credit history']
export const KO_DEFS: KoDef[] = [
  { key: 'pep', label: 'PEP in AML', group: 'Compliance & risk', desc: 'Customer is flagged as a Politically Exposed Person in the AML screening result.', hit: (c) => c.pep },
  { key: 'red_zone', label: 'Workplace in Red zone', group: 'Compliance & risk', desc: 'Workplace location is classed as a Red (restricted) zone by Risk.', hit: (c) => c.zone === 'Red' },
  { key: 'high_risk_industry', label: 'Workplace in high-risk industry', group: 'Compliance & risk', desc: 'Employer industry is on the high-risk list (casino and similar).',
    param: { kind: 'list', label: 'Industries', options: INDUSTRIES, def: HIGH_RISK_DEFAULT }, hit: (c, p) => (p.list ?? []).includes(c.industry) },
  { key: 'low_employee', label: 'Low employee company', group: 'Employer', desc: 'Employer has fewer employees than the threshold.',
    param: { kind: 'num', label: 'Fewer than', unit: 'employees', def: 50 }, hit: (c, p) => c.employees < (p.num ?? 50) },
  { key: 'rgc', label: 'RGC employee excluded', group: 'Employer', desc: 'Royal Government of Cambodia (civil servant) employees are excluded.', hit: (c) => c.rgc },
  { key: 'digital_loan', label: 'Digital loan disbursement history', group: 'Credit behaviour', desc: 'Customer received a digital loan disbursement within the look-back window.',
    param: { kind: 'num', label: 'In the last', unit: 'months', def: 3 }, hit: (c, p) => c.lastDigitalLoan !== null && c.lastDigitalLoan < (p.num ?? 3) },
  { key: 'dpd1', label: 'DPD (#1) in the most recent months', group: 'Bad credit history', desc: 'Any first-level delinquency (DPD #1) in the most recent months.',
    param: { kind: 'num', label: 'In the last', unit: 'months', def: 3 }, hit: (c, p) => c.lastDpd1 !== null && c.lastDpd1 < (p.num ?? 3) },
  { key: 'dpd2', label: 'DPD (#2+) in any history record', group: 'Bad credit history', desc: 'Second or later delinquency (DPD #2+) anywhere in the credit history.', hit: (c) => c.dpd2 },
  { key: 'writeoff', label: 'Write-off credit history', group: 'Bad credit history', desc: 'Customer has a written-off credit facility in history.', hit: (c) => c.writeOff },
  { key: 'risk_grade', label: 'Risk Grade', group: 'Bad credit history', desc: 'Bureau risk grade is one of the selected grades (AA to EE by score, SE1 to SE7 special status).',
    param: { kind: 'list', label: 'Knock out grades', options: GRADE_OPTIONS, def: GRADE_OPTIONS.slice(5) }, hit: (c, p) => (p.list ?? []).some((x) => x.split(' ')[0] === c.grade) },
]
export const defaultKo = (on: string[] = []): KoState =>
  Object.fromEntries(KO_DEFS.map((d) => [d.key, { on: on.includes(d.key), num: d.param?.kind === 'num' ? d.param.def : undefined, list: d.param?.kind === 'list' ? d.param.def : undefined }]))

export const koReasons = (c: Customer, ko: KoState) => KO_DEFS.filter((d) => ko[d.key]?.on && d.hit(c, ko[d.key])).map((d) => d.label)

export interface Evaluation {
  total: number; selected: number; eligible: number
  koHits: Record<string, number> // independent hits among selected customers
  rows: { c: Customer; selected: boolean; reasons: string[] }[]
  condReach: number[]
}
export function evaluate(conds: Cond[], ko: KoState): Evaluation {
  const koHits: Record<string, number> = {}
  const rows = POP.map((c) => ({ c, selected: matchAll(c, conds), reasons: koReasons(c, ko) }))
  let selected = 0
  let eligible = 0
  for (const r of rows) {
    if (!r.selected) continue
    selected++
    if (!r.reasons.length) eligible++
    for (const d of KO_DEFS) if (ko[d.key]?.on && d.hit(r.c, ko[d.key])) koHits[d.key] = (koHits[d.key] ?? 0) + 1
  }
  const condReach = conds.map((k) => POP.filter((c) => matchCond(c, k)).length)
  return { total: POP.length, selected, eligible, koHits, rows, condReach }
}
