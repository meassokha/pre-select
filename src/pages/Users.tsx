import { useState } from 'react'
import { Check, Plus, ShieldCheck, Trash2, UserX, UserCheck } from 'lucide-react'
import { Button, Empty, Field, IconButton, Modal, PageHeader, Panel, Pill, Segmented, statusTone } from '../components/ui'
import { ACTIONS, MODULES } from '../data/seed'
import type { Action, ModuleId, Perms } from '../data/types'
import { useCan, useStore } from '../store'

const emptyPerms = (): Perms => ({ dashboard: ['view'], products: [], preselect: [], employers: [], approvals: [], users: [] })

export function Users() {
  const [tab, setTab] = useState<'users' | 'roles'>('users')
  return (
    <>
      <PageHeader title="User management" subtitle="Admins create users, assign a role, and decide what each role can see and do." />
      <div className="mb-4"><Segmented id="utab" label="Section" value={tab} onChange={setTab} options={[{ value: 'users', label: 'Users' }, { value: 'roles', label: 'Roles & permissions' }]} /></div>
      {tab === 'users' ? <UserList /> : <RoleMatrix />}
    </>
  )
}

function UserList() {
  const users = useStore((s) => s.users)
  const roles = useStore((s) => s.roles)
  const add = useStore((s) => s.addUser)
  const patch = useStore((s) => s.patchUser)
  const remove = useStore((s) => s.removeUser)
  const notify = useStore((s) => s.notify)
  const meId = useStore((s) => s.meId)
  const can = useCan()
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ name: '', email: '', roleId: 'pm', team: '' })
  const [errs, setErrs] = useState<Record<string, string>>({})
  const role = (id: string) => roles.find((r) => r.id === id)

  const submit = () => {
    const e: Record<string, string> = {}
    if (!f.name.trim()) e.name = 'Full name is required'
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email address'
    else if (users.some((u) => u.email.toLowerCase() === f.email.toLowerCase())) e.email = 'A user with this email already exists'
    setErrs(e)
    if (Object.keys(e).length) return
    add({ name: f.name.trim(), email: f.email.trim(), roleId: f.roleId, team: f.team.trim() || '-', status: 'Invited' })
    notify(`Invitation sent to ${f.email}`)
    setOpen(false)
    setF({ name: '', email: '', roleId: 'pm', team: '' })
  }

  return (
    <Panel title={`${users.length} users`} action={<Button small icon={Plus} disabled={!can('users', 'create')} onClick={() => { setErrs({}); setOpen(true) }}>New user</Button>}>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>User</th><th>Role</th><th>Team</th><th>Status</th><th>Last login</th><th className="text-right">Actions</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="data-row">
                <td className="!align-middle"><div className="flex items-center gap-3"><div className="avatar grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-bold">{u.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</div><div><div className="font-semibold">{u.name}</div><div className="text-muted text-xs">{u.email}</div></div></div></td>
                <td className="!align-middle">
                  <select aria-label={`Role for ${u.name}`} className="field !h-8 !w-[190px] !text-[13px]" disabled={!can('users', 'edit') || u.id === meId} value={u.roleId} onChange={(e) => { patch(u.id, { roleId: e.target.value }); notify(`${u.name} is now ${role(e.target.value)?.name}`) }}>
                    {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </td>
                <td className="!align-middle">{u.team}</td>
                <td className="!align-middle"><Pill tone={statusTone(u.status)}>{u.status}</Pill></td>
                <td className="text-muted !align-middle">{u.lastLogin}</td>
                <td className="!align-middle"><div className="flex justify-end gap-1">
                  <IconButton icon={u.status === 'Disabled' ? UserCheck : UserX} label={u.status === 'Disabled' ? 'Enable user' : 'Disable user'} disabled={!can('users', 'edit') || u.id === meId} onClick={() => patch(u.id, { status: u.status === 'Disabled' ? 'Active' : 'Disabled' })} />
                  <IconButton icon={Trash2} danger label="Delete user" disabled={!can('users', 'delete') || u.id === meId} onClick={() => { if (window.confirm(`Delete ${u.name}?`)) { remove(u.id); notify('User deleted') } }} />
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!can('users', 'create') && <p className="hint mt-3">Your current role is read-only here. Switch "Viewing as" to the System Administrator to manage users.</p>}

      <Modal open={open} onClose={() => setOpen(false)} title="Create new user" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit}>Create and invite</Button></>}>
        <div className="grid gap-4">
          <Field label="Full name" required error={errs.name}>{(id) => <input id={id} className="field" aria-invalid={!!errs.name} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
          <Field label="Work email" required error={errs.email}>{(id) => <input id={id} type="email" className="field" aria-invalid={!!errs.email} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />}</Field>
          <Field label="Team / department">{(id) => <input id={id} className="field" value={f.team} onChange={(e) => setF({ ...f, team: e.target.value })} placeholder="e.g. Product" />}</Field>
          <Field label="Assign role" hint={role(f.roleId)?.desc}>{(id) => <select id={id} className="field" value={f.roleId} onChange={(e) => setF({ ...f, roleId: e.target.value })}>{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>}</Field>
          <div className="profile-fact rounded-[var(--radius-sm)] p-3 text-[13px]">
            <div className="mb-1 font-bold">This role can</div>
            {MODULES.map((m) => { const a = role(f.roleId)?.perms[m.id] ?? []; return <div key={m.id} className="flex justify-between gap-3 py-0.5"><span>{m.label}</span><span className="text-muted">{a.length ? a.join(', ') : 'no access'}</span></div> })}
          </div>
        </div>
      </Modal>
    </Panel>
  )
}

