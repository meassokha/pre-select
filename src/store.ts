import { create } from 'zustand'
import type { Action, Approval, Employer, EmployerCategory, ModuleId, PageId, PreSelect, Program, Role, User } from './data/types'
import { EMPLOYERS, PRESELECTS, PROGRAMS, ROLES, USERS } from './data/seed'

let seq = 100
export const uid = (p: string) => `${p}${++seq}`
export const today = () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

const readCollapsed = () => {
  try { const v = localStorage.getItem('lms-sidebar'); return v === null ? window.innerWidth < 1280 : v === '1' } catch { return false }
}

interface S {
  page: PageId; go: (p: PageId) => void
  collapsed: boolean; toggleSidebar: () => void
  drawer: boolean; setDrawer: (b: boolean) => void
  meId: string; setMe: (id: string) => void
  roles: Role[]; users: User[]; programs: Program[]; preselects: PreSelect[]; employers: Employer[]
  toast: { id: number; text: string } | null; notify: (t: string) => void
  addUser: (u: Omit<User, 'id' | 'lastLogin'>) => void; patchUser: (id: string, p: Partial<User>) => void; removeUser: (id: string) => void
  addRole: (r: Omit<Role, 'id'>) => string; togglePerm: (roleId: string, m: ModuleId, a: Action) => void; removeRole: (id: string) => void
  saveProgram: (p: Program) => void; patchProgram: (id: string, p: Partial<Program>) => void; removeProgram: (id: string) => void
  savePreselect: (p: PreSelect) => void; patchPreselect: (id: string, p: Partial<PreSelect>) => void; removePreselect: (id: string) => void
  addEmployers: (cat: EmployerCategory, rows: { accountNo: string; name: string }[], by: string) => void; removeEmployer: (id: string) => void
  workflow: (kind: 'program' | 'preselect', id: string, act: 'submit' | 'approve' | 'reject', by: string, note?: string) => void
  reset: () => void
}

const NAV: PageId[] = ['dashboard', 'products', 'preselect', 'employers', 'approvals', 'users']
export const canView = (roles: Role[], users: User[], meId: string, m: ModuleId) => !!roles.find((r) => r.id === users.find((u) => u.id === meId)?.roleId)?.perms[m].includes('view')

export const useStore = create<S>((set, get) => ({
  page: 'dashboard', // Dashboard is always the landing page
  go: (page) => set({ page }),
  collapsed: readCollapsed(),
  toggleSidebar: () => set((s) => {
    try { localStorage.setItem('lms-sidebar', s.collapsed ? '0' : '1') } catch { /* ignore */ }
    return { collapsed: !s.collapsed }
  }),
  drawer: false, setDrawer: (drawer) => set({ drawer }),
  meId: 'u1',
  setMe: (meId) => {
    set({ meId })
    const s = get()
    if (!canView(s.roles, s.users, meId, s.page)) set({ page: NAV.find((p) => canView(s.roles, s.users, meId, p)) ?? 'dashboard' })
  },
  roles: ROLES, users: USERS, programs: PROGRAMS, preselects: PRESELECTS, employers: EMPLOYERS,
  toast: null,
  notify: (text) => {
    const id = Date.now()
    set({ toast: { id, text } })
    setTimeout(() => get().toast?.id === id && set({ toast: null }), 3200)
  },
  addUser: (u) => set((s) => ({ users: [{ ...u, id: uid('u'), lastLogin: 'Never' }, ...s.users] })),
  patchUser: (id, p) => set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, ...p } : u)) })),
  removeUser: (id) => set((s) => ({ users: s.users.filter((u) => u.id !== id) })),
  addRole: (r) => {
    const id = uid('r')
    set((s) => ({ roles: [...s.roles, { ...r, id }] }))
    return id
  },
  togglePerm: (roleId, m, a) => set((s) => ({
    roles: s.roles.map((r) => {
      if (r.id !== roleId) return r
      const has = r.perms[m].includes(a)
      let next = has ? r.perms[m].filter((x) => x !== a) : [...r.perms[m], a]
      if (a === 'view' && has) next = [] // no view, no access at all
      if (a !== 'view' && !has && !next.includes('view')) next = [...next, 'view']
      return { ...r, perms: { ...r.perms, [m]: next } }
    }),
  })),
  removeRole: (id) => set((s) => ({ roles: s.roles.filter((r) => r.id !== id) })),
  saveProgram: (p) => set((s) => ({ programs: s.programs.some((x) => x.id === p.id) ? s.programs.map((x) => (x.id === p.id ? p : x)) : [p, ...s.programs] })),
  patchProgram: (id, p) => set((s) => ({ programs: s.programs.map((x) => (x.id === id ? { ...x, ...p } : x)) })),
  removeProgram: (id) => set((s) => ({ programs: s.programs.filter((x) => x.id !== id) })),
  savePreselect: (p) => set((s) => ({ preselects: s.preselects.some((x) => x.id === p.id) ? s.preselects.map((x) => (x.id === p.id ? p : x)) : [p, ...s.preselects] })),
  patchPreselect: (id, p) => set((s) => ({ preselects: s.preselects.map((x) => (x.id === id ? { ...x, ...p } : x)) })),
  removePreselect: (id) => set((s) => ({ preselects: s.preselects.filter((x) => x.id !== id) })),
  addEmployers: (category, rows, by) => set((s) => ({ employers: [...rows.map((r) => ({ id: uid('e'), category, accountNo: r.accountNo, name: r.name, added: today(), addedBy: by })), ...s.employers] })),
  removeEmployer: (id) => set((s) => ({ employers: s.employers.filter((e) => e.id !== id) })),
  workflow: (kind, id, act, by, note) => {
    const adv = <T extends { status: PreSelect['status']; trail: Approval[] }>(x: T): T => {
      const at = today()
      if (act === 'submit') return { ...x, status: 'Pending Line Manager', trail: [...x.trail, { step: 'submitted', decision: 'submitted', by, at }] }
      const l1 = x.status === 'Pending Line Manager'
      const step = l1 ? 'l1' : 'l2'
      if (act === 'reject') return { ...x, status: 'Rejected', trail: [...x.trail, { step, decision: 'rejected', by, at, note }] }
      return { ...x, status: l1 ? 'Pending CPO' : 'Active', trail: [...x.trail, { step, decision: 'approved', by, at }] }
    }
    if (kind === 'program') set((s) => ({ programs: s.programs.map((x) => (x.id === id ? adv(x) : x)) }))
    else set((s) => ({ preselects: s.preselects.map((x) => (x.id === id ? adv(x) : x)) }))
  },
  reset: () => set({ employers: EMPLOYERS, roles: ROLES, users: USERS, programs: PROGRAMS, preselects: PRESELECTS, meId: 'u1', page: 'dashboard' }),
}))

/** permission check for whoever the prototype is currently "viewing as" */
export function useCan() {
  const roles = useStore((s) => s.roles)
  const users = useStore((s) => s.users)
  const meId = useStore((s) => s.meId)
  const role = roles.find((r) => r.id === users.find((u) => u.id === meId)?.roleId)
  return (m: ModuleId, a: Action) => !!role?.perms[m].includes(a)
}
