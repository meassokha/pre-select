import type { Action, Approval, Employer, EmployerCategory, ModuleId, Perms, PreSelect, Program, Role, User } from './types'
import { defaultKo } from './customers'

export const MODULES: { id: ModuleId; label: string; desc: string }[] = [
  { id: 'dashboard', label: 'Dashboard', desc: 'Loan application performance analytics' },
  { id: 'products', label: 'Product configuration', desc: 'Lending programs, limits, pricing' },
  { id: 'preselect', label: 'Pre-select', desc: 'Selection and knock-out rules per program' },
  { id: 'employers', label: 'Employer configuration', desc: 'High-risk, low staff and RGC employer lists' },
  { id: 'approvals', label: 'Approvals', desc: 'Two-level approval: Line Manager, then CPO' },
  { id: 'users', label: 'User management', desc: 'Users, roles and permissions' },
]
export const ACTIONS: { id: Action; label: string }[] = [
  { id: 'view', label: 'View' }, { id: 'create', label: 'Create' }, { id: 'edit', label: 'Edit' }, { id: 'delete', label: 'Delete' }, { id: 'approve', label: 'Approve L1 (Line Manager)' }, { id: 'approve2', label: 'Approve L2 (CPO)' },
]
const all: Action[] = ['view', 'create', 'edit', 'delete']
const perms = (p: Partial<Perms>): Perms => ({ dashboard: [], products: [], preselect: [], employers: [], approvals: [], users: [], ...p })

export const ROLES: Role[] = [
  { id: 'admin', name: 'System Administrator', desc: 'Full access, manages users and roles', system: true, perms: perms({ dashboard: ['view'], products: all, preselect: all, employers: all, approvals: ['view'], users: all }) },
  { id: 'pm', name: 'Product Manager', desc: 'Designs lending programs and pre-select rules', perms: perms({ dashboard: ['view'], products: ['view', 'create', 'edit'], preselect: ['view', 'create', 'edit'], approvals: ['view'] }) },
  { id: 'head', name: 'Line Manager', desc: 'Level 1 approver for lending programs and pre-select', perms: perms({ dashboard: ['view'], products: ['view'], preselect: ['view'], approvals: ['view', 'approve'] }) },
  { id: 'cpo', name: 'Chief Product Officer (CPO)', desc: 'Level 2 (final) approver', perms: perms({ dashboard: ['view'], products: ['view'], preselect: ['view'], approvals: ['view', 'approve2'] }) },
  { id: 'risk', name: 'Credit Risk Analyst', desc: 'Owns knock-out rules', perms: perms({ dashboard: ['view'], products: ['view'], preselect: ['view', 'edit'] }) },
  { id: 'payroll', name: 'Payroll Team', desc: 'Maintains the high-risk, low staff and RGC employer lists', perms: perms({ dashboard: ['view'], employers: ['view', 'create', 'edit', 'delete'] }) },
  { id: 'viewer', name: 'Viewer', desc: 'View-only access to the dashboard', perms: perms({ dashboard: ['view'] }) },
  { id: 'audit', name: 'Auditor (read-only)', desc: 'Read access everywhere', perms: perms({ dashboard: ['view'], products: ['view'], preselect: ['view'], employers: ['view'], approvals: ['view'], users: ['view'] }) },
]

