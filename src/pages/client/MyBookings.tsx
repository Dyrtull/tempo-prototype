/**
 * pages/client/MyBookings.tsx
 * The customer's booking history split into upcoming and past, with status,
 * balance due and quick access to the booking detail or payment.
 */
import { Link } from 'react-router-dom'
import { useDB, useI18n, useUser } from '../../hooks'
import { StatusBadge } from '../../components/ui'
import { amountDue } from '../../lib/rules'

export default function MyBookings() {
  const { tr, loc, money, dateTime } = useI18n()
  const db = useDB()
  const user = useUser()
  if (!user) return <p>{tr('Ingresa para ver tus reservas.', 'Log in to see your bookings.')} <Link to="/login" className="text-amber">{tr('Ingresar', 'Log in')}</Link></p>

  const mine = db.bookings.filter((b) => b.userId === user.id).sort((a, b) => b.start.localeCompare(a.start))
  const now = new Date().toISOString()
  const upcoming = mine.filter((b) => b.end >= now && b.status !== 'cancelled' && b.status !== 'completed').reverse()
  const past = mine.filter((b) => !upcoming.includes(b))

  /** One row/card for a booking. */
  const Row = ({ b }: { b: (typeof mine)[number] }) => {
    const sp = db.spaces.find((s) => s.id === b.spaceId)
    return (
      <Link to={`/bookings/${b.id}`} className="card flex flex-wrap items-center justify-between gap-3 p-4 hover:border-amber">
        <div>
          <div className="font-semibold">{sp ? loc(sp.name) : ''}</div>
          <div className="text-sm text-mute">{dateTime(b.start)} → {dateTime(b.end)}</div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {b.status !== 'cancelled' && amountDue(b) > 0 && <span className="text-amber">{tr('Saldo', 'Balance')} {money(amountDue(b))}</span>}
          <span>{money(b.total)}</span>
          <StatusBadge status={b.status} expired={b.status === 'cancelled' && b.creditGranted === undefined} />
        </div>
      </Link>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between"><h1 className="text-3xl font-bold">{tr('Mis reservas', 'My bookings')}</h1><Link to="/spaces" className="btn">{tr('Nueva reserva', 'New booking')}</Link></div>
      <section><h2 className="mb-3 font-bold text-mute">{tr('Próximas', 'Upcoming')}</h2><div className="space-y-2">{upcoming.length ? upcoming.map((b) => <Row key={b.id} b={b} />) : <p className="text-sm text-mute">{tr('No tienes reservas próximas.', 'No upcoming bookings.')}</p>}</div></section>
      <section><h2 className="mb-3 font-bold text-mute">{tr('Historial', 'History')}</h2><div className="space-y-2">{past.map((b) => <Row key={b.id} b={b} />)}</div></section>
    </div>
  )
}
