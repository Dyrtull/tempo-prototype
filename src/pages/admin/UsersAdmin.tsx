/**
 * pages/admin/UsersAdmin.tsx
 * Two tabs:
 *  - Customers: everyone registered, with credit, points, booking count and a switch
 *    to deactivate accounts.
 *  - Staff: create individual employee accounts, grant/revoke each permission
 *    (only the admin can change permissions) and read each employee's activity log.
 * Permissions decide which admin sections an employee sees (AdminLayout).
 */
import { useState } from 'react'
import { useDB, useI18n, useUser } from '../../hooks'
import { createEmployee, saveUser } from '../../api'
import { Avatar } from '../../components/ui'
import type { Permission } from '../../api/types'

const PERMS: [Permission, string, string][] = [
  ['bookings', 'Reservas y calendario', 'Bookings & calendar'], ['spaces', 'Espacios', 'Spaces'], ['users', 'Usuarios', 'Users'],
  ['finance', 'Finanzas', 'Finance'], ['reports', 'Reportes', 'Reports'], ['plans', 'Membresías y recompensas', 'Memberships & rewards'],
  ['access', 'Acceso', 'Access'], ['moderation', 'Moderación', 'Moderation'], ['settings', 'Configuración', 'Settings'],
]

export default function UsersAdmin() {
  const { tr, money, dateTime } = useI18n()
  const db = useDB()
  const me = useUser()!
  const [tab, setTab] = useState<'clients' | 'staff'>('clients')
  const [nf, setNf] = useState({ name: '', email: '', perms: ['bookings'] as Permission[] })
  const isAdmin = me.role === 'admin'

  const clients = db.users.filter((u) => u.role === 'client')
  const staff = db.users.filter((u) => u.role !== 'client')

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold">{tr('Usuarios y empleados', 'Users & staff')}</h1>
      <div className="flex gap-2"><button className={`chip text-sm ${tab === 'clients' ? 'border-amber text-amber' : ''}`} onClick={() => setTab('clients')}>{tr('Clientes', 'Customers')} ({clients.length})</button><button className={`chip text-sm ${tab === 'staff' ? 'border-amber text-amber' : ''}`} onClick={() => setTab('staff')}>{tr('Empleados', 'Staff')} ({staff.length})</button></div>

      {tab === 'clients' && (
        <div className="card overflow-x-auto p-2"><table className="tbl"><thead><tr><th>{tr('Usuario', 'User')}</th><th>Email</th><th>{tr('Reservas', 'Bookings')}</th><th>{tr('Saldo a favor', 'Credit')}</th><th>{tr('Puntos', 'Points')}</th><th>{tr('Activo', 'Active')}</th></tr></thead>
          <tbody>{clients.map((u) => (
            <tr key={u.id}><td><span className="flex items-center gap-2"><Avatar name={u.name} hue={u.hue} size={26} />{u.name}</span></td><td>{u.email}</td><td>{db.bookings.filter((b) => b.userId === u.id).length}</td><td>{money(u.credit)}</td><td>{u.points}</td>
              <td><input type="checkbox" checked={u.active} onChange={(e) => saveUser({ ...u, active: e.target.checked }, me.id)} /></td></tr>
          ))}</tbody></table></div>
      )}

      {tab === 'staff' && (
        <div className="space-y-5">
          {staff.map((u) => (
            <div key={u.id} className="card space-y-3 p-4">
              <div className="flex items-center gap-3"><Avatar name={u.name} hue={u.hue} /><div className="flex-1"><b>{u.name}</b> <span className="chip ml-2">{u.role}</span><div className="text-xs text-mute">{u.email}</div></div></div>
              {u.role === 'employee' ? (
                <div className="flex flex-wrap gap-3">{PERMS.map(([p, es, en]) => (
                  <label key={p} className="flex items-center gap-1.5 text-xs"><input type="checkbox" disabled={!isAdmin} checked={u.permissions.includes(p)} onChange={(e) => saveUser({ ...u, permissions: e.target.checked ? [...u.permissions, p] : u.permissions.filter((x) => x !== p) }, me.id)} />{tr(es, en)}</label>
                ))}</div>
              ) : <p className="text-xs text-mute">{tr('Acceso total.', 'Full access.')}</p>}
              <details className="text-xs text-mute"><summary className="cursor-pointer">{tr('Actividad', 'Activity')} ({db.activity.filter((a) => a.userId === u.id).length})</summary>
                <ul className="mt-1 space-y-0.5">{db.activity.filter((a) => a.userId === u.id).slice(0, 15).map((a) => <li key={a.id}>{dateTime(a.at)} · {a.action}</li>)}</ul></details>
            </div>
          ))}
          {isAdmin && (
            <div className="card max-w-xl space-y-3 p-5"><h2 className="font-bold">{tr('Crear cuenta de empleado', 'Create staff account')}</h2>
              <input className="field" placeholder={tr('Nombre', 'Name')} value={nf.name} onChange={(e) => setNf({ ...nf, name: e.target.value })} />
              <input className="field" placeholder="Email" value={nf.email} onChange={(e) => setNf({ ...nf, email: e.target.value })} />
              <div className="flex flex-wrap gap-3">{PERMS.map(([p, es, en]) => <label key={p} className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={nf.perms.includes(p)} onChange={(e) => setNf({ ...nf, perms: e.target.checked ? [...nf.perms, p] : nf.perms.filter((x) => x !== p) })} />{tr(es, en)}</label>)}</div>
              <button className="btn" disabled={!nf.name.trim() || !nf.email.includes('@')} onClick={() => { createEmployee(nf.name, nf.email, nf.perms, me.id); setNf({ name: '', email: '', perms: ['bookings'] }) }}>{tr('Crear empleado', 'Create employee')}</button></div>
          )}
        </div>
      )}
    </div>
  )
}