export const USERS: User[] = [
  { id: 'u1', name: 'Sokha Meas', email: 'sokha.meas@example.com', roleId: 'admin', status: 'Active', lastLogin: 'Today, 09:12', team: 'Digital Lending' },
  { id: 'u2', name: 'Dara Chea', email: 'dara.chea@example.com', roleId: 'pm', status: 'Active', lastLogin: 'Today, 08:47', team: 'Product' },
  { id: 'u3', name: 'Srey Pich Ly', email: 'sreypich.ly@example.com', roleId: 'head', status: 'Active', lastLogin: 'Yesterday', team: 'Lending' },
  { id: 'u4', name: 'Vannak Heng', email: 'vannak.heng@example.com', roleId: 'risk', status: 'Active', lastLogin: 'Yesterday', team: 'Credit Risk' },
  { id: 'u5', name: 'Chantha Kim', email: 'chantha.kim@example.com', roleId: 'viewer', status: 'Active', lastLogin: '09 Nov 2026', team: 'Operations' },
  { id: 'u6', name: 'Rithy Phan', email: 'rithy.phan@example.com', roleId: 'audit', status: 'Invited', lastLogin: 'Never', team: 'Internal Audit' },
  { id: 'u9', name: 'CPO', email: 'cpo@example.com', roleId: 'cpo', status: 'Active', lastLogin: 'Today, 07:58', team: 'Executive' },
  { id: 'u8', name: 'Sreymom Ouk', email: 'sreymom.ouk@example.com', roleId: 'payroll', status: 'Active', lastLogin: 'Today, 08:15', team: 'Payroll' },
  { id: 'u7', name: 'Bopha Touch', email: 'bopha.touch@example.com', roleId: 'pm', status: 'Disabled', lastLogin: '02 Oct 2026', team: 'Product' },
]

export const EMPLOYER_CATEGORIES: { id: EmployerCategory; label: string; desc: string }[] = [
  { id: 'highRisk', label: 'High risk employer', desc: 'Companies in high-risk businesses such as casino, money exchange or crypto.' },
  { id: 'lowStaff', label: 'Low staff company', desc: 'Companies with a small workforce (fewer than the knock-out threshold, 50 by default).' },
  { id: 'rgc', label: 'RGC company', desc: 'Royal Government of Cambodia institutions and state employers.' },
  { id: 'redZone', label: 'Red-zone company', desc: 'Companies whose workplace is located in a Red (restricted) zone.' },
]
const emp = (n: number, category: EmployerCategory, accountNo: string, name: string, added: string, addedBy: string): Employer => ({ id: `e${n}`, category, accountNo, name, added, addedBy })
export const EMPLOYERS: Employer[] = [
  emp(1, 'highRisk', '000412881', 'NagaWorld Entertainment Co., Ltd.', '03 Nov 2026', 'Sreymom Ouk'),
  emp(2, 'highRisk', '000518204', 'Bayon Gaming Resort', '03 Nov 2026', 'Sreymom Ouk'),
  emp(3, 'highRisk', '000733190', 'Golden Exchange Services', '06 Nov 2026', 'Sreymom Ouk'),
  emp(4, 'lowStaff', '000290417', 'Sovann Phum Trading', '04 Nov 2026', 'Sreymom Ouk'),
  emp(5, 'lowStaff', '000377652', 'Khmer Craft Workshop', '04 Nov 2026', 'Sreymom Ouk'),
  emp(6, 'rgc', '000100021', 'Ministry of Education, Youth and Sport', '01 Nov 2026', 'Sokha Meas'),
  emp(7, 'rgc', '000100034', 'Ministry of Health', '01 Nov 2026', 'Sokha Meas'),
  emp(8, 'rgc', '000100057', 'Phnom Penh Capital Hall', '01 Nov 2026', 'Sokha Meas'),
  emp(9, 'redZone', '000611305', 'Border Gate Logistics', '05 Nov 2026', 'Sreymom Ouk'),
  emp(10, 'redZone', '000622718', 'Cardamom Mining Supplies', '05 Nov 2026', 'Sreymom Ouk'),
]

export const PRODUCT_TYPES = ['Secure Loan', 'Unsecured Loan', 'Over Draft', 'Installment']
export const SUB_TYPES: Record<string, string[]> = {
  'Secure Loan': ['Personal Loan', 'Mortgage Loan', 'Business Loan', 'Consumption Loan', 'Renovation Loan', 'Refinance'],
  'Unsecured Loan': ['Personal Loan', 'Business Loan', 'Consumption Loan', 'Salary Advance', 'Renovation Loan', 'Refinance'],
  'Over Draft': ['Business Loan', 'Refinance'],
  'Installment': ['Vehicle Loan', 'Consumption Loan'],
}
export const KHR_RATE = 4000
export const REPAYMENTS = ['Equal Monthly installment (EMI)', 'Bullet at payday', 'Weekly installment', 'Equal principal']
export const SALARY_REPAYMENTS = ['First salary date', 'Second salary date']
export const repayOptions = (subType: string) => (subType === 'Salary Advance' ? SALARY_REPAYMENTS : REPAYMENTS)

