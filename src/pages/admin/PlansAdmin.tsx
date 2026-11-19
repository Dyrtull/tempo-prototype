/**
 * pages/admin/PlansAdmin.tsx
 * Configure memberships (name, period, price, discount, benefits, active) and the
 * loyalty programme (reward catalogue; the earn rate lives in Settings). Also lists
 * active members and the renewal status so the admin sees recurring revenue.
 */
import { useState } from 'react'
import { useDB, useI18n, useUser } from '../../hooks'
import { newPlanId, newRewardId, savePlan, saveReward } from '../../api'
import { Modal } from '../../components/ui'
import type { MembershipPlan, Reward } from '../../api/types'

export default function PlansAdmin() {
  const { tr, loc, money, date } = useI18n()
  const db = useDB()
  const user = useUser()!
  const [plan, setPlan] = useState<MembershipPlan | null>(null)
  const [reward, setReward] = useState<Reward | null>(null)

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-center justify-between"><h1 className="text-3xl font-bold">{tr('Membresías', 'Memberships')}</h1>
          <button className="btn" onClick={() => setPlan({ id: newPlanId(), name: { es: '', en: '' }, period: 'monthly', price: 100000, discountPct: 10, active: true, benefits: { es: [], en: [] } })}>{tr('Nuevo plan', 'New plan')}</button></div>
        <div className="card overflow-x-auto p-2"><table className="tbl"><thead><tr><th>{tr('Plan', 'Plan')}</th><th>{tr('Periodo', 'Period')}</th><th>{tr('Precio', 'Price')}</th><th>{tr('Descuento', 'Discount')}</th><th>{tr('Miembros activos', 'Active members')}</th><th>{tr('Activo', 'Active')}</th><th /></tr></thead>
          <tbody>{db.plans.map((p) => <tr key={p.id}><td>{loc(p.name)}</td><td>{p.period}</td><td>{money(p.price)}</td><td>{p.discountPct}%</td><td>{db.memberships.filter((m) => m.planId === p.id && m.status === 'active').length}</td><td><input type="checkbox" checked={p.active} onChange={(e) => savePlan({ ...p, active: e.target.checked }, user.id)} /></td><td><button className="text-amber" onClick={() => setPlan(p)}>{tr('Editar', 'Edit')}</button></td></tr>)}</tbody></table></div>
        <div className="card overflow-x-auto p-2"><h2 className="p-2 font-bold">{tr('Miembros', 'Members')}</h2><table className="tbl"><tbody>{db.memberships.map((m) => <tr key={m.id}><td>{db.users.find((u) => u.id === m.userId)?.name}</td><td>{loc(db.plans.find((p) => p.id === m.planId)!.name)}</td><td>{m.status}</td><td>{m.autoRenew ? tr('Renueva', 'Renews') : tr('Termina', 'Ends')} {date(m.renewsAt)}</td></tr>)}</tbody></table></div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="text-2xl font-bold">{tr('Recompensas', 'Rewards')}</h2>
          <button className="btn" onClick={() => setReward({ id: newRewardId(), name: { es: '', en: '' }, description: { es: '', en: '' }, cost: 100, active: true })}>{tr('Nueva recompensa', 'New reward')}</button></div>
        <p className="text-sm text-mute">{tr(`Regla de acumulación actual: 1 punto por cada ${money(db.settings.copPerPoint)} (se cambia en Configuración).`, `Current earn rule: 1 point per ${money(db.settings.copPerPoint)} (change it in Settings).`)}</p>
        <div className="card overflow-x-auto p-2"><table className="tbl"><tbody>{db.rewards.map((r) => <tr key={r.id}><td>{loc(r.name)}</td><td>{r.cost} pts</td><td>{db.redemptions.filter((x) => x.rewardId === r.id).length} {tr('canjes', 'redeemed')}</td><td><input type="checkbox" checked={r.active} onChange={(e) => saveReward({ ...r, active: e.target.checked }, user.id)} /></td><td><button className="text-amber" onClick={() => setReward(r)}>{tr('Editar', 'Edit')}</button></td></tr>)}</tbody></table></div>
      </section>

      {plan && (
        <Modal title={plan.name.es || tr('Nuevo plan', 'New plan')} onClose={() => setPlan(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="lbl">{tr('Nombre (ES)', 'Name (ES)')}</label><input className="field" value={plan.name.es} onChange={(e) => setPlan({ ...plan, name: { ...plan.name, es: e.target.value } })} /></div>
            <div><label className="lbl">{tr('Nombre (EN)', 'Name (EN)')}</label><input className="field" value={plan.name.en} onChange={(e) => setPlan({ ...plan, name: { ...plan.name, en: e.target.value } })} /></div>
            <div><label className="lbl">{tr('Periodo', 'Period')}</label><select className="field" value={plan.period} onChange={(e) => setPlan({ ...plan, period: e.target.value as MembershipPlan['period'] })}><option value="monthly">{tr('Mensual', 'Monthly')}</option><option value="annual">{tr('Anual', 'Annual')}</option></select></div>
            <div><label className="lbl">{tr('Precio (COP)', 'Price (COP)')}</label><input type="number" className="field" value={plan.price} onChange={(e) => setPlan({ ...plan, price: +e.target.value || 0 })} /></div>
            <div><label className="lbl">{tr('Descuento en reservas (%)', 'Booking discount (%)')}</label><input type="number" min={0} max={100} className="field" value={plan.discountPct} onChange={(e) => setPlan({ ...plan, discountPct: Math.max(0, Math.min(100, +e.target.value || 0)) })} /></div>
            <div />
            <div><label className="lbl">{tr('Beneficios ES (uno por línea)', 'Benefits ES (one per line)')}</label><textarea className="field" rows={4} value={plan.benefits.es.join('\n')} onChange={(e) => setPlan({ ...plan, benefits: { ...plan.benefits, es: e.target.value.split('\n') } })} /></div>
            <div><label className="lbl">{tr('Beneficios EN (uno por línea)', 'Benefits EN (one per line)')}</label><textarea className="field" rows={4} value={plan.benefits.en.join('\n')} onChange={(e) => setPlan({ ...plan, benefits: { ...plan.benefits, en: e.target.value.split('\n') } })} /></div>
          </div>
          <button className="btn mt-4" disabled={!plan.name.es.trim()} onClick={() => { savePlan({ ...plan, name: { ...plan.name, en: plan.name.en || plan.name.es }, benefits: { es: plan.benefits.es.filter(Boolean), en: plan.benefits.en.filter(Boolean).length ? plan.benefits.en.filter(Boolean) : plan.benefits.es.filter(Boolean) } }, user.id); setPlan(null) }}>{tr('Guardar', 'Save')}</button>
        </Modal>
      )}
      {reward && (
        <Modal title={reward.name.es || tr('Nueva recompensa', 'New reward')} onClose={() => setReward(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="lbl">{tr('Nombre (ES)', 'Name (ES)')}</label><input className="field" value={reward.name.es} onChange={(e) => setReward({ ...reward, name: { ...reward.name, es: e.target.value } })} /></div>
            <div><label className="lbl">{tr('Nombre (EN)', 'Name (EN)')}</label><input className="field" value={reward.name.en} onChange={(e) => setReward({ ...reward, name: { ...reward.name, en: e.target.value } })} /></div>
            <div><label className="lbl">{tr('Descripción (ES)', 'Description (ES)')}</label><input className="field" value={reward.description.es} onChange={(e) => setReward({ ...reward, description: { ...reward.description, es: e.target.value } })} /></div>
            <div><label className="lbl">{tr('Descripción (EN)', 'Description (EN)')}</label><input className="field" value={reward.description.en} onChange={(e) => setReward({ ...reward, description: { ...reward.description, en: e.target.value } })} /></div>
            <div><label className="lbl">{tr('Costo en puntos', 'Cost in points')}</label><input type="number" className="field" value={reward.cost} onChange={(e) => setReward({ ...reward, cost: +e.target.value || 0 })} /></div>
          </div>
          <button className="btn mt-4" disabled={!reward.name.es.trim()} onClick={() => { saveReward({ ...reward, name: { ...reward.name, en: reward.name.en || reward.name.es }, description: { ...reward.description, en: reward.description.en || reward.description.es } }, user.id); setReward(null) }}>{tr('Guardar', 'Save')}</button>
        </Modal>
      )}
    </div>
  )
}
