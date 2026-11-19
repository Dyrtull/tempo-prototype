/**
 * pages/client/Home.tsx
 * Landing page: pitch, live "available now" strip, space overview, the four
 * pillars of TEMPO and call-to-actions for plans and day pass.
 */
import { Link } from 'react-router-dom'
import { useDB, useI18n } from '../../hooks'
import { SpaceArt } from '../../components/ui'
import { checkAvailability } from '../../lib/rules'

export default function Home() {
  const { tr, loc, money } = useI18n()
  const db = useDB()

  // "Available now": can a 1 h booking start at the next round hour?
  const next = new Date(); next.setHours(next.getHours() + 1, 0, 0, 0)
  const nextEnd = new Date(next.getTime() + 3600_000)
  const spaces = db.spaces.filter((s) => s.active)
  const freeNow = spaces.filter((s) => checkAvailability(db, s.id, next, nextEnd, 1).ok)

  const pillars = [
    [tr('Reserva en segundos', 'Book in seconds'), tr('Disponibilidad en tiempo real, 24/7, sin reservas duplicadas.', 'Real-time availability, 24/7, no double bookings.')],
    [tr('Acceso inteligente', 'Smart access'), tr('Un código temporal por reserva abre tu sala, sin depender de recepción.', 'A temporary code per booking opens your room, no front desk needed.')],
    [tr('Paga como prefieras', 'Pay your way'), tr('Pago completo o en cuotas, saldo a favor y membresías.', 'Pay in full or in instalments, credit balance and memberships.')],
    [tr('Comunidad', 'Community'), tr('Conecta con músicos y productores de Medellín.', 'Connect with Medellín musicians and producers.')],
  ]

  return (
    <div className="space-y-12">
      <section className="grid items-center gap-8 md:grid-cols-2">
        <div>
          <span className="chip text-amber">{tr('Medellín · Abierto 24/7', 'Medellín · Open 24/7')}</span>
          <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">{tr('El coworking donde la música se hace trabajo.', 'The coworking where music becomes work.')}</h1>
          <p className="mt-4 text-mute">{tr('Estudios de grabación, salas de ensayo, podcast y puestos de trabajo en 125 m² pensados para músicos y productores.', 'Recording studios, rehearsal rooms, podcast and desks in 125 m² built for musicians and producers.')}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/spaces" className="btn">{tr('Ver espacios y reservar', 'Browse spaces & book')}</Link>
            <Link to="/plans" className="btn btn-ghost">{tr('Membresías', 'Memberships')}</Link>
          </div>
        </div>
        <div className="card overflow-hidden"><SpaceArt type="recording" className="h-64 w-full" /></div>
      </section>

      <section>
        <h2 className="text-xl font-bold">{tr('Disponible a las', 'Available at')} {next.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {spaces.map((s) => {
            const free = freeNow.includes(s)
            return <Link key={s.id} to={`/spaces/${s.id}`} className={`chip text-sm ${free ? 'border-signal/50 text-signal' : 'text-mute line-through'}`}>{loc(s.name)}</Link>
          })}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {pillars.map(([t, d]) => (<div key={t} className="card p-5"><h3 className="font-bold text-amber">{t}</h3><p className="mt-2 text-sm text-mute">{d}</p></div>))}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">{tr('Nuestros espacios', 'Our spaces')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {spaces.map((s) => (
            <Link key={s.id} to={`/spaces/${s.id}`} className="card overflow-hidden hover:border-amber">
              <SpaceArt type={s.type} className="h-36 w-full" />
              <div className="p-4"><div className="font-semibold">{loc(s.name)}</div><div className="text-sm text-mute">{money(s.pricePerHour)} / h</div></div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
