/**
 * pages/admin/Dashboard.tsx
 * Admin landing page: today's numbers at a glance (bookings, revenue, occupancy),
 * pending balances, next arrivals, items waiting for moderation and recent staff
 * activity. Everything is computed from the shared database, so a booking made in the
 * customer tab shows up here immediately.
 */
import { Link } from 'react-router-dom'
import { useDB, useI18n } from '../../hooks'
import { Stat, StatusBadge } from '../../components/ui'
import { activeBookings, amountDue, toYMD } from '../../lib/rules'

export default function Dashboard() {
  const { tr, loc, money, dateTime } = useI18n()
  const db = useDB()
  const now = Date.now()
  const today = toYMD(new Date())

  const todayBookings = db.bookings.filter((b) => b.status !== 'cancelled' && toYMD(new Date(b.start)) === today)
  const revenueToday = db.transactions.filter((t) => toYMD(new Date(t.at)) === today && ['payment', 'extension', 'membership', 'daypass'].includes(t.type)).reduce((a, t) => a + t.amount, 0)
  const active = activeBookings(db)
  // spaces that have a booking running right now
  const busyNow = new Set(active.filter((b) => new Date(b.start).getTime() <= now && new Date(b.end).getTime() > now).map((b) => b.spaceId))
  const spaces = db.spaces.filter((s) => s.active)
  const pendingBalance = active.reduce((a, b) => a + amountDue(b), 0)
  const upcoming = active.filter((b) => new Date(b.start).getTime() > now).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 8)
  const reported = db.posts.filter((p) => p.reported).length + db.reviews.filter((r) => r.reported).length

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{tr('Resumen', 'Overview')}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={tr('Reservas hoy', "Today's bookings")} value={todayBookings.length} />
        <Stat label={tr('Ingresos hoy', "Today's revenue")} value={money(revenueToday)} />
        <Stat label={tr('Ocupación ahora', 'Occupancy now')} value={`${busyNow.size}/${spaces.length}`} hint={tr('espacios en uso', 'spaces in use')} />
        <Stat label={tr('Saldo pendiente por cobrar', 'Outstanding balance')} value={money(pendingBalance)} hint={tr('cuotas de reservas activas', 'instalments on active bookings')} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-4"><h2 className="mb-3 font-bold">{tr('Próximas reservas', 'Next bookings')}</h2>
          <table className="tbl"><tbody>{upcoming.map((b) => (
            <tr key={b.id}><td>{dateTime(b.start)}</td><td>{loc(db.spaces.find((s) => s.id === b.spaceId)!.name)}</td><td>{db.users.find((u) => u.id === b.userId)?.name ?? b.walkInName}</td><td><StatusBadge status={b.status} /></td></tr>
          ))}</tbody></table></section>
        <section className="card space-y-3 p-4">
          <h2 className="font-bold">{tr('Pendientes', 'To do')}</h2>
          <div className="text-sm">{reported > 0 ? <Link to="/admin/moderation" className="text-rec">{reported} {tr('elementos reportados por revisar', 'reported items to review')}</Link> : <span className="text-mute">{tr('Sin reportes pendientes', 'No pending reports')}</span>}</div>
          <h2 className="pt-2 font-bold">{tr('Actividad reciente del personal', 'Recent staff activity')}</h2>
          <ul className="space-y-1 text-xs text-mute">{db.activity.slice(0, 6).map((a) => <li key={a.id}>{dateTime(a.at)} · <b className="text-cream">{db.users.find((u) => u.id === a.userId)?.name}</b> · {a.action}</li>)}</ul>
        </section>
      </div>
    </div>
  )
}
