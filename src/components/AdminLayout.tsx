/**
 * components/AdminLayout.tsx
 * Shell of the independent admin panel: sidebar + content. It
 *  - blocks anyone who is not staff (redirects to login),
 *  - shows only the sections the employee has permission for,
 *  - redirects to the first allowed section if the current one is forbidden.
 * Permissions are assigned by the admin in Users & employees.
 */
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { can, useI18n, useUser } from '../hooks'
import { logout } from '../api'
import type { Permission } from '../api/types'
import LangSwitch from './LangSwitch'
import Logo from './Logo'

/** [path, permission, label es, label en]. `null` permission = visible to all staff. */
export const ADMIN_SECTIONS: [string, Permission | null, string, string][] = [
  ['/admin', null, 'Resumen', 'Overview'],
  ['/admin/calendar', 'bookings', 'Calendario y reservas', 'Calendar & bookings'],
  ['/admin/spaces', 'spaces', 'Espacios', 'Spaces'],
  ['/admin/users', 'users', 'Usuarios y empleados', 'Users & staff'],
  ['/admin/finance', 'finance', 'Finanzas', 'Finance'],
  ['/admin/reports', 'reports', 'Reportes', 'Reports'],
  ['/admin/plans', 'plans', 'Membresías y recompensas', 'Memberships & rewards'],
  ['/admin/access', 'access', 'Acceso', 'Access'],
  ['/admin/moderation', 'moderation', 'Moderación', 'Moderation'],
  ['/admin/settings', 'settings', 'Configuración', 'Settings'],
]

export default function AdminLayout() {
  const { tr } = useI18n()
  const user = useUser()
  const loc = useLocation()
  const nav = useNavigate()

  if (!user || user.role === 'client') return <Navigate to="/login?admin=1" replace />

  const allowed = ADMIN_SECTIONS.filter(([, p]) => p === null || can(user, p))
  const here = ADMIN_SECTIONS.find(([path]) => (path === '/admin' ? loc.pathname === '/admin' : loc.pathname.startsWith(path)))
  if (here && here[1] && !can(user, here[1])) return <Navigate to="/admin" replace />

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-line bg-panel p-4 md:min-h-screen md:w-60 md:border-b-0 md:border-r">
        <div className="mb-4 flex items-center justify-between md:block">
          <Link to="/admin"><Logo small /></Link>
          <span className="chip ml-2 md:ml-0 md:mt-2">{user.role === 'admin' ? 'Admin' : tr('Empleado', 'Staff')}</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          {allowed.map(([to, , es, en]) => (
            <NavLink key={to} to={to} end={to === '/admin'}
              className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-panel2 text-amber' : 'text-mute hover:text-cream'}`}>{tr(es, en)}</NavLink>
          ))}
        </nav>
        <div className="mt-4 hidden space-y-2 border-t border-line pt-4 md:block">
          <LangSwitch />
          <div className="text-xs text-mute">{user.name}</div>
          <Link to="/" className="block text-xs text-mute hover:text-cream">{tr('Ver sitio cliente', 'View customer site')}</Link>
          <button className="text-xs text-mute hover:text-cream" onClick={() => { logout(); nav('/') }}>{tr('Salir', 'Log out')}</button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-auto p-4 md:p-8"><Outlet /></main>
    </div>
  )
}
