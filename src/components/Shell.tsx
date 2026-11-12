import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Bell, Building2, ClipboardCheck, LayoutDashboard, ListFilter, Menu, Moon, PanelLeftClose, PanelLeftOpen, RotateCcw, Sun, UserCog, Wallet, X, type LucideIcon } from 'lucide-react'
import { spring, hover, hoverTransition } from '../lib/motion'
import { useDesign } from '../lib/design'
import { useStore } from '../store'
import type { PageId } from '../data/types'
import { Tooltip } from './Tooltip'
import { ToastHost } from './ui'

const W_OPEN = 264
const W_RAIL = 76
const useMedia = (q: string) => {
  const [m, setM] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const l = window.matchMedia(q)
    const f = () => setM(l.matches)
    l.addEventListener('change', f)
    return () => l.removeEventListener('change', f)
  }, [q])
  return m
}

interface Item { id: PageId; label: string; icon: LucideIcon }
const GROUPS: { title: string; items: Item[] }[] = [
  { title: 'Overview', items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  { title: 'Lending', items: [{ id: 'products', label: 'Product configuration', icon: Wallet }, { id: 'preselect', label: 'Pre-select', icon: ListFilter }, { id: 'employers', label: 'Employer configuration', icon: Building2 }] },
  { title: 'Workflow', items: [{ id: 'approvals', label: 'Approvals', icon: ClipboardCheck }] },
  { title: 'Administration', items: [{ id: 'users', label: 'User management', icon: UserCog }] },
]

function NavLink({ item, active, collapsed, onGo }: { item: Item; active: boolean; collapsed: boolean; onGo: (id: PageId) => void }) {
  const ref = useRef<HTMLAnchorElement>(null)
  const [tip, setTip] = useState(false)
  const Icon = item.icon
  return (
    <li>
      <motion.a ref={ref} href={`#${item.id}`} aria-current={active ? 'page' : undefined} aria-label={collapsed ? item.label : undefined}
        onClick={(e) => { e.preventDefault(); onGo(item.id) }}
        onHoverStart={() => setTip(true)} onHoverEnd={() => setTip(false)} onFocus={() => setTip(true)} onBlur={() => setTip(false)}
        initial="rest" animate="rest" whileHover="hover" whileFocus="hover" whileTap="tap"
        className="nav-link relative flex h-11 items-center gap-3 rounded-[var(--radius-sm)] px-[14px] text-[14.5px] font-semibold outline-none" data-active={active || undefined}>
        {active && <motion.span layoutId="nav-active" className="nav-active absolute inset-0 rounded-[inherit]" transition={spring.snappy} />}
        <motion.span aria-hidden className="nav-hover absolute inset-0 rounded-[inherit]" variants={{ rest: { opacity: 0 }, hover: { opacity: 1 }, tap: { opacity: 1 } }} transition={{ duration: 0.15 }} />
        <motion.span className="relative z-10 grid size-5 shrink-0 place-items-center" variants={{ rest: { scale: 1, rotate: 0 }, hover: hover.icon, tap: { scale: 0.9 } }} transition={hoverTransition}>
          <Icon size={20} strokeWidth={1.9} aria-hidden />
        </motion.span>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.span key="l" className="relative z-10 flex-1 truncate whitespace-nowrap" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0, transition: { delay: 0.06, duration: 0.18 } }} exit={{ opacity: 0, x: -8, transition: { duration: 0.1 } }}>
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.a>
      <Tooltip anchor={ref} label={item.label} open={collapsed && tip} />
    </li>
  )
}

