export type PageId = 'dashboard' | 'products' | 'preselect' | 'employers' | 'approvals' | 'users'
export type ModuleId = PageId
export type Action = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'approve2'
export type Perms = Record<ModuleId, Action[]>

export type Status = 'Draft' | 'Pending Line Manager' | 'Pending CPO' | 'Active' | 'Paused' | 'Retired' | 'Rejected'
export interface Approval { step: 'submitted' | 'l1' | 'l2'; decision: 'submitted' | 'approved' | 'rejected'; by: string; at: string; note?: string }

export interface Role { id: string; name: string; desc: string; perms: Perms; system?: boolean }
export interface User { id: string; name: string; email: string; roleId: string; status: 'Active' | 'Invited' | 'Disabled'; lastLogin: string; team: string }

export interface Program {
  id: string; code: string; name: string; productType: string; subType: string; currency: 'USD' | 'KHR' | 'Both'
  amountBasis: 'loan' | 'cash'; minAmt: number; maxAmt: number; minTenor: number; maxTenor: number
  rate: number; rateFlexible: boolean; fee: number; feeFlexible: boolean; repay: string
  earlyRepay: boolean; earlyFee: number; lateFee: number; graceDays: number; defaultRate: number; insurance: boolean; insuranceRate: number; insurancePeriod: 'upfront' | 'monthly' | 'yearly'; insuranceBasis: 'original' | 'declining'
  status: Status; trail: Approval[]; created: string
}

export type EmployerCategory = 'highRisk' | 'lowStaff' | 'rgc' | 'redZone'
export interface Employer { id: string; category: EmployerCategory; accountNo: string; name: string; added: string; addedBy: string }

export interface Cond { id: string; key: string; op: string; value: string; value2: string; list: string[]; connector: 'AND' | 'OR'; exclude?: boolean; months?: number }
export type KoState = Record<string, { on: boolean; num?: number; list?: string[] }>
export interface PreSelect { id: string; name: string; programIds: string[]; status: Status; trail: Approval[]; conds: Cond[]; ko: KoState; updated: string; owner: string }
