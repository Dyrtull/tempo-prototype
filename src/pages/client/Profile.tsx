/**
 * pages/client/Profile.tsx
 * Private account area with tabs:
 *  - Personal profile: bio, profession, instruments, technical preferences.
 *  - Groups: bands / production teams / companies and their members (used to book as a group).
 *  - Payments: credit balance (from approved cancellations) and the transaction history.
 *  - Membership: current plan and the auto-renewal switch.
 *  - Rewards summary.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDB, useI18n, useUser } from '../../hooks'
import { newGroupId, saveGroup, saveUser, setAutoRenew } from '../../api'
import { Avatar } from '../../components/ui'
import type { Group } from '../../api/types'

type Tab = 'personal' | 'groups' | 'payments' | 'membership'

export default function Profile() {
  const { tr, loc, money, dateTime, date } = useI18n()
  const db = useDB()
  const user = useUser()
  const [tab, setTab] = useState<Tab>('personal')
  const [form, setForm] = useState<null | { bio: string; profession: string; instruments: string; techPrefs: string }>(null)
  const [group, setGroup] = useState<Group | null>(null)
  const [saved, setSaved] = useState(false)

  if (!user) return <p>{tr('Ingresa para ver tu perfil.', 'Log in to see your profile.')} <Link className="text-amber" to="/login">{tr('Ingresar', 'Log in')}</Link></p>
  const f = form ?? { bio: user.bio, profession: user.profession, instruments: user.instruments.join(', '), techPrefs: user.techPrefs }
  const txs = db.transactions.filter((t) => t.userId === user.id).sort((a, b) => b.at.localeCompare(a.at))
  const myGroups = db.groups.filter((g) => g.memberIds.includes(user.id))
  const membership = db.memberships.find((m) => m.userId === user.id && m.status === 'active')
  const tabs: [Tab, string][] = [['personal', tr('Perfil', 'Profile')], ['groups', tr('Grupos', 'Groups')], ['payments', tr('Pagos y saldo', 'Payments & balance')], ['membership', tr('Membresía', 'Membership')]]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4"><Avatar name={user.name} hue={user.hue} size={64} /><div><h1 className="text-2xl font-bold">{user.name}</h1><div className="text-sm text-mute">{user.email}</div></div>
        <div className="ml-auto text-right text-sm"><div className="text-mute">{tr('Saldo a favor', 'Credit')}</div><div className="font-bold text-signal">{money(user.credit)}</div><Link to="/rewards" className="text-xs text-amber">{user.points} {tr('puntos', 'points')} →</Link></div></div>
      <div className="flex gap-2 overflow-x-auto">{tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`chip whitespace-nowrap text-sm ${tab === k ? 'border-amber text-amber' : ''}`}>{l}</button>)}</div>

      {tab === 'personal' && (
        <div className="card max-w-xl space-y-3 p-5">
          <div><label className="lbl">{tr('Profesión', 'Profession')}</label><input className="field" value={f.profession} onChange={(e) => setForm({ ...f, profession: e.target.value })} /></div>
          <div><label className="lbl">{tr('Biografía', 'Bio')}</label><textarea className="field" rows={3} value={f.bio} onChange={(e) => setForm({ ...f, bio: e.target.value })} /></div>
          <div><label className="lbl">{tr('Instrumentos y equipos (separados por coma)', 'Instruments & gear (comma separated)')}</label><input className="field" value={f.instruments} onChange={(e) => setForm({ ...f, instruments: e.target.value })} /></div>
          <div><label className="lbl">{tr('Preferencias técnicas', 'Technical preferences')}</label><textarea className="field" rows={2} value={f.techPrefs} onChange={(e) => setForm({ ...f, techPrefs: e.target.value })} /></div>
          <button className="btn" onClick={() => { saveUser({ ...user, bio: f.bio, profession: f.profession, techPrefs: f.techPrefs, instruments: f.instruments.split(',').map((s) => s.trim()).filter(Boolean) }); setSaved(true) }}>{tr('Guardar', 'Save')}</button>
          {saved && <span className="ml-3 text-xs text-signal">{tr('Guardado', 'Saved')}</span>}
        </div>
      )}

      {tab === 'groups' && (
        <div className="space-y-3">
          {myGroups.map((g) => <div key={g.id} className="card p-4"><div className="flex items-center justify-between"><div><b>{g.name}</b> <span className="chip ml-2">{g.kind}</span></div>{g.ownerId === user.id && <button className="text-xs text-amber" onClick={() => setGroup(g)}>{tr('Editar', 'Edit')}</button>}</div><p className="mt-1 text-sm text-mute">{g.description}</p><div className="mt-2 text-xs text-mute">{tr('Integrantes', 'Members')}: {g.memberIds.map((id) => db.users.find((u) => u.id === id)?.name).join(', ')}</div></div>)}
          {!group && <button className="btn btn-ghost" onClick={() => setGroup({ id: newGroupId(), name: '', kind: 'band', description: '', ownerId: user.id, memberIds: [user.id] })}>{tr('Crear perfil de grupo o empresa', 'Create group or company profile')}</button>}
          {group && (
            <div className="card max-w-xl space-y-3 p-5">
              <div><label className="lbl">{tr('Nombre', 'Name')}</label><input className="field" value={group.name} onChange={(e) => setGroup({ ...group, name: e.target.value })} /></div>
              <div><label className="lbl">{tr('Tipo', 'Type')}</label><select className="field" value={group.kind} onChange={(e) => setGroup({ ...group, kind: e.target.value as Group['kind'] })}><option value="band">{tr('Banda', 'Band')}</option><option value="musicians">{tr('Grupo de músicos', 'Group of musicians')}</option><option value="production">{tr('Equipo de producción', 'Production team')}</option><option value="company">{tr('Empresa', 'Company')}</option></select></div>
              <div><label className="lbl">{tr('Descripción', 'Description')}</label><textarea className="field" rows={2} value={group.description} onChange={(e) => setGroup({ ...group, description: e.target.value })} /></div>
              <div><label className="lbl">{tr('Integrantes', 'Members')}</label><div className="flex flex-wrap gap-2">{db.users.filter((u) => u.role === 'client').map((u) => <button key={u.id} onClick={() => setGroup({ ...group, memberIds: group.memberIds.includes(u.id) ? group.memberIds.filter((x) => x !== u.id) : [...group.memberIds, u.id] })} className={`chip text-xs ${group.memberIds.includes(u.id) ? 'border-amber text-amber' : ''}`}>{u.name}</button>)}</div></div>
              <div className="flex gap-2"><button className="btn" disabled={!group.name.trim()} onClick={() => { saveGroup(group); setGroup(null) }}>{tr('Guardar', 'Save')}</button><button className="btn btn-ghost" onClick={() => setGroup(null)}>{tr('Cancelar', 'Cancel')}</button></div>
            </div>
          )}
        </div>
      )}

      {tab === 'payments' && (
        <div className="card overflow-x-auto p-2"><table className="tbl"><thead><tr><th>{tr('Fecha', 'Date')}</th><th>{tr('Concepto', 'Concept')}</th><th>{tr('Método', 'Method')}</th><th className="text-right">{tr('Valor', 'Amount')}</th></tr></thead>
          <tbody>{txs.map((t) => <tr key={t.id}><td>{dateTime(t.at)}</td><td>{t.type} · {t.note}</td><td>{t.method}</td><td className={`text-right ${t.amount < 0 ? 'text-rec' : ''}`}>{money(t.amount)}</td></tr>)}</tbody></table></div>
      )}

      {tab === 'membership' && (membership ? (
        <div className="card max-w-xl space-y-2 p-5"><div className="text-lg font-bold">{loc(db.plans.find((p) => p.id === membership.planId)!.name)}</div>
          <div className="text-sm text-mute">{membership.autoRenew ? tr('Próxima renovación', 'Next renewal') : tr('Termina', 'Ends')}: {date(membership.renewsAt)}</div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={membership.autoRenew} onChange={(e) => setAutoRenew(membership.id, e.target.checked)} />{tr('Renovación automática', 'Auto-renewal')}</label></div>
      ) : <p className="text-sm text-mute">{tr('No tienes membresía.', 'No membership.')} <Link to="/plans" className="text-amber">{tr('Ver planes', 'See plans')}</Link></p>)}
    </div>
  )
}