const EXTRA = { amountBasis: 'loan' as const, earlyRepay: true, earlyFee: 1, lateFee: 27, graceDays: 4, defaultRate: 18, rateFlexible: false, feeFlexible: false, trail: [] as Approval[], insurance: false, insuranceRate: 0, insurancePeriod: 'upfront' as const, insuranceBasis: 'original' as const }
const RAW: Omit<Program, keyof typeof EXTRA>[] = [
  { id: 'p1', code: 'SAL-ADV', name: 'Salary Advance', productType: 'Unsecured Loan', subType: 'Salary Advance', currency: 'USD', minAmt: 50, maxAmt: 500, minTenor: 1, maxTenor: 1, rate: 0, fee: 3, repay: 'First salary date', status: 'Active', created: '12 Mar 2026' },
  { id: 'p2', code: 'PL-DIGI', name: 'Digital Personal Loan', productType: 'Unsecured Loan', subType: 'Personal Loan', currency: 'USD', minAmt: 300, maxAmt: 5000, minTenor: 6, maxTenor: 24, rate: 18, fee: 1, repay: 'Equal Monthly installment (EMI)', status: 'Active', created: '02 Apr 2026' },
  { id: 'p3', code: 'ML-QUICK', name: 'Quick Micro Loan', productType: 'Unsecured Loan', subType: 'Business Loan', currency: 'KHR', minAmt: 400000, maxAmt: 4000000, minTenor: 3, maxTenor: 12, rate: 24, fee: 1.5, repay: 'Equal Monthly installment (EMI)', status: 'Active', created: '19 Jun 2026' },
  { id: 'p4', code: 'TU-LOYAL', name: 'Loyalty Top-up', productType: 'Unsecured Loan', subType: 'Refinance', currency: 'USD', minAmt: 200, maxAmt: 3000, minTenor: 6, maxTenor: 18, rate: 16, fee: 0.5, repay: 'Equal Monthly installment (EMI)', status: 'Paused', created: '28 Aug 2026' },
  { id: 'p6', code: 'DREAM-CARD', name: 'Dream Card', productType: 'Unsecured Loan', subType: 'Consumption Loan', currency: 'USD', minAmt: 200, maxAmt: 5000, minTenor: 1, maxTenor: 12, rate: 24, fee: 0, repay: 'Equal Monthly installment (EMI)', status: 'Active', created: '05 Nov 2026' },
  { id: 'p7', code: 'SPLIT-PAY', name: 'Split Pay', productType: 'Installment', subType: 'Consumption Loan', currency: 'USD', minAmt: 50, maxAmt: 1500, minTenor: 3, maxTenor: 6, rate: 0, fee: 2, repay: 'Equal Monthly installment (EMI)', status: 'Active', created: '05 Nov 2026' },
  { id: 'p8', code: 'PRE-SELECT', name: 'Pre-Select', productType: 'Unsecured Loan', subType: 'Personal Loan', currency: 'USD', minAmt: 500, maxAmt: 20000, minTenor: 3, maxTenor: 36, rate: 0, fee: 0, repay: 'Equal Monthly installment (EMI)', status: 'Active', created: '12 Nov 2026' },
  { id: 'p5', code: 'PL-FEST', name: 'Festival Loan 2026', productType: 'Unsecured Loan', subType: 'Consumption Loan', currency: 'USD', minAmt: 100, maxAmt: 1500, minTenor: 3, maxTenor: 6, rate: 15, fee: 1, repay: 'Equal principal', status: 'Draft', created: '03 Nov 2026' },
]
const tr = (step: Approval['step'], decision: Approval['decision'], by: string, at: string, note?: string): Approval => ({ step, decision, by, at, note })
export const PROGRAMS: Program[] = RAW.map((p) => ({ ...EXTRA, ...p, ...(p.code === 'SAL-ADV' ? { earlyRepay: false, graceDays: 0 } : {}), ...(p.code === 'PL-DIGI' ? { rateFlexible: true } : {}), ...(p.code === 'PL-FEST' ? { status: 'Pending Line Manager' as const, trail: [tr('submitted', 'submitted', 'Dara Chea', '10 Nov 2026')] } : {}), ...(p.code === 'PRE-SELECT' ? { amountBasis: 'cash' as const, rateFlexible: true, feeFlexible: true, earlyRepay: true, earlyFee: 0, lateFee: 27, defaultRate: 18, insurance: true, insuranceRate: 0.2, insurancePeriod: 'monthly' as const, insuranceBasis: 'declining' as const } : {}), ...(p.code === 'PL-DIGI' ? { insurance: true, insuranceRate: 0.8 } : {}) }))

