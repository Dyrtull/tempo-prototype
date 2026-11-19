/**
 * pages/client/Checkout.tsx
 * SIMULATED payment screen: it looks like a Colombian gateway (card / PSE / Nequi)
 * but nothing is charged. Shows the total, lets the customer choose full payment or
 * instalments (only if the admin enabled them for this space and the date allows),
 * lists every instalment with its due date, optionally applies credit balance, and
 * explains the rules: the booking is confirmed after the first payment and the service
 * must be fully paid before use (the door code stays locked until then).
 * The slot is held by a countdown (settings.holdMinutes); when it hits zero the
 * booking expires and the hours are released.
 */
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useDB, useI18n, useUser } from '../../hooks'
import { payBooking, setBookingPlan } from '../../api'
import { DemoPaymentBanner } from '../../components/ui'
import { amountDue, maxInstallments } from '../../lib/rules'

export default function Checkout() {
  const { id } = useParams()
  const { tr, loc, money, dateTime } = useI18n()
  const db = useDB()
  const user = useUser()
  const nav = useNavigate()
  const [method, setMethod] = useState<'card' | 'pse' | 'nequi'>('card')
  const [useCredit, setUseCredit] = useState(true)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())

  // 1-second clock for the hold countdown
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])

  const b = db.bookings.find((x) => x.id === id)
  const space = b && db.spaces.find((s) => s.id === b.spaceId)
  if (!b || !space || !user || b.userId !== user.id) return <p className="text-mute">{tr('Reserva no encontrada.', 'Booking not found.')}</p>

  const expired = b.status === 'cancelled'
  const msLeft = b.holdUntil ? new Date(b.holdUntil).getTime() - now : 0
  const mm = Math.max(0, Math.floor(msLeft / 60000)); const ss = Math.max(0, Math.floor((msLeft % 60000) / 1000))
  const canInstall = space.installmentsEnabled && maxInstallments(b.start, db.settings.installmentCount) >= 2
  const next = b.installments.find((i) => !i.paidAt)
  const credit = useCredit ? Math.min(user.credit, next?.amount ?? 0) : 0
  const toCharge = (next?.amount ?? 0) - credit
  const paidAlready = b.installments.some((i) => i.paidAt)

  /** Fake the gateway round-trip (1.2 s) and then record the payment. */
  const pay = () => {
    setBusy(true)
    setTimeout(() => {
      const r = payBooking(b.id, { mode: 'next', method, useCredit })
      setBusy(false)
      if (r.ok) setDone(r.paid)
    }, 1200)
  }

  if (done !== null) {
    const rest = amountDue(b)
    return (
      <div className="mx-auto max-w-md space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-signal/20 text-3xl text-signal">✓</div>
        <h1 className="text-2xl font-bold">{tr('Pago aprobado (simulado)', 'Payment approved (simulated)')}</h1>
        <p className="text-mute">{tr('Tu reserva está confirmada.', 'Your booking is confirmed.')} {rest > 0 && tr(`Falta pagar ${money(rest)} antes de usar el espacio.`, `${money(rest)} remains to be paid before use.`)}</p>
        <div className="flex justify-center gap-3"><Link className="btn" to={`/bookings/${b.id}`}>{tr('Ver mi reserva', 'View booking')}</Link><Link className="btn btn-ghost" to="/spaces">{tr('Seguir explorando', 'Keep browsing')}</Link></div>
      </div>
    )
  }

  if (expired) return <div className="mx-auto max-w-md text-center"><p className="text-rec">{tr('El tiempo para pagar expiró y las horas fueron liberadas.', 'The payment time ran out and the hours were released.')}</p><Link className="btn mt-4" to={`/spaces/${space.id}`}>{tr('Reservar de nuevo', 'Book again')}</Link></div>
  if (b.status !== 'pending' && !next) return <div className="text-center"><p>{tr('Esta reserva ya está pagada.', 'This booking is fully paid.')}</p><Link className="btn mt-3" to={`/bookings/${b.id}`}>{tr('Ver reserva', 'View booking')}</Link></div>

  return (
    <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-[1fr_1.2fr]">
      <div className="card h-fit space-y-3 p-5">
        <h2 className="text-lg font-bold">{tr('Resumen', 'Summary')}</h2>
        <div className="text-sm"><div className="font-semibold">{loc(space.name)}</div><div className="text-mute">{dateTime(b.start)} → {dateTime(b.end)}{b.units > 1 && ` · ${b.units} ${tr('puestos', 'desks')}`}</div></div>
        {b.discount > 0 && <div className="flex justify-between text-sm text-signal"><span>{tr('Descuento membresía', 'Membership discount')}</span><span>−{money(b.discount)}</span></div>}
        <div className="flex justify-between border-t border-line pt-3 text-lg font-bold"><span>{tr('Valor total', 'Total value')}</span><span className="text-amber">{money(b.total)}</span></div>
        {b.status === 'pending' && <div className={`rounded-lg p-2 text-center text-sm ${msLeft < 120000 ? 'bg-rec/15 text-rec' : 'bg-panel2 text-mute'}`}>{tr('Horario reservado por', 'Slot held for')} {mm}:{String(ss).padStart(2, '0')}</div>}
        <p className="text-xs text-mute">{tr('La reserva se confirma al realizar el primer pago. El servicio debe estar completamente pagado antes de usarlo: el código de acceso permanece bloqueado hasta entonces.', 'The booking is confirmed at the first payment. The service must be fully paid before use: the access code stays locked until then.')}</p>
      </div>

      <div className="card space-y-4 p-5">
        <DemoPaymentBanner />
        {!paidAlready && (
          <div>
            <label className="lbl">{tr('Modalidad de pago', 'Payment option')}</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setBookingPlan(b.id, 'full')} className={`card p-3 text-left text-sm ${b.plan === 'full' ? '!border-amber' : ''}`}><b>{tr('Pago completo', 'Pay in full')}</b><br /><span className="text-mute">{money(b.total)}</span></button>
              <button disabled={!canInstall} onClick={() => setBookingPlan(b.id, 'installments')} className={`card p-3 text-left text-sm disabled:opacity-40 ${b.plan === 'installments' ? '!border-amber' : ''}`}><b>{tr('En cuotas', 'Instalments')}</b><br /><span className="text-mute">{canInstall ? tr('Hasta antes de usar el espacio', 'Up to before use') : tr('No disponible', 'Not available')}</span></button>
            </div>
          </div>
        )}
        <table className="tbl">
          <thead><tr><th>#</th><th>{tr('Fecha de pago', 'Due date')}</th><th className="text-right">{tr('Valor', 'Amount')}</th><th /></tr></thead>
          <tbody>{b.installments.map((i, n) => (
            <tr key={i.id}><td>{n + 1}</td><td>{n === 0 && !i.paidAt ? tr('Hoy', 'Today') : dateTime(i.dueDate)}</td><td className="text-right">{money(i.amount)}</td><td className="text-right text-xs">{i.paidAt ? <span className="text-signal">{tr('Pagada', 'Paid')}</span> : <span className="text-mute">{tr('Pendiente', 'Pending')}</span>}</td></tr>
          ))}</tbody>
        </table>

        {user.credit > 0 && (
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={useCredit} onChange={(e) => setUseCredit(e.target.checked)} />{tr('Usar saldo a favor', 'Use credit balance')} ({money(user.credit)})</label>
        )}

        <div>
          <div className="mb-2 flex gap-2">
            {([['card', tr('Tarjeta', 'Card')], ['pse', 'PSE'], ['nequi', 'Nequi']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setMethod(k)} className={`chip text-sm ${method === k ? 'border-amber text-amber' : ''}`}>{l}</button>
            ))}
          </div>
          {method === 'card' && (<div className="grid grid-cols-2 gap-2"><div className="col-span-2"><input className="field" defaultValue="4242 4242 4242 4242" /></div><input className="field" defaultValue="12/29" /><input className="field" defaultValue="123" /></div>)}
          {method === 'pse' && <select className="field"><option>Bancolombia</option><option>Davivienda</option><option>Banco de Bogotá</option></select>}
          {method === 'nequi' && <input className="field" defaultValue="300 123 4567" />}
        </div>

        <button className="btn w-full" disabled={busy || (b.status === 'pending' && msLeft <= 0)} onClick={pay}>
          {busy ? tr('Procesando…', 'Processing…') : `${tr('Pagar', 'Pay')} ${money(toCharge)}`}
        </button>
        <button className="w-full text-center text-xs text-mute hover:text-cream" onClick={() => nav('/bookings')}>{tr('Pagar después (el horario se libera al vencer el tiempo)', 'Pay later (the slot is released when time runs out)')}</button>
      </div>
    </div>
  )
}
