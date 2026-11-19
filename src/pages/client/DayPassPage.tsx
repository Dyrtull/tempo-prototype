/**
 * pages/client/DayPassPage.tsx
 * Guest checkout: buy a one-day coworking pass WITHOUT creating an account.
 * Only name + email are needed. The result is a 6-digit code that opens the
 * coworking area on the chosen date (validated by lib/rules.validateAccess).
 * Payment is simulated.
 */
import { useState } from 'react'
import { buyDayPass } from '../../api'
import { useDB, useI18n } from '../../hooks'
import { DemoPaymentBanner, useErrorText } from '../../components/ui'
import { toYMD } from '../../lib/rules'
import type { DayPass } from '../../api/types'

export default function DayPassPage() {
  const { tr, money } = useI18n()
  const db = useDB()
  const errText = useErrorText()
  const [f, setF] = useState({ name: '', email: '', date: toYMD(new Date()), method: 'nequi' })
  const [pass, setPass] = useState<DayPass | null>(null)
  const [err, setErr] = useState('')

  if (pass) return (
    <div className="mx-auto max-w-md space-y-4 text-center">
      <h1 className="text-2xl font-bold">{tr('Tu pase diario está listo', 'Your day pass is ready')}</h1>
      <div className="card p-6"><div className="text-xs text-mute">{tr('Código de acceso para el', 'Access code for')} {pass.date}</div><div className="mt-2 font-display text-5xl font-bold tracking-[0.3em] text-amber">{pass.code}</div></div>
      <p className="text-sm text-mute">{tr(`Enviamos una copia a ${pass.email} (simulado). Funciona 24 h en la zona de coworking.`, `A copy was sent to ${pass.email} (simulated). Valid 24 h in the coworking area.`)}</p>
    </div>
  )

  return (
    <form className="mx-auto max-w-md space-y-4" onSubmit={(e) => { e.preventDefault(); const r = buyDayPass(f.name, f.email, f.date, f.method); if (r.ok) setPass(r.pass); else setErr(errText(r.error)) }}>
      <h1 className="text-3xl font-bold">{tr('Pase diario', 'Day pass')}</h1>
      <p className="text-mute">{tr('Sin cuenta, sin membresía. Un día de coworking.', 'No account, no membership. One day of coworking.')}</p>
      <DemoPaymentBanner />
      <div className="card space-y-3 p-5">
        <div><label className="lbl">{tr('Nombre', 'Name')}</label><input className="field" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><label className="lbl">Email</label><input type="email" className="field" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        <div><label className="lbl">{tr('Fecha', 'Date')}</label><input type="date" className="field" min={toYMD(new Date())} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
        <div className="flex gap-2">{(['nequi', 'card', 'pse'] as const).map((k) => <button type="button" key={k} onClick={() => setF({ ...f, method: k })} className={`chip text-sm ${f.method === k ? 'border-amber text-amber' : ''}`}>{k === 'card' ? tr('Tarjeta', 'Card') : k.toUpperCase()}</button>)}</div>
        {err && <p className="text-sm text-rec">{err}</p>}
        <button className="btn w-full">{tr('Pagar', 'Pay')} {money(db.settings.dayPassPrice)}</button>
      </div>
    </form>
  )
}