let n = 0
const cid = () => `s${++n}`
const cond = (key: string, op: string, value = '', value2 = '', list: string[] = [], connector: 'AND' | 'OR' = 'AND') => ({ id: cid(), key, op, value, value2, list, connector })

export const PRESELECTS: PreSelect[] = [
  {
    id: 'ps1', name: 'Payroll customers - Salary Advance', programIds: ['p1'], status: 'Active', owner: 'Dara Chea', updated: '08 Nov 2026',
    trail: [tr('submitted', 'submitted', 'Dara Chea', '05 Nov 2026'), tr('l1', 'approved', 'Srey Pich Ly', '06 Nov 2026'), tr('l2', 'approved', 'CPO', '08 Nov 2026')],
    conds: [cond('payroll', 'Is Yes'), cond('avgSalary', '≥', '250'), cond('acctAge', '≥', '3')],
    ko: defaultKo(['pep', 'red_zone', 'high_risk_industry', 'low_employee', 'rgc', 'digital_loan', 'dpd1', 'dpd2', 'writeoff', 'risk_grade']),
  },
  {
    id: 'ps2', name: 'Engaged savers - Personal Loan', programIds: ['p2'], status: 'Pending CPO', owner: 'Dara Chea', updated: '10 Nov 2026',
    trail: [tr('submitted', 'submitted', 'Dara Chea', '09 Nov 2026'), tr('l1', 'approved', 'Srey Pich Ly', '10 Nov 2026')],
    conds: [cond('age', 'Between', '23', '55'), cond('balance', '≥', '300'), cond('logins30', '≥', '8')],
    ko: defaultKo(['pep', 'red_zone', 'high_risk_industry', 'dpd2', 'writeoff', 'risk_grade']),
  },
  {
    id: 'ps3', name: 'Phnom Penh & Kandal micro - Quick Micro Loan', programIds: ['p3'], status: 'Rejected', owner: 'Vannak Heng', updated: '05 Nov 2026',
    trail: [tr('submitted', 'submitted', 'Vannak Heng', '06 Nov 2026'), tr('l1', 'rejected', 'Srey Pich Ly', '07 Nov 2026', 'Please add the low employee knock-out and resubmit.')],
    conds: [cond('province', 'In list', '', '', ['Phnom Penh', 'Kandal']), cond('activeLoan', 'Is No')],
    ko: defaultKo(['pep', 'rgc', 'dpd1', 'dpd2', 'writeoff']),
  },
  {
    id: 'ps4', name: 'Digital shoppers - Dream Card and Split Pay', programIds: ['p6', 'p7'], status: 'Draft', owner: 'Dara Chea', updated: '11 Nov 2026', trail: [],
    conds: [cond('kyc', 'Equals', 'Full KYC'), cond('nationality', 'Equals', 'Both'), cond('logins30', '≥', '5')],
    ko: defaultKo(['pep', 'red_zone', 'high_risk_industry', 'dpd1', 'dpd2', 'writeoff', 'risk_grade']),
  },
]
