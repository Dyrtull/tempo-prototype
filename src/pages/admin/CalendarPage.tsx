/**
 * pages/admin/CalendarPage.tsx
 * Admin calendar: one row per space, one column per hour of the chosen day.
 *  - amber cell = booked (desk pool shows used/total desks), red = maintenance block.
 *  - click a cell to see its bookings (cancel with or without credit), create a booking
 *    on behalf of a customer / walk-in, or block the space for maintenance.
 *  - below the grid: the day's bookings table and the list of blocks.
 * Staff actions go through the same rules as customer ones (availability, buffer...), and
 * are written to the activity log under the employee's name.
 */
import { useState } from 'react'
import { useDB, useI18n, useUser } from '../../hooks'
import { addBlock, cancelBooking, createBooking, removeBlock } from '../../api'
import { Modal, StatusBadge, useErrorText } from '../../components/ui'
import { HOUR, activeBookings, amountDue, toYMD } from '../../lib/rules'

export default function CalendarPage() {
  const { tr, loc, money, dateTime, date: fmtDate } = useI18n()
  const db = useDB()
  const user = useUser()!
  const errText = useErrorText()
  const [day, setDay] = useState(toYMD(new Date()))
  const [cell, setCell] = useState<{ spaceId: string; hour: number } | null>(null)
  const [mode, setMode] = useState<'booking' | 'block'>('booking')
  const [form, setForm] = useState({ userId: '', walkIn: '', hours: 1, units: 1, paid: true, reason: '' })
  const [msg, setMsg] = useState('')

  const [y, m, d] = day.split('-').map(Number)
  const dayStart = new Date(y, m - 1, d)
  const shift = (n: number) => { const x = new Date(dayStart); x.setDate(x.getDate() + n); setDay(toYMD(x)) }
  const active = activeBookings(db)

  /** Bookings / block overlapping a given space+hour cell. */
  const cellInfo = (spaceId: string, hour: number) => {
    const s = dayStart.getTime() + hour * HOUR, e = s + HOUR
    return {
      bookings: active.filter((b) => b.spaceId === spaceId && new Date(b.start).getTime() < e && new Date(b.end).getTime() > s),
      block: db.blocks.find((bl) => bl.spaceId === spaceId && new Date(bl.start).getTime() < e && new Date(bl.end).getTime() > s),
    }
  }
  const nameOf = (b: (typeof db.bookings)[number]) => db.users.find((u) => u.id === b.userId)?.name ?? b.walkInName ?? '—'
  const dayBookings = db.bookings.filter((b) => toYMD(new Date(b.start)) === day).sort((a, b) => a.start.localeCompare(b.start))

  const submit = () => {
    if (!cell) return
    const start = new Date(dayStart.getTime() + cell.hour * HOUR)
    const end = new Date(start.getTime() + form.hours * HOUR)
    const r = mode === 'block'
      ? addBlock(cell.spaceId, start, end, form.reason || tr('Mantenimiento', 'Maintenance'), user.id)
      : createBooking({ userId: form.userId || null, walkInName: form.userId ? undefined : form.walkIn || tr('Cliente presencial', 'Walk-in'), spaceId: cell.spaceId, start, end, units: form.units, createdBy: user.id }, { confirmNow: true, paid: form.paid })
    if (r.ok) { setCell(null); setMsg('') } else setMsg(errText(r.error))
  }

  const cellModal = cell && (() => {
    const info = cellInfo(cell.spaceId, cell.hour)
    const sp = db.spaces.find((s) => s.id === cell.spaceId)!
    return (
      <Modal wide title={`${loc(sp.name)} · ${String(cell.hour).padStart(2, '0')}:00`} onClose={() => { setCell(null); setMsg('') }}>
        {info.bookings.map((b) => (
          <div key={b.id} className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-panel2 p-3 text-sm">
            <div><b>{nameOf(b)}</b> · {dateTime(b.start)} → {dateTime(b.end)} · {b.units > 1 ? `${b.units} ${tr('puestos', 'desks')} · ` : ''}{money(b.total)} {amountDue(b) > 0 && <span className="text-amber">({tr('debe', 'owes')} {money(amountDue(b))})</span>} · {tr('código', 'code')} {b.accessCode}</div>
            <div className="flex gap-2"><button className="btn btn-ghost !py-1 text-xs" onClick={() => cancelBooking(b.id, user.id, true)}>{tr('Cancelar con saldo', 'Cancel with credit')}</button><button className="btn btn-danger !py-1 text-xs" onClick={() => cancelBooking(b.id, user.id, false)}>{tr('Cancelar', 'Cancel')}</button></div>
          </div>
        ))}
        {info.block && <div className="mb-3 flex items-center justify-between rounded-lg bg-rec/15 p-3 text-sm"><span>{tr('Bloqueado', 'Blocked')}: {info.block.reason} ({dateTime(info.block.start)} → {dateTime(info.block.end)})</span><button className="text-xs text-rec" onClick={() => removeBlock(info.block!.id, user.id)}>{tr('Quitar', 'Remove')}</button></div>}
        <div className="mb-3 flex gap-2">
          <button className={`chip text-sm ${mode === 'booking' ? 'border-amber text-amber' : ''}`} onClick={() => setMode('booking')}>{tr('Nueva reserva manual', 'New manual booking')}</button>
          <button className={`chip text-sm ${mode === 'block' ? 'border-amber text-amber' : ''}`} onClick={() => setMode('block')}>{tr('Bloquear por mantenimiento', 'Block for maintenance')}</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {mode === 'booking' && (<>
            <div className="col-span-2"><label className="lbl">{tr('Cliente registrado', 'Registered customer')}</label><select className="field" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}><option value="">{tr('— Cliente presencial —', '— Walk-in —')}</option>{db.users.filter((u) => u.role === 'client').map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
            {!form.userId && <div className="col-span-2"><label className="lbl">{tr('Nombre del cliente', 'Customer name')}</label><input className="field" value={form.walkIn} onChange={(e) => setForm({ ...form, walkIn: e.target.value })} /></div>}
            {sp.units > 1 && <div><label className="lbl">{tr('Puestos', 'Desks')}</label><input type="number" min={1} max={sp.units} className="field" value={form.units} onChange={(e) => setForm({ ...form, units: +e.target.value || 1 })} /></div>}
          </>)}
          {mode === 'block' && <div className="col-span-2"><label className="lbl">{tr('Motivo', 'Reason')}</label><input className="field" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>}
          <div><label className="lbl">{tr('Duración (h)', 'Duration (h)')}</label><input type="number" min={1} max={mode === 'block' ? 72 : db.settings.maxHours} className="field" value={form.hours} onChange={(e) => setForm({ ...form, hours: +e.target.value || 1 })} /></div>
          {mode === 'booking' && <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.checked })} />{tr('Pagada en recepción', 'Paid at the desk')}</label>}
        </div>
        {msg && <p className="mt-3 text-sm text-rec">{msg}</p>}
        <button className="btn mt-4" onClick={submit}>{mode === 'block' ? tr('Bloquear', 'Block') : tr('Crear reserva', 'Create booking')}</button>
      </Modal>
    )
  })()

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{tr('Calendario y reservas', 'Calendar & bookings')}</h1>
        <div className="flex items-center gap-2"><button className="btn btn-ghost" onClick={() => shift(-1)}>‹</button><input type="date" className="field !w-auto" value={day} onChange={(e) => setDay(e.target.value)} /><button className="btn btn-ghost" onClick={() => shift(1)}>›</button><button className="btn btn-ghost" onClick={() => setDay(toYMD(new Date()))}>{tr('Hoy', 'Today')}</button></div>
      </div>
      <p className="text-sm text-mute">{fmtDate(dayStart)} · {tr('Haz clic en una celda para ver, crear o bloquear.', 'Click a cell to view, create or block.')}</p>

      <div className="card overflow-x-auto p-3">
        <table className="w-full border-separate border-spacing-1 text-[10px]">
          <thead><tr><th className="sticky left-0 bg-panel text-left text-mute" />{Array.from({ length: 24 }, (_, h) => <th key={h} className="min-w-9 font-normal text-mute">{String(h).padStart(2, '0')}</th>)}</tr></thead>
          <tbody>{db.spaces.map((sp) => (
            <tr key={sp.id} className={sp.active ? '' : 'opacity-40'}>
              <td className="sticky left-0 whitespace-nowrap bg-panel pr-3 text-xs text-cream">{loc(sp.name)}</td>
              {Array.from({ length: 24 }, (_, h) => {
                const { bookings, block } = cellInfo(sp.id, h)
                const used = bookings.reduce((a, b) => a + b.units, 0)
                const cls = block ? 'bg-rec/40 text-rec' : used ? 'bg-amber/80 text-ink font-bold' : 'bg-panel2 text-line hover:bg-signal/20'
                return <td key={h}><button onClick={() => { setCell({ spaceId: sp.id, hour: h }); setMsg('') }} className={`h-8 w-full rounded ${cls}`}>{block ? '×' : used ? (sp.units > 1 ? `${used}/${sp.units}` : '●') : ''}</button></td>
              })}
            </tr>
          ))}</tbody>
        </table>
      </div>

      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <section className="card overflow-x-auto p-3"><h2 className="mb-2 font-bold">{tr('Reservas del día', "Day's bookings")}</h2>
          <table className="tbl"><thead><tr><th>{tr('Hora', 'Time')}</th><th>{tr('Espacio', 'Space')}</th><th>{tr('Cliente', 'Customer')}</th><th>{tr('Total', 'Total')}</th><th>{tr('Estado', 'Status')}</th></tr></thead>
            <tbody>{dayBookings.map((b) => <tr key={b.id}><td>{dateTime(b.start).split(',').pop()} → {new Date(b.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</td><td>{loc(db.spaces.find((s) => s.id === b.spaceId)!.name)}</td><td>{nameOf(b)}</td><td>{money(b.total)}</td><td><StatusBadge status={b.status} /></td></tr>)}</tbody></table>
          {dayBookings.length === 0 && <p className="p-3 text-sm text-mute">{tr('Sin reservas este día.', 'No bookings this day.')}</p>}</section>
        <section className="card p-3"><h2 className="mb-2 font-bold">{tr('Bloqueos', 'Blocks')}</h2>
          {db.blocks.length === 0 && <p className="text-sm text-mute">—</p>}
          {db.blocks.map((bl) => <div key={bl.id} className="mb-2 flex items-center justify-between text-xs"><span>{loc(db.spaces.find((s) => s.id === bl.spaceId)!.name)}<br /><span className="text-mute">{dateTime(bl.start)} · {bl.reason}</span></span><button className="text-rec" onClick={() => removeBlock(bl.id, user.id)}>✕</button></div>)}</section>
      </div>
      {cellModal}
    </div>
  )
}