function NavList({ collapsed, onGo }: { collapsed: boolean; onGo: (id: PageId) => void }) {
  const page = useStore((s) => s.page)
  const roles = useStore((s) => s.roles)
  const users = useStore((s) => s.users)
  const meId = useStore((s) => s.meId)
  const perms = roles.find((r) => r.id === users.find((u) => u.id === meId)?.roleId)?.perms
  return (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2" aria-label="Primary">
      {GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => perms?.[i.id].includes('view')) })).filter((g) => g.items.length).map((g, gi) => (
        <div key={g.title} className={gi ? 'mt-4' : ''}>
          <div className="relative mb-1 h-6 px-[14px]">
            <AnimatePresence initial={false} mode="popLayout">
              {collapsed ? <motion.hr key="r" className="sidebar-rule absolute inset-x-3 top-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
                : <motion.p key="t" className="sidebar-group-title whitespace-nowrap text-[11px] font-bold uppercase tracking-wider" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{g.title}</motion.p>}
            </AnimatePresence>
          </div>
          <ul className="flex flex-col gap-1">{g.items.map((i) => <NavLink key={i.id} item={i} active={i.id === page} collapsed={collapsed} onGo={onGo} />)}</ul>
        </div>
      ))}
    </nav>
  )
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <motion.div whileHover={{ rotate: -8, scale: 1.06 }} transition={spring.bouncy} className="brand-mark grid size-10 shrink-0 place-items-center rounded-[var(--radius-sm)] text-[15px] font-extrabold">L</motion.div>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div key="b" className="whitespace-nowrap leading-tight" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0, transition: { delay: 0.06 } }} exit={{ opacity: 0, x: -8, transition: { duration: 0.1 } }}>
            <div className="text-[16px] font-extrabold">LMS 2.0</div>
            <div className="text-muted text-[11px] font-medium">Prototype</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DesktopSidebar() {
  const reduce = useReducedMotion()
  const collapsed = useStore((s) => s.collapsed)
  const toggle = useStore((s) => s.toggleSidebar)
  const go = useStore((s) => s.go)
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose
  return (
    <motion.aside id="app-sidebar" aria-label="Main navigation" initial={false} animate={{ width: collapsed ? W_RAIL : W_OPEN }} transition={reduce ? { duration: 0 } : spring.smooth}
      className="sidebar sticky top-0 z-30 flex h-dvh shrink-0 flex-col overflow-hidden">
      <div className={`flex h-16 items-center px-[18px] ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && <Brand collapsed={false} />}
        <motion.button type="button" onClick={toggle} aria-expanded={!collapsed} aria-controls="app-sidebar" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={`${collapsed ? 'Expand' : 'Collapse'} sidebar (Ctrl+B)`}
          whileHover={hover.button} whileTap={hover.tap} transition={hoverTransition} className="icon-btn grid size-10 shrink-0 place-items-center rounded-[var(--radius-sm)]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span key={collapsed ? 'o' : 'c'} initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 90 }} transition={{ duration: 0.15 }}><Icon size={20} aria-hidden /></motion.span>
          </AnimatePresence>
        </motion.button>
      </div>
      <NavList collapsed={collapsed} onGo={go} />
    </motion.aside>
  )
}

function Drawer() {
  const open = useStore((s) => s.drawer)
  const setOpen = useStore((s) => s.setDrawer)
  const go = useStore((s) => s.go)
  const close = useCallback(() => setOpen(false), [setOpen])
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', k)
    panel.current?.querySelector<HTMLElement>('a,button')?.focus()
    return () => window.removeEventListener('keydown', k)
  }, [open, close])
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="scrim fixed inset-0 z-40" onClick={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} />
          <motion.div ref={panel} role="dialog" aria-modal="true" aria-label="Main navigation" className="sidebar fixed inset-y-0 left-0 z-50 flex w-[min(300px,86vw)] flex-col"
            initial={{ x: '-100%' }} animate={{ x: 0, transition: spring.smooth }} exit={{ x: '-100%', transition: { duration: 0.2, ease: [0.7, 0, 0.84, 0] } }}>
            <div className="flex h-16 items-center justify-between px-[18px]">
              <Brand collapsed={false} />
              <button type="button" onClick={close} aria-label="Close navigation" className="icon-btn grid size-10 place-items-center rounded-[var(--radius-sm)]"><X size={20} aria-hidden /></button>
            </div>
            <NavList collapsed={false} onGo={(id) => { go(id); close() }} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export function Shell({ children }: { children: ReactNode }) {
  const desktop = useMedia('(min-width: 768px)')
  const { theme, setTheme } = useDesign()
  const page = useStore((s) => s.page)
  const toggle = useStore((s) => s.toggleSidebar)
  const drawer = useStore((s) => s.drawer)
  const setDrawer = useStore((s) => s.setDrawer)
  const users = useStore((s) => s.users)
  const roles = useStore((s) => s.roles)
  const meId = useStore((s) => s.meId)
  const setMe = useStore((s) => s.setMe)
  const reset = useStore((s) => s.reset)
  const notify = useStore((s) => s.notify)
  const me = users.find((u) => u.id === meId)

  useEffect(() => { window.scrollTo(0, 0) }, [page])

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        if (desktop) toggle()
        else setDrawer(!useStore.getState().drawer)
      }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [desktop, toggle, setDrawer])

  return (
    <div className="app flex min-h-dvh">
      <a href="#main" className="skip-link">Skip to content</a>
      {desktop ? <DesktopSidebar /> : <Drawer />}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="topbar sticky top-0 z-20 flex h-16 items-center gap-3 px-4 lg:px-8">
          {!desktop && (
            <motion.button type="button" onClick={() => setDrawer(true)} aria-label="Open navigation" aria-expanded={drawer} whileTap={hover.tap} className="icon-btn grid size-10 place-items-center rounded-[var(--radius-sm)]"><Menu size={20} aria-hidden /></motion.button>
          )}
          <div className="text-muted hidden text-sm font-semibold sm:block">LMS 2.0 <span aria-hidden>/</span> <span className="text-[var(--fg)]">{GROUPS.flatMap((g) => g.items).find((i) => i.id === page)?.label}</span></div>
          <div className="ml-auto flex items-center gap-2">
            <label className="flex items-center gap-2 text-[12.5px] font-semibold">
              <span className="text-muted hidden md:inline">Viewing as</span>
              <select aria-label="Viewing as (mock user role)" className="field !h-9 !w-[min(250px,44vw)] !text-[13px]" value={meId} onChange={(e) => { setMe(e.target.value); const u = users.find((x) => x.id === e.target.value); notify(`Now viewing as ${u?.name} (${roles.find((r) => r.id === u?.roleId)?.name})`) }}>
                {users.filter((u) => u.status === 'Active').map((u) => <option key={u.id} value={u.id}>{roles.find((r) => r.id === u.roleId)?.name} - {u.name}</option>)}
              </select>
            </label>
            <motion.button type="button" aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} whileHover={hover.button} whileTap={hover.tap} transition={hoverTransition} className="icon-btn grid size-10 place-items-center overflow-hidden rounded-[var(--radius-sm)]">
              <motion.span key={theme} initial={{ y: 14, rotate: -60, opacity: 0 }} animate={{ y: 0, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>{theme === 'dark' ? <Moon size={19} aria-hidden /> : <Sun size={19} aria-hidden />}</motion.span>
            </motion.button>
            <motion.button type="button" aria-label="Notifications" whileHover={{ rotate: [0, -12, 10, -6, 0] }} whileTap={hover.tap} transition={{ duration: 0.5 }} className="icon-btn relative hidden size-10 place-items-center rounded-[var(--radius-sm)] sm:grid">
              <Bell size={19} aria-hidden /><span className="badge-dot absolute right-2.5 top-2.5 size-2 rounded-full" aria-hidden />
            </motion.button>
            <motion.button type="button" aria-label="Reset demo data" title="Reset demo data" whileHover={hover.button} whileTap={hover.tap} transition={hoverTransition} onClick={() => { if (window.confirm('Reset all demo data?')) { reset(); notify('Demo data reset') } }} className="icon-btn hidden size-10 place-items-center rounded-[var(--radius-sm)] sm:grid"><RotateCcw size={18} aria-hidden /></motion.button>
            <div className="avatar grid size-10 place-items-center rounded-full text-sm font-bold" aria-label={`Signed in as ${me?.name}`}>{me?.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</div>
          </div>
        </header>
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 outline-none lg:px-8">
          <AnimatePresence mode="wait">
            <motion.div key={page} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } }} exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}>
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <ToastHost />
    </div>
  )
}