function RoleMatrix() {
  const roles = useStore((s) => s.roles)
  const users = useStore((s) => s.users)
  const toggle = useStore((s) => s.togglePerm)
  const addRole = useStore((s) => s.addRole)
  const removeRole = useStore((s) => s.removeRole)
  const notify = useStore((s) => s.notify)
  const can = useCan()
  const [sel, setSel] = useState('pm')
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const role = roles.find((r) => r.id === sel) ?? roles[0]
  const editable = can('users', 'edit') && !role.system
  const members = users.filter((u) => u.roleId === role.id).length

  return (
    <div className="grid gap-5 xl:grid-cols-12">
      <Panel className="xl:col-span-4" title="Roles" action={<Button small variant="secondary" icon={Plus} disabled={!can('users', 'create')} onClick={() => { setName(''); setDesc(''); setOpen(true) }}>New role</Button>}>
        <ul className="flex flex-col gap-2">
          {roles.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => setSel(r.id)} aria-pressed={sel === r.id} className={`card card-flat w-full p-3 text-left transition ${sel === r.id ? 'selected-ring' : 'hover:!border-[var(--border-hover)]'}`}>
                <div className="flex items-center justify-between gap-2"><span className="font-bold">{r.name}</span>{r.system && <Pill tone="blue">System</Pill>}</div>
                <div className="text-muted text-xs">{r.desc}</div>
                <div className="text-muted mt-1 text-xs">{users.filter((u) => u.roleId === r.id).length} user(s)</div>
              </button>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel className="xl:col-span-8" title={`Permissions: ${role.name}`} sub={role.system ? 'The System Administrator role is locked so nobody can lose access by mistake.' : 'Tick what this role may do in each module. "View" is required for everything else and controls whether the module shows in the sidebar.'}
        action={!role.system && <Button small variant="danger" icon={Trash2} disabled={!can('users', 'delete') || members > 0} title={members ? 'Reassign its users first' : undefined} onClick={() => { removeRole(role.id); setSel('pm'); notify('Role deleted') }}>Delete role</Button>}>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Module</th>{ACTIONS.map((a) => <th key={a.id} className="text-center">{a.label}</th>)}</tr></thead>
            <tbody>
              {MODULES.map((m) => (
                <tr key={m.id} className="data-row">
                  <td className="!align-middle"><div className="font-semibold">{m.label}</div><div className="text-muted text-xs">{m.desc}</div></td>
                  {ACTIONS.map((a) => {
                    const on = role.perms[m.id].includes(a.id)
                    const isApr = a.id === 'approve' || a.id === 'approve2'
                    const na = (m.id === 'dashboard' && a.id !== 'view') || (m.id === 'approvals' ? !(a.id === 'view' || isApr) : isApr)
                    return (
                      <td key={a.id} className="!align-middle"><div className="perm-cell">
                        {na ? <span className="text-muted" aria-label="Not applicable">-</span> : (
                          <button type="button" role="checkbox" aria-checked={on} aria-label={`${role.name}: ${a.label} ${m.label}`} disabled={!editable} className="perm-box" onClick={() => toggle(role.id, m.id as ModuleId, a.id as Action)}><Check size={15} strokeWidth={3} aria-hidden /></button>
                        )}
                      </div></td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-muted mt-4 flex items-start gap-2 text-[13px]"><ShieldCheck size={16} className="mt-0.5 shrink-0" aria-hidden /> Try it: pick this role in "Viewing as" (top bar) to see the sidebar and buttons change for that role.</p>
      </Panel>

      <Modal open={open} onClose={() => setOpen(false)} title="Create new role" footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={!name.trim()} onClick={() => { const id = addRole({ name: name.trim(), desc: desc.trim() || 'Custom role', perms: emptyPerms() }); setSel(id); setOpen(false); notify('Role created. Now tick its permissions.') }}>Create role</Button></>}>
        <div className="grid gap-4">
          <Field label="Role name" required>{(id) => <input id={id} className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Collections Officer" />}</Field>
          <Field label="Description">{(id) => <input id={id} className="field" value={desc} onChange={(e) => setDesc(e.target.value)} />}</Field>
          <Empty>New roles start with Dashboard view only.</Empty>
        </div>
      </Modal>
    </div>
  )
}
