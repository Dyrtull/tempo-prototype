/**
 * pages/admin/AccessAdmin.tsx
 * Smart-access control centre.
 *  - DOOR SIMULATOR: acts like the keypad on a door. Pick a space, type the 6-digit code
 *    and a simulated date/time (to test inside a booking window without waiting). The
 *    same validation a real door controller would call (lib/rules.validateAccess) runs and
 *    the attempt is logged.
 *  - Access log: every entry/exit and every denied attempt, with the reason.
 *  - Codes in force: bookings whose window is now or upcoming, with lock status.
 * In production the door controller (e.g. smart lock + gateway) would call a server
 * endpoint with the same contract: (space, code, time) -> granted/denied.
 */
import { useState } from 'react'
import { useDB, useI18n } from '../../hooks'
import { doorAttempt } from '../../api'
import { amountDue } from '../../lib/rules'

/** yyyy-mm-ddThh:mm for <input type="datetime-local"> in local time. */
const localInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

export default function AccessAdmin() {
  const { tr, loc, dateTime } = useI18n()
  const db = useDB()
  const [spaceId, setSpaceId] = useState(db.spaces[0].id)
  const [code, setCode] = useState('')
  const [when, setWhen] = useState(localInput(new Date()))
  const [res, setRes] = useState<null | { ok: boolean; reason: string; direction?: 'in' | 'out' }>(null)

  const reasons: Record<string, string> = {
    ok: tr('Acceso concedido', 'Access granted'), daypass: tr('Pase diario válido', 'Valid day pass'),
    unknown_code: tr('Código desconocido o de otra sala', 'Unknown code or wrong room'),
    too_early: tr('Antes del horario reservado', 'Before the reserved time'), expired: tr('Horario reservado terminado', 'Reserved time is over'),
    unpaid: tr('Reserva con saldo pendiente', 'Booking has an unpaid balance'), not_confirmed: tr('Reserva sin confirmar', 'Booking not confirmed'),
  }
  const now = Date.now()
  const inForce = db.bookings.filter((b) => b.status === 'confirmed' && new Date(b.end).getTime() > now).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 12)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{tr('Acceso inteligente', 'Smart access')}</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section className="card space-y-3 p-5"><h2 className="font-bold">{tr('Simulador de puerta', 'Door simulator')}</h2>
          <div><label className="lbl">{tr('Puerta / espacio', 'Door / space')}</label><select className="field" value={spaceId} onChange={(e) => setSpaceId(e.target.value)}>{db.spaces.map((s) => <option key={s.id} value={s.id}>{loc(s.name)}</option>)}</select></div>
          <div><label className="lbl">{tr('Código numérico', 'Numeric code')}</label><input className="field text-center font-display text-2xl tracking-[0.4em]" maxLength={6} inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /></div>
          <div><label className="lbl">{tr('Fecha y hora simuladas', 'Simulated date & time')}</label><input type="datetime-local" className="field" value={when} onChange={(e) => setWhen(e.target.value)} /></div>
          <button className="btn w-full" disabled={code.length !== 6} onClick={() => setRes(doorAttempt(spaceId, code, new Date(when)))}>{tr('Probar código', 'Try code')}</button>
          {res && <div className={`rounded-lg p-3 text-center font-bold ${res.ok ? 'bg-signal/20 text-signal' : 'bg-rec/20 text-rec'}`}>{res.ok ? (res.direction === 'out' ? tr('SALIDA registrada', 'EXIT recorded') : tr('ENTRADA registrada', 'ENTRY recorded')) : tr('DENEGADO', 'DENIED')}<div className="text-xs font-normal">{reasons[res.reason] ?? res.reason}</div></div>}
        </section>
        <section className="card overflow-x-auto p-4"><h2 className="mb-2 font-bold">{tr('Códigos vigentes y próximos', 'Codes in force and upcoming')}</h2>
          <table className="tbl"><thead><tr><th>{tr('Espacio', 'Space')}</th><th>{tr('Horario', 'Window')}</th><th>{tr('Código', 'Code')}</th><th>{tr('Estado', 'Status')}</th></tr></thead>
            <tbody>{inForce.map((b) => <tr key={b.id}><td>{loc(db.spaces.find((s) => s.id === b.spaceId)!.name)}</td><td>{dateTime(b.start)} → {new Date(b.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</td>
              <td><button className="font-mono text-amber" onClick={() => { setSpaceId(b.spaceId); setCode(b.accessCode); setWhen(localInput(new Date(b.start))) }}>{b.accessCode}</button></td><td className={amountDue(b) > 0 ? 'text-amber' : 'text-signal'}>{amountDue(b) > 0 ? tr('Bloqueado (saldo)', 'Locked (balance)') : tr('Activo', 'Active')}</td></tr>)}</tbody></table>
          <p className="mt-2 text-xs text-mute">{tr('Haz clic en un código para cargarlo en el simulador.', 'Click a code to load it into the simulator.')}</p></section>
      </div>
      <section className="card overflow-x-auto p-4"><h2 className="mb-2 font-bold">{tr('Historial de accesos', 'Access history')}</h2>
        <table className="tbl"><thead><tr><th>{tr('Fecha', 'Date')}</th><th>{tr('Espacio', 'Space')}</th><th>{tr('Usuario', 'User')}</th><th>{tr('Evento', 'Event')}</th><th>{tr('Resultado', 'Result')}</th></tr></thead>
          <tbody>{[...db.access].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 60).map((a) => <tr key={a.id}><td>{dateTime(a.at)}</td><td>{loc(db.spaces.find((s) => s.id === a.spaceId)!.name)}</td><td>{db.users.find((u) => u.id === a.userId)?.name ?? '—'}</td><td>{a.result === 'granted' ? (a.direction === 'in' ? tr('Entrada', 'Entry') : tr('Salida', 'Exit')) : '—'}</td><td className={a.result === 'granted' ? 'text-signal' : 'text-rec'}>{a.result === 'granted' ? tr('Concedido', 'Granted') : `${tr('Denegado', 'Denied')} · ${reasons[a.reason] ?? a.reason}`}</td></tr>)}</tbody></table></section>
    </div>
  )
}
