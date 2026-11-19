/**
 * components/ClientLayout.tsx
 * Shell of the customer web app: top navigation, language switch, notifications
 * bell, login state and a footer. Pages render inside <Outlet />.
 * The nav collapses to a horizontally scrollable bar on phones.
 */
import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useDB, useI18n, useUser } from '../hooks'
import { logout, markNotificationsRead } from '../api'
import LangSwitch from './LangSwitch'
import Logo from './Logo'
import { Avatar } from './ui'

export default function ClientLayout() {
  const { tr, loc, dateTime } = useI18n()
  const user = useUser()
  const db = useDB()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)

  const links = [
    ['/spaces', tr('Espacios', 'Spaces')],
    ['/plans', tr('Membresías', 'Memberships')],
    ['/daypass', tr('Pase diario', 'Day pass')],
    ['/community', tr('Comunidad', 'Community')],
    ['/rewards', tr('Recompensas', 'Rewards')],
  ]
  const notes = user ? db.notifications.filter((n) => n.userId === user.id) : []
  const unread = notes.filter((n) => !n.read).length

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link to="/"><Logo /></Link>
          <nav className="hidden flex-1 gap-1 md:flex">
            {links.map(([to, label]) => (
              <NavLink key={to} to={to} className={({ isActive }) => `rounded-lg px-3 py-1.5 text-sm ${isActive ? 'bg-panel2 text-amber' : 'text-mute hover:text-cream'}`}>{label}</NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <LangSwitch />
            {user ? (
              <>
                <div className="relative">
                  <button className="relative text-mute hover:text-cream" onClick={() => { setOpen(!open); if (!open) markNotificationsRead(user.id) }} aria-label="notifications">
                    <span className="text-lg">♪</span>
                    {unread > 0 && <span className="absolute -right-2 -top-2 rounded-full bg-rec px-1.5 text-[10px] font-bold text-white">{unread}</span>}
                  </button>
                  {open && (
                    <div className="card absolute right-0 mt-2 w-72 p-2 shadow-xl">
                      {notes.length === 0 && <p className="p-3 text-xs text-mute">{tr('Sin notificaciones', 'No notifications')}</p>}
                      {notes.slice(0, 8).map((n) => (
                        <div key={n.id} className="border-b border-line p-2 text-xs last:border-0">
                          <div>{loc(n.text)}</div><div className="mt-0.5 text-mute">{dateTime(n.at)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <Link to="/bookings" className="hidden text-sm text-mute hover:text-cream sm:block">{tr('Mis reservas', 'My bookings')}</Link>
                <Link to="/profile"><Avatar name={user.name} hue={user.hue} size={32} /></Link>
                {user.role !== 'client' && <Link to="/admin" className="btn btn-ghost !px-3 !py-1 text-xs">Admin</Link>}
                <button className="text-xs text-mute hover:text-cream" onClick={() => { logout(); nav('/') }}>{tr('Salir', 'Log out')}</button>
              </>
            ) : (
              <Link to="/login" className="btn !py-1.5">{tr('Ingresar', 'Log in')}</Link>
            )}
          </div>
        </div>
        {/* phone navigation */}
        <nav className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-1 text-sm ${isActive ? 'bg-panel2 text-amber' : 'text-mute'}`}>{label}</NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6"><Outlet /></main>
      <footer className="border-t border-line px-4 py-6 text-center text-xs text-mute">
        TEMPO · {tr('Coworking musical · Medellín, Colombia · 24/7', 'Music coworking · Medellín, Colombia · 24/7')} · {tr('Prototipo con datos ficticios', 'Prototype with fictional data')}
      </footer>
    </div>
  )
}
