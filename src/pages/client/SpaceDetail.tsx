/**
 * pages/client/SpaceDetail.tsx
 * One space: gallery, description, equipment, price, reviews and the BOOKING PANEL.
 *
 * Booking flow: pick a date -> the hour grid shows which start hours are free
 * (computed by lib/rules.dayTimeline, which respects the 30-minute buffer, blocks and
 * capacity) -> pick a start hour and duration -> live price with membership discount
 * -> "Continue to payment" creates a PENDING booking that holds the slot for a few
 * minutes (settings.holdMinutes) and opens the checkout.
 * Desk pool: the customer chooses how many desks to combine for a group workspace.
 */
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useDB, useI18n, useUser } from '../../hooks'
import { createBooking } from '../../api'
import { SpaceArt, Stars, useErrorText } from '../../components/ui'
import { HOUR, checkAvailability, dayTimeline, quote, toYMD } from '../../lib/rules'

export default function SpaceDetail() {
  const { id } = useParams()
  const { tr, loc, locList, money, date: fmtDate } = useI18n()
  const db = useDB()
  const user = useUser()
  const nav = useNavigate()
  const errText = useErrorText()

  const space = db.spaces.find((s) => s.id === id)
  const [day, setDay] = useState(toYMD(new Date()))
  const [startHour, setStartHour] = useState<number | null>(null)
  const [hours, setHours] = useState(db.settings.minHours)
  const [units, setUnits] = useState(1)
  const [groupId, setGroupId] = useState('')
  const [error, setError] = useState('')
  const [shot, setShot] = useState(0)

  const dayDate = useMemo(() => { const [y, m, d] = day.split('-').map(Number); return new Date(y, m - 1, d) }, [day])
  const timeline = useMemo(() => (space ? dayTimeline(db, space.id, dayDate, units) : []), [db, space, dayDate, units])

  if (!space) return <p className="text-mute">{tr('Espacio no encontrado.', 'Space not found.')} <Link className="text-amber" to="/spaces">{tr('Volver', 'Back')}</Link></p>

  const reviews = db.reviews.filter((r) => r.spaceId === space.id && !r.hidden)
  const avg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0
  const myGroups = user ? db.groups.filter((g) => g.memberIds.includes(user.id)) : []

  // Selected interval + validation message
  const start = startHour !== null ? new Date(dayDate.getTime() + startHour * HOUR) : null
  const end = start ? new Date(start.getTime() + hours * HOUR) : null
  const check = start && end ? checkAvailability(db, space.id, start, end, units) : null
  const q = quote(db, space, user?.id ?? null, hours, units)

  /** Create the pending booking and go to the (simulated) checkout. */
  const proceed = () => {
    if (!user) { nav('/login'); return }
    if (!start || !end) return
    const r = createBooking({ userId: user.id, groupId: groupId || undefined, spaceId: space.id, start, end, units, createdBy: user.id })
    if (!r.ok) { setError(errText(r.error)); return }
    nav(`/checkout/${r.booking.id}`)
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-6">
        <div>
          <Link to="/spaces" className="text-xs text-mute hover:text-cream">← {tr('Espacios', 'Spaces')}</Link>
          <h1 className="mt-1 text-3xl font-bold">{loc(space.name)}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-mute">
            {avg > 0 && <><Stars value={avg} size={14} /><span>{avg.toFixed(1)} ({reviews.length})</span></>}
            <span>24/7</span>
          </div>
        </div>

        {/* Gallery: generated illustrations stand in for photographs */}
        <div>
          <div className="card overflow-hidden"><SpaceArt type={space.type} variant={shot} className="h-72 w-full" /></div>
          <div className="mt-2 flex gap-2">
            {[0, 1, 2].map((v) => (
              <button key={v} onClick={() => setShot(v)} className={`card h-14 w-20 overflow-hidden ${shot === v ? '!border-amber' : ''}`}><SpaceArt type={space.type} variant={v} className="h-full w-full" /></button>
            ))}
          </div>
        </div>

        <p className="text-mute">{loc(space.description)}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="card p-4">
            <h3 className="mb-2 font-bold">{tr('Equipamiento', 'Equipment')}</h3>
            <ul className="space-y-1 text-sm text-mute">{locList(space.equipment).map((e) => <li key={e}>· {e}</li>)}</ul>
          </div>
          <div className="card space-y-1 p-4 text-sm">
            <h3 className="mb-2 font-bold">{tr('Detalles', 'Details')}</h3>
            <div className="flex justify-between"><span className="text-mute">{tr('Precio', 'Price')}</span><span className="text-amber">{money(space.pricePerHour)} / h</span></div>
            <div className="flex justify-between"><span className="text-mute">{tr('Capacidad', 'Capacity')}</span><span>{space.capacity}</span></div>
            {space.units > 1 && <div className="flex justify-between"><span className="text-mute">{tr('Puestos', 'Desks')}</span><span>{space.units}</span></div>}
            <div className="flex justify-between"><span className="text-mute">{tr('Horario', 'Hours')}</span><span>{db.settings.open24x7 ? '24/7' : '—'}</span></div>
            <div className="flex justify-between"><span className="text-mute">{tr('Duración', 'Duration')}</span><span>{db.settings.minHours}–{db.settings.maxHours} h</span></div>
            <div className="flex justify-between"><span className="text-mute">{tr('Pago en cuotas', 'Instalments')}</span><span>{space.installmentsEnabled ? tr('Sí', 'Yes') : 'No'}</span></div>
          </div>
        </div>

        <section>
          <h2 className="mb-3 text-xl font-bold">{tr('Reseñas', 'Reviews')}</h2>
          {reviews.length === 0 && <p className="text-sm text-mute">{tr('Aún no hay reseñas.', 'No reviews yet.')}</p>}
          <div className="space-y-3">
            {reviews.slice(0, 6).map((r) => {
              const author = db.users.find((u) => u.id === r.userId)
              return (
                <div key={r.id} className="card p-4 text-sm">
                  <div className="flex items-center justify-between"><span className="font-semibold">{author?.name}</span><Stars value={r.rating} size={14} /></div>
                  <p className="mt-1 text-mute">{r.text}</p>
                  <div className="mt-2 flex gap-3 text-xs text-mute">
                    <span>{tr('Sonido', 'Sound')} {r.experience.sound}/5</span><span>{tr('Comodidad', 'Comfort')} {r.experience.comfort}/5</span><span>{tr('Equipo', 'Equipment')} {r.experience.equipment}/5</span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {/* Booking panel */}
      <aside className="card h-fit space-y-4 p-5 lg:sticky lg:top-24">
        <h2 className="text-lg font-bold">{tr('Reservar', 'Book')}</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="lbl">{tr('Fecha', 'Date')}</label>
            <input type="date" className="field" min={toYMD(new Date())} value={day} onChange={(e) => { setDay(e.target.value); setStartHour(null) }} />
          </div>
          <div>
            <label className="lbl">{tr('Duración (h)', 'Duration (h)')}</label>
            <select className="field" value={hours} onChange={(e) => setHours(+e.target.value)}>
              {Array.from({ length: db.settings.maxHours - db.settings.minHours + 1 }, (_, i) => db.settings.minHours + i).map((h) => <option key={h} value={h}>{h} h</option>)}
            </select>
          </div>
        </div>
        {space.units > 1 && (
          <div>
            <label className="lbl">{tr('Puestos a combinar (espacio grupal)', 'Desks to combine (group space)')}</label>
            <input type="number" className="field" min={1} max={space.units} value={units} onChange={(e) => { setUnits(Math.max(1, Math.min(space.units, +e.target.value || 1))); setStartHour(null) }} />
          </div>
        )}
        {myGroups.length > 0 && (
          <div>
            <label className="lbl">{tr('Reservar como', 'Book as')}</label>
            <select className="field" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              <option value="">{tr('Perfil personal', 'Personal profile')}</option>
              {myGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="lbl">{tr('Hora de inicio', 'Start time')} · {fmtDate(dayDate)}</label>
          <div className="grid grid-cols-6 gap-1">
            {timeline.map((c) => (
              <button key={c.hour} disabled={!c.free} onClick={() => { setStartHour(c.hour); setError('') }}
                className={`rounded-md py-1.5 text-xs ${startHour === c.hour ? 'bg-amber font-bold text-ink' : c.free ? 'bg-signal/15 text-signal hover:bg-signal/30' : 'bg-panel2 text-line line-through'}`}>
                {String(c.hour).padStart(2, '0')}:00
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-mute">{tr(`Verde = libre. Se deja un margen de ${db.settings.bufferMinutes} min entre reservas.`, `Green = free. A ${db.settings.bufferMinutes}-min margin is kept between bookings.`)}</p>
        </div>

        {start && end && (
          <div className="rounded-lg bg-panel2 p-3 text-sm">
            <div>{fmtDate(start)} · {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} → {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
            {check && !check.ok ? <div className="mt-1 text-rec">{errText(check.reason)}</div> : (
              <div className="mt-2 space-y-0.5">
                <div className="flex justify-between text-mute"><span>{tr('Subtotal', 'Subtotal')}</span><span>{money(q.gross)}</span></div>
                {q.pct > 0 && <div className="flex justify-between text-signal"><span>{tr('Descuento membresía', 'Membership discount')} {q.pct}%</span><span>−{money(q.discount)}</span></div>}
                <div className="flex justify-between text-base font-bold"><span>Total</span><span className="text-amber">{money(q.total)}</span></div>
              </div>
            )}
          </div>
        )}
        {error && <p className="text-sm text-rec">{error}</p>}
        <button className="btn w-full" disabled={!start || !check?.ok} onClick={proceed}>{user ? tr('Continuar al pago', 'Continue to payment') : tr('Ingresar para reservar', 'Log in to book')}</button>
      </aside>
    </div>
  )
}
