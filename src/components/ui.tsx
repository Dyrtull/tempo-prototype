/**
 * components/ui.tsx
 * Small reusable building blocks used by both the customer app and the admin panel:
 * modal, avatar, stat tile, star rating, status badge, generated "photos" for
 * spaces, a simple bar chart and the translation of error codes.
 * Kept dependency-free (no chart or UI library) so the code stays easy to read.
 */
import type { ReactNode } from 'react'
import { useI18n } from '../hooks'
import type { BookingStatus, SpaceType } from '../api/types'

/** Centered dialog with a dark backdrop. Click outside or the X closes it. */
export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4" onClick={onClose}>
      <div className={`card mt-10 w-full p-5 ${wide ? 'max-w-3xl' : 'max-w-lg'}`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button className="text-mute hover:text-cream" onClick={onClose} aria-label="close">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

/** Round avatar made of the user's initials on a colour derived from their `hue`. */
export function Avatar({ name, hue, size = 36 }: { name: string; hue: number; size?: number }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-ink"
      style={{ width: size, height: size, background: `hsl(${hue} 70% 65%)`, fontSize: size * 0.38 }}>{initials}</span>
  )
}

/** Dashboard number tile. */
export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-mute">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
      {hint && <div className="mt-1 text-xs text-mute">{hint}</div>}
    </div>
  )
}

/** Read-only or clickable 1-5 stars. */
export function Stars({ value, onChange, size = 18 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onChange} onClick={() => onChange?.(n)}
          style={{ fontSize: size, lineHeight: 1 }} className={n <= Math.round(value) ? 'text-amber' : 'text-line'}>★</button>
      ))}
    </span>
  )
}

/** Coloured label for a booking status. */
export function StatusBadge({ status, expired }: { status: BookingStatus; expired?: boolean }) {
  const { tr } = useI18n()
  const map: Record<string, [string, string, string]> = {
    pending: [tr('Pendiente de pago', 'Awaiting payment'), 'text-amber', 'border-amber/40'],
    confirmed: [tr('Confirmada', 'Confirmed'), 'text-signal', 'border-signal/40'],
    completed: [tr('Completada', 'Completed'), 'text-mute', 'border-line'],
    cancelled: [expired ? tr('Expirada', 'Expired') : tr('Cancelada', 'Cancelled'), 'text-rec', 'border-rec/40'],
  }
  const [label, color, border] = map[status]
  return <span className={`chip ${color} ${border}`}>{label}</span>
}

/**
 * Generated "photos" for each kind of space. Real photography would replace these
 * (an `images` array on Space); the SVG keeps the demo self-contained.
 * `variant` (0-2) changes the composition so a gallery looks like several shots.
 */
export function SpaceArt({ type, variant = 0, className = '' }: { type: SpaceType; variant?: number; className?: string }) {
  const hue = { recording: 0, rehearsal: 35, podcast: 270, desk: 170 }[type]
  const a = `hsl(${hue + variant * 18} 65% 32%)`
  const b = `hsl(${hue + 40 + variant * 18} 70% 14%)`
  const id = `g-${type}-${variant}`
  return (
    <svg viewBox="0 0 400 240" className={className} preserveAspectRatio="xMidYMid slice" role="img" aria-label={type}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient>
      </defs>
      <rect width="400" height="240" fill={`url(#${id})`} />
      {/* soft light cone, the "tube-amp glow" of the brand */}
      <circle cx={80 + variant * 120} cy="40" r="110" fill="#F5A524" opacity="0.12" />
      {type === 'recording' && (<g fill="none" stroke="#F3EFE8" strokeOpacity=".75" strokeWidth="3">
        <rect x="150" y="70" width="100" height="100" rx="12" /><circle cx="200" cy="120" r="26" /><path d="M120 190h160" strokeLinecap="round" /></g>)}
      {type === 'rehearsal' && (<g fill="none" stroke="#F3EFE8" strokeOpacity=".75" strokeWidth="3">
        <ellipse cx="200" cy="140" rx="70" ry="22" /><path d="M130 140v36m140-36v36M200 162v34" /><circle cx="130" cy="96" r="24" /><circle cx="270" cy="96" r="24" /></g>)}
      {type === 'podcast' && (<g fill="none" stroke="#F3EFE8" strokeOpacity=".75" strokeWidth="3" strokeLinecap="round">
        <rect x="178" y="60" width="44" height="80" rx="22" /><path d="M150 120a50 50 0 0 0 100 0M200 170v30M170 200h60" /></g>)}
      {type === 'desk' && (<g fill="none" stroke="#F3EFE8" strokeOpacity=".75" strokeWidth="3" strokeLinejoin="round">
        <rect x="140" y="80" width="120" height="76" rx="6" /><path d="M110 176h180M200 156v20" strokeLinecap="round" /></g>)}
    </svg>
  )
}

