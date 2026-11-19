/**
 * pages/admin/SettingsPage.tsx
 * General configuration. Every operational rule from the brief lives here and takes
 * effect immediately across the customer app: schedule, booking duration, margin
 * between bookings, same-day bookings, cancellation window, instalments, loyalty rate,
 * day-pass price, common-zone capacity and languages. Also holds the "Reset demo data"
 * button, which re-seeds the fictional database.
 */
import { useState } from 'react'
import { useDB, useI18n, useUser } from '../../hooks'
import { saveSettings } from '../../api'
import { getDB, resetDB } from '../../api/store'
import type { Settings } from '../../api/types'

export default function SettingsPage() {
  const { tr } = useI18n()
  const db = useDB()
  const user = useUser()!
  const [s, setS] = useState<Settings>(db.settings)
  const [saved, setSaved] = useState(false)

  /** Numeric field helper so the markup below stays short. */
  const num = (key: keyof Settings, label: string, hint?: string) => (
    <div key={key}><label className="lbl">{label}</label><input type="number" min={0} className="field" value={s[key] as number} onChange={(e) => { setS({ ...s, [key]: +e.target.value || 0 }); setSaved(false) }} />{hint && <p className="mt-0.5 text-[11px] text-mute">{hint}</p>}</div>
  )
  const bool = (key: 'open24x7' | 'allowSameDay', label: string) => (
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s[key]} onChange={(e) => { setS({ ...s, [key]: e.target.checked }); setSaved(false) }} />{label}</label>
  )

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">{tr('Configuración general', 'General settings')}</h1>
      <div className="card grid gap-4 p-5 sm:grid-cols-2">
        {bool('open24x7', tr('Abierto 24/7', 'Open 24/7'))}
        {bool('allowSameDay', tr('Permitir reservas para el mismo día', 'Allow same-day bookings'))}
        {num('minHours', tr('Duración mínima (h)', 'Minimum duration (h)'))}
        {num('maxHours', tr('Duración máxima (h)', 'Maximum duration (h)'), tr('Horas consecutivas por reserva', 'Consecutive hours per booking'))}
        {num('bufferMinutes', tr('Margen entre reservas (min)', 'Margin between bookings (min)'))}
        {num('cancellationHours', tr('Política de cancelación (h antes)', 'Cancellation policy (h before)'), tr('Dentro del plazo se genera saldo a favor', 'Within the window the customer gets credit'))}
        {num('holdMinutes', tr('Tiempo para pagar (min)', 'Time to pay (min)'), tr('El horario se libera si no se paga', 'The slot is released if unpaid'))}
        {num('installmentCount', tr('Máximo de cuotas', 'Max instalments'))}
        {num('copPerPoint', tr('COP por punto de fidelización', 'COP per loyalty point'))}
        {num('dayPassPrice', tr('Precio del pase diario (COP)', 'Day pass price (COP)'))}
        {num('commonZoneCapacity', tr('Capacidad de zonas comunes', 'Common-zone capacity'))}
        <div><label className="lbl">{tr('Moneda', 'Currency')}</label><input className="field" disabled value="COP" /></div>
      </div>
      <div className="flex items-center gap-3"><button className="btn" onClick={() => { saveSettings(s, user.id); setSaved(true) }}>{tr('Guardar configuración', 'Save settings')}</button>{saved && <span className="text-sm text-signal">{tr('Guardado. Ya aplica en toda la app.', 'Saved. Applies across the app now.')}</span>}</div>
      <div className="card space-y-2 p-5"><h2 className="font-bold">{tr('Datos de demostración', 'Demo data')}</h2><p className="text-sm text-mute">{tr('Vuelve a generar todos los datos ficticios (reservas, usuarios, publicaciones...).', 'Regenerate all fictional data (bookings, users, posts...).')}</p>
        <button className="btn btn-danger" onClick={() => { if (confirm(tr('¿Restablecer todos los datos de demostración?', 'Reset all demo data?'))) { resetDB(); setS(getDB().settings) /* re-read: component state would otherwise show stale values */ } }}>{tr('Restablecer datos demo', 'Reset demo data')}</button></div>
    </div>
  )
}
