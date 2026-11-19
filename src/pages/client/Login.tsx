/**
 * pages/client/Login.tsx
 * Demo login. There is no real authentication in the prototype: you pick one of the
 * fictional accounts (customer, staff, admin) or sign up with name + email.
 * A real backend would replace this with secure auth (email/password, OAuth) and
 * roles issued by the server.
 */
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDB, useI18n } from '../../hooks'
import { login, register } from '../../api'
import { Avatar } from '../../components/ui'

export default function Login() {
  const { tr } = useI18n()
  const db = useDB()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  /** Staff go to the admin panel, customers to the home page. */
  const enter = (id: string, role: string) => { login(id); nav(role === 'client' ? '/' : '/admin') }

  const demo = [db.users.find((u) => u.id === 'u1'), db.users.find((u) => u.id === 'u3'), db.users.find((u) => u.id === 'u-admin'), db.users.find((u) => u.id === 'u-emp1'), db.users.find((u) => u.id === 'u-emp2')].filter(Boolean)
  const desc: Record<string, [string, string]> = {
    u1: ['Cliente con membresía Pro y saldo a favor', 'Customer with Pro membership and credit'],
    u3: ['Cliente sin membresía', 'Customer without membership'],
    'u-admin': ['Administradora: acceso total al panel', 'Administrator: full panel access'],
    'u-emp1': ['Empleado: solo reservas y acceso', 'Staff: bookings and access only'],
    'u-emp2': ['Empleada: reservas, moderación y reportes', 'Staff: bookings, moderation and reports'],
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold">{params.get('admin') ? tr('Acceso al panel administrativo', 'Admin panel sign-in') : tr('Ingresar a TEMPO', 'Log in to TEMPO')}</h1>
      <p className="mt-2 text-sm text-mute">{tr('Prototipo: elige una cuenta de demostración. No se requiere contraseña.', 'Prototype: pick a demo account. No password required.')}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {demo.map((u) => u && (
          <button key={u.id} onClick={() => enter(u.id, u.role)} className="card flex items-center gap-3 p-4 text-left hover:border-amber">
            <Avatar name={u.name} hue={u.hue} size={44} />
            <span><span className="block font-semibold">{u.name}</span><span className="block text-xs text-mute">{tr(...desc[u.id])}</span></span>
          </button>
        ))}
      </div>
      <form className="card mt-8 space-y-3 p-5" onSubmit={(e) => { e.preventDefault(); const r = register(name, email); if (r.ok) nav('/') }}>
        <h2 className="font-bold">{tr('Crear cuenta nueva', 'Create a new account')}</h2>
        <div><label className="lbl">{tr('Nombre', 'Name')}</label><input className="field" value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div><label className="lbl">Email</label><input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <button className="btn">{tr('Registrarme', 'Sign up')}</button>
      </form>
    </div>
  )
}
