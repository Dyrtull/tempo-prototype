/**
 * pages/client/Rewards.tsx
 * Loyalty programme: points balance, how points are earned (admin-configurable
 * rule `copPerPoint`), catalogue of rewards and redemption history.
 */
import { Link } from 'react-router-dom'
import { useDB, useI18n, useUser } from '../../hooks'
import { redeemReward } from '../../api'
import { useErrorText } from '../../components/ui'
import { useState } from 'react'

export default function Rewards() {
  const { tr, loc, money, date } = useI18n()
  const db = useDB()
  const user = useUser()
  const errText = useErrorText()
  const [msg, setMsg] = useState('')
  if (!user) return <p>{tr('Ingresa para ver tus recompensas.', 'Log in to see your rewards.')} <Link className="text-amber" to="/login">{tr('Ingresar', 'Log in')}</Link></p>
  const history = db.redemptions.filter((r) => r.userId === user.id)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{tr('Recompensas', 'Rewards')}</h1>
      <div className="card flex flex-wrap items-center justify-between gap-3 p-6">
        <div><div className="text-xs text-mute">{tr('Tus puntos', 'Your points')}</div><div className="font-display text-5xl font-bold text-amber">{user.points}</div></div>
        <p className="max-w-sm text-sm text-mute">{tr(`Ganas 1 punto por cada ${money(db.settings.copPerPoint)} que pagas en reservas y extensiones.`, `Earn 1 point for every ${money(db.settings.copPerPoint)} you pay on bookings and extensions.`)}</p>
      </div>
      {msg && <p className="text-sm text-signal">{msg}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {db.rewards.filter((r) => r.active).map((r) => (
          <div key={r.id} className="card flex flex-col p-4">
            <div className="font-bold">{loc(r.name)}</div><p className="mt-1 flex-1 text-xs text-mute">{loc(r.description)}</p>
            <div className="mt-3 text-amber">{r.cost} {tr('pts', 'pts')}</div>
            <button className="btn mt-2" disabled={user.points < r.cost} onClick={() => { const x = redeemReward(user.id, r.id); setMsg(x.ok ? tr('Canjeado con éxito.', 'Redeemed successfully.') : errText(x.error)) }}>{tr('Canjear', 'Redeem')}</button>
          </div>
        ))}
      </div>
      {history.length > 0 && <section><h2 className="mb-2 font-bold text-mute">{tr('Canjes', 'Redemptions')}</h2><div className="space-y-1 text-sm">{history.map((h) => <div key={h.id} className="flex justify-between"><span>{loc(db.rewards.find((r) => r.id === h.rewardId)!.name)}</span><span className="text-mute">{date(h.at)}</span></div>)}</div></section>}
    </div>
  )
}