/** Horizontal bar chart in plain divs. `items` = label + value; bars scale to the max. */
export function BarChart({ items, format }: { items: { label: string; value: number }[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <div className="space-y-2">
      {items.map((i) => (
        <div key={i.label} className="text-xs">
          <div className="mb-0.5 flex justify-between"><span>{i.label}</span><span className="text-mute">{format ? format(i.value) : i.value}</span></div>
          <div className="h-2 overflow-hidden rounded bg-panel2"><div className="h-full rounded bg-amber" style={{ width: `${(i.value / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  )
}

/** Vertical column chart for time series (e.g. revenue per day). */
export function ColumnChart({ items, format }: { items: { label: string; value: number }[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <div className="flex h-40 items-end gap-1">
      {items.map((i) => (
        <div key={i.label} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${i.label}: ${format ? format(i.value) : i.value}`}>
          <div className="w-full rounded-t bg-amber" style={{ height: `${(i.value / max) * 100}%`, minHeight: i.value ? 2 : 0 }} />
          <span className="text-[9px] text-mute">{i.label}</span>
        </div>
      ))}
    </div>
  )
}

/** Banner reminding that payments are a visual simulation. */
export function DemoPaymentBanner() {
  const { tr } = useI18n()
  return (
    <div className="rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-xs text-amber">
      {tr('Modo demostración: no se realiza ningún cobro real. Todos los pagos son simulados.', 'Demo mode: no real charge is made. All payments are simulated.')}
    </div>
  )
}

/** Turn an API/rules error code into a friendly bilingual sentence. */
export function useErrorText() {
  const { tr } = useI18n()
  return (code: string) => ({
    too_short: tr('La duración es menor al mínimo permitido.', 'Duration is below the minimum.'),
    too_long: tr('Supera la duración máxima permitida.', 'Exceeds the maximum duration.'),
    taken: tr('Ese horario ya no está disponible.', 'That time slot is no longer available.'),
    blocked: tr('El espacio está bloqueado por mantenimiento en ese horario.', 'The space is blocked for maintenance at that time.'),
    past: tr('No se puede reservar en el pasado.', 'Cannot book in the past.'),
    same_day: tr('Las reservas para el mismo día están desactivadas.', 'Same-day bookings are disabled.'),
    units: tr('Cantidad de puestos no válida.', 'Invalid number of desks.'),
    space_inactive: tr('Este espacio no está disponible.', 'This space is not available.'),
    too_late: tr('Solo se puede modificar con la anticipación de la política de cancelación.', 'Changes need the notice required by the cancellation policy.'),
    not_modifiable: tr('Esta reserva no se puede modificar.', 'This booking cannot be modified.'),
    has_bookings: tr('Hay reservas en ese horario. Cancélalas primero.', 'There are bookings in that window. Cancel them first.'),
    points: tr('No tienes puntos suficientes.', 'Not enough points.'),
    invalid: tr('Revisa los datos ingresados.', 'Please check the data entered.'),
    not_completed: tr('Solo puedes reseñar reservas completadas.', 'You can only review completed bookings.'),
    already: tr('Ya dejaste una reseña para esta reserva.', 'You already reviewed this booking.'),
  } as Record<string, string>)[code] ?? code
}
