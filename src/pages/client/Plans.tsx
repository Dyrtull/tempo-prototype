/**
 * pages/client/Plans.tsx
 * Membership plans (monthly / annual) configured by the admin, plus the current
 * membership with the "cancel renewal" switch. Buying opens a SIMULATED checkout.
 * A plan's discount % is applied automatically to every booking while it is active
 * (see lib/rules.membershipDiscount).
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDB, useI18n, useUser } from '../../hooks'
import { buyMembership, setAutoRenew } from '../../api'
import { DemoPaymentBanner, Modal } from '../../components/ui'

export default function Plans() {
  const { tr, loc, locList, money, date } = useI18n()
  const db = useDB()
  const user = useUser()
  const nav = useNavigate()
  const [pick, setPick] = useState<string | null>(null)
  const [method, setMethod] = useState('card')
  const [busy, setBusy] = useState(false)

  const current = user ? db.memberships.find((m) => m.userId === user.id && m.status === 'active') : undefined
  const plan = db.plans.find((p) => p.id === pick)

  const confirm = () => {
    if (!user || !pick) return
    setBusy(true)
    setTimeout(() => { buyMembership(user.id, pick, method); setBusy(false); setPick(null) }, 1000)
  }

  return (
    <div className="space-y-8">
      <div><h1 className="text-3xl font-bold">{tr('Membresías', 'Memberships')}</h1><p className="mt-1 text-mute">{tr('Descuentos en cada reserva y beneficios para la comunidad.', 'Discounts on every booking and community perks.')}</p></div>

      {current && (
        <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
          <div><div className="text-xs text-mute">{tr('Tu membresía activa', 'Your active membership')}</div><div className="text-lg font-bold">{loc(db.plans.find((p) => p.id === current.planId)!.name)}</div>
            <div className="text-sm text-mute">{current.autoRenew ? tr('Se renueva el', 'Renews on') : tr('Termina el', 'Ends on')} {date(current.renewsAt)}</div></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={current.autoRenew} onChange={(e) => setAutoRenew(current.id, e.target.checked)} />{tr('Renovación automática', 'Auto-renewal')}</label>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-3">
        {db.plans.filter((p) => p.active).map((p) => (
          <div key={p.id} className={`card flex flex-col p-6 ${current?.planId === p.id ? '!border-amber' : ''}`}>
            <span className="chip w-fit">{p.period === 'annual' ? tr('Anual', 'Annual') : tr('Mensual', 'Monthly')}</span>
            <h2 className="mt-3 text-xl font-bold">{loc(p.name)}</h2>
            <div className="mt-2 text-3xl font-bold text-amber">{money(p.price)}</div>
            <div className="text-xs text-mute">/ {p.period === 'annual' ? tr('año', 'year') : tr('mes', 'month')}</div>
            <ul className="mt-4 flex-1 space-y-1 text-sm text-mute">{locList(p.benefits).map((x) => <li key={x}>· {x}</li>)}</ul>
            <button className="btn mt-5" disabled={current?.planId === p.id} onClick={() => (user ? setPick(p.id) : nav('/login'))}>{current?.planId === p.id ? tr('Plan actual', 'Current plan') : tr('Elegir plan', 'Choose plan')}</button>
          </div>
        ))}
      </div>
      <div className="card flex flex-wrap items-center justify-between gap-3 p-5"><div><h3 className="font-bold">{tr('¿Solo por un día?', 'Just for a day?')}</h3><p className="text-sm text-mute">{tr('Compra un pase diario sin crear cuenta.', 'Buy a day pass without an account.')}</p></div><Link to="/daypass" className="btn btn-ghost">{tr('Pase diario', 'Day pass')}</Link></div>

      {plan && (
        <Modal title={loc(plan.name)} onClose={() => setPick(null)}>
          <div className="space-y-3"><DemoPaymentBanner />
            <div className="flex justify-between font-bold"><span>Total</span><span className="text-amber">{money(plan.price)}</span></div>
            <div className="flex gap-2">{(['card', 'pse', 'nequi'] as const).map((k) => <button key={k} onClick={() => setMethod(k)} className={`chip text-sm ${method === k ? 'border-amber text-amber' : ''}`}>{k === 'card' ? tr('Tarjeta', 'Card') : k.toUpperCase()}</button>)}</div>
            <p className="text-xs text-mute">{tr('Se renueva automáticamente; puedes cancelar la renovación cuando quieras.', 'Renews automatically; you can cancel the renewal any time.')}</p>
            <button className="btn w-full" disabled={busy} onClick={confirm}>{busy ? tr('Procesando…', 'Processing…') : tr('Pagar y activar', 'Pay and activate')}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
