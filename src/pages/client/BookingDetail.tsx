/**
 * pages/client/BookingDetail.tsx
 * Everything about one booking, for the customer:
 *  - status, schedule, payments and balance (pay the next instalment or settle all),
 *  - the temporary door code (locked until fully paid; valid only inside the reserved
 *    hours; arriving late never moves the end time),
 *  - extension request (paid in-app, only if the space is free after the booking),
 *  - reschedule and cancel, both subject to the cancellation policy (24 h by default):
 *    an approved cancellation turns the amount paid into credit balance,
 *  - review form once the booking is completed.
 */
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useDB, useI18n, useUser } from '../../hooks'
import { addReview, cancelBooking, extendBooking, payBooking, rescheduleBooking } from '../../api'
import { Modal, Stars, StatusBadge, useErrorText } from '../../components/ui'
import { amountDue, amountPaid, cancellationOutcome, toYMD } from '../../lib/rules'

export default function BookingDetail() {
  const { id } = useParams()
  const { tr, loc, money, dateTime } = useI18n()
  const db = useDB()
  const user = useUser()
  const errText = useErrorText()
  const [msg, setMsg] = useState('')
  const [modal, setModal] = useState<'cancel' | 'resched' | 'review' | null>(null)
  const [newDay, setNewDay] = useState(toYMD(new Date()))
  const [newHour, setNewHour] = useState(10)
  const [rev, setRev] = useState({ rating: 5, text: '', sound: 5, comfort: 5, equipment: 5 })

  const b = db.bookings.find((x) => x.id === id)
  const space = b && db.spaces.find((s) => s.id === b.spaceId)
  if (!b || !space || !user || b.userId !== user.id) return <p className="text-mute">{tr('Reserva no encontrada.', 'Booking not found.')} <Link to="/bookings" className="text-amber">{tr('Volver', 'Back')}</Link></p>

  const due = amountDue(b)
  const policy = cancellationOutcome(db, b)
  const live = b.status === 'confirmed'
  const reviewed = db.reviews.some((r) => r.bookingId === b.id)
  const group = b.groupId ? db.groups.find((g) => g.id === b.groupId) : undefined

  /** Show the result of an API call as a message. */
  const report = (r: { ok: boolean; error?: string }, okMsg: string) => setMsg(r.ok ? okMsg : errText((r as { error: string }).error))

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/bookings" className="text-xs text-mute hover:text-cream">← {tr('Mis reservas', 'My bookings')}</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-3xl font-bold">{loc(space.name)}</h1><p className="text-mute">{dateTime(b.start)} → {dateTime(b.end)}{b.units > 1 && ` · ${b.units} ${tr('puestos', 'desks')}`}{group && ` · ${group.name}`}</p></div>
        <StatusBadge status={b.status} expired={b.status === 'cancelled' && b.creditGranted === undefined} />
      </div>
      {msg && <div className="rounded-lg border border-line bg-panel2 p-3 text-sm">{msg}</div>}

      {/* Door code */}
      {(live || b.status === 'pending') && (
        <div className="card p-5">
          <h2 className="font-bold">{tr('Código de acceso', 'Access code')}</h2>
          {b.status === 'pending' ? <p className="mt-2 text-sm text-mute">{tr('Se activa cuando la reserva esté confirmada.', 'Activates once the booking is confirmed.')}</p> : due > 0 ? (
            <p className="mt-2 text-sm text-amber">{tr(`Bloqueado hasta pagar el saldo de ${money(due)}.`, `Locked until the ${money(due)} balance is paid.`)}</p>
          ) : (
            <>
              <div className="mt-2 font-display text-4xl font-bold tracking-[0.3em] text-amber">{b.accessCode}</div>
              <p className="mt-2 text-xs text-mute">{tr('Funciona solo entre', 'Works only between')} {dateTime(b.start)} {tr('y', 'and')} {dateTime(b.end)}. {tr('Si llegas tarde, la hora de finalización no cambia.', 'If you arrive late, the end time does not change.')}</p>
            </>
          )}
        </div>
      )}

      {/* Payments */}
      <div className="card space-y-3 p-5">
        <div className="flex items-center justify-between"><h2 className="font-bold">{tr('Pagos', 'Payments')}</h2><span className="text-sm text-mute">{tr('Pagado', 'Paid')} {money(amountPaid(b))} / {money(b.total)}</span></div>
        <table className="tbl"><tbody>{b.installments.map((i, n) => (
          <tr key={i.id}><td>{tr('Cuota', 'Instalment')} {n + 1}</td><td>{dateTime(i.dueDate)}</td><td className="text-right">{money(i.amount)}</td><td className="text-right text-xs">{i.paidAt ? <span className="text-signal">{tr('Pagada', 'Paid')}</span> : <span className="text-amber">{tr('Pendiente', 'Pending')}</span>}</td></tr>
        ))}</tbody></table>
        {b.status === 'pending' && <Link to={`/checkout/${b.id}`} className="btn">{tr('Ir al pago', 'Go to payment')}</Link>}
        {live && due > 0 && (
          <div className="flex flex-wrap gap-2">
            <button className="btn" onClick={() => report(payBooking(b.id, { mode: 'next', method: 'card', useCredit: true }), tr('Cuota pagada (simulado).', 'Instalment paid (simulated).'))}>{tr('Pagar siguiente cuota', 'Pay next instalment')}</button>
            <button className="btn btn-ghost" onClick={() => report(payBooking(b.id, { mode: 'all', method: 'card', useCredit: true }), tr('Saldo pagado (simulado).', 'Balance paid (simulated).'))}>{tr('Pagar todo el saldo', 'Pay full balance')} ({money(due)})</button>
          </div>
        )}
      </div>

      {/* Actions */}
      {live && (
        <div className="card space-y-3 p-5">
          <h2 className="font-bold">{tr('Gestionar reserva', 'Manage booking')}</h2>
          <div>
            <div className="mb-1 text-xs text-mute">{tr('Extender tiempo (se paga en la app, si hay disponibilidad)', 'Extend time (paid in-app, if available)')}</div>
            <div className="flex gap-2">{[1, 2, 3].map((h) => <button key={h} className="btn btn-ghost" onClick={() => report(extendBooking(b.id, h, 'card'), tr(`Extendida ${h} h. Pago simulado aprobado.`, `Extended ${h} h. Simulated payment approved.`))}>+{h} h</button>)}</div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-ghost" onClick={() => setModal('resched')}>{tr('Modificar horario', 'Change time')}</button>
            <button className="btn btn-danger" onClick={() => setModal('cancel')}>{tr('Cancelar', 'Cancel')}</button>
          </div>
        </div>
      )}
      {b.status === 'cancelled' && b.creditGranted !== undefined && <p className="text-sm text-mute">{b.creditGranted > 0 ? tr(`Cancelada. Se acreditaron ${money(b.creditGranted)} a tu saldo.`, `Cancelled. ${money(b.creditGranted)} added to your balance.`) : tr('Cancelada fuera del plazo: sin saldo a favor.', 'Cancelled outside the window: no credit.')}</p>}

      {b.status === 'completed' && (
        <div className="card p-5">
          <h2 className="font-bold">{tr('Tu experiencia', 'Your experience')}</h2>
          {reviewed ? <p className="mt-2 text-sm text-mute">{tr('Gracias por tu reseña.', 'Thanks for your review.')}</p> : <button className="btn mt-3" onClick={() => setModal('review')}>{tr('Dejar reseña', 'Leave a review')}</button>}
        </div>
      )}

      {modal === 'cancel' && (
        <Modal title={tr('Cancelar reserva', 'Cancel booking')} onClose={() => setModal(null)}>
          <p className="text-sm">{policy.inTime ? tr(`Cancelación dentro del plazo (${db.settings.cancellationHours} h). Se acreditarán ${money(policy.credit)} a tu saldo a favor.`, `Within the ${db.settings.cancellationHours} h window. ${money(policy.credit)} will be added to your credit balance.`) : tr(`Faltan menos de ${db.settings.cancellationHours} h: se cancela sin saldo a favor.`, `Less than ${db.settings.cancellationHours} h left: cancelled with no credit.`)}</p>
          <div className="mt-4 flex gap-2"><button className="btn btn-danger" onClick={() => { cancelBooking(b.id, user.id); setModal(null) }}>{tr('Confirmar cancelación', 'Confirm cancellation')}</button><button className="btn btn-ghost" onClick={() => setModal(null)}>{tr('Volver', 'Back')}</button></div>
        </Modal>
      )}
      {modal === 'resched' && (
        <Modal title={tr('Modificar horario', 'Change time')} onClose={() => setModal(null)}>
          <p className="mb-3 text-xs text-mute">{tr('Misma duración. Requiere la anticipación de la política de cancelación.', 'Same duration. Needs the notice of the cancellation policy.')}</p>
          <div className="grid grid-cols-2 gap-3"><div><label className="lbl">{tr('Fecha', 'Date')}</label><input type="date" className="field" min={toYMD(new Date())} value={newDay} onChange={(e) => setNewDay(e.target.value)} /></div><div><label className="lbl">{tr('Hora', 'Hour')}</label><select className="field" value={newHour} onChange={(e) => setNewHour(+e.target.value)}>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}</select></div></div>
          <button className="btn mt-4" onClick={() => {
            const [y, m, d] = newDay.split('-').map(Number)
            const r = rescheduleBooking(b.id, new Date(y, m - 1, d, newHour), user.id)
            if (r.ok) { setModal(null); setMsg(tr('Horario actualizado.', 'Time updated.')) } else setMsg(errText(r.error))
          }}>{tr('Guardar', 'Save')}</button>
        </Modal>
      )}
      {modal === 'review' && (
        <Modal title={tr('Reseña', 'Review')} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <div><label className="lbl">{tr('Calificación general', 'Overall rating')}</label><Stars value={rev.rating} onChange={(v) => setRev({ ...rev, rating: v })} size={26} /></div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {(['sound', 'comfort', 'equipment'] as const).map((k) => (<div key={k}><label className="lbl">{k === 'sound' ? tr('Sonido', 'Sound') : k === 'comfort' ? tr('Comodidad', 'Comfort') : tr('Equipo', 'Equipment')}</label><Stars value={rev[k]} onChange={(v) => setRev({ ...rev, [k]: v })} size={18} /></div>))}
            </div>
            <div><label className="lbl">{tr('Comentario', 'Comment')}</label><textarea className="field" rows={3} value={rev.text} onChange={(e) => setRev({ ...rev, text: e.target.value })} /></div>
            <button className="btn" onClick={() => { const r = addReview({ spaceId: space.id, userId: user.id, bookingId: b.id, rating: rev.rating, text: rev.text, experience: { sound: rev.sound, comfort: rev.comfort, equipment: rev.equipment } }); if (r.ok) setModal(null); else setMsg(errText(r.error)) }}>{tr('Publicar', 'Publish')}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
