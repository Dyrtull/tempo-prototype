/**
 * pages/admin/Reports.tsx
 * Daily, weekly and monthly reports: bookings, income, space utilisation, customers
 * and general activity. In production a server job would generate and email them on a
 * schedule; in the prototype they are computed on demand from the data, and the
 * "Automatic reports" list jumps to the latest of each kind. Export to CSV or print/PDF.
 */
import { useState } from 'react'
import { useDB, useI18n } from '../../hooks'
import { ColumnChart, Stat } from '../../components/ui'
import { DAY, HOUR, toYMD } from '../../lib/rules'

type Period = 'day' | 'week' | 'month'

/** [start, end) of the period containing `anchor`. Weeks start on Monday. */
function range(period: Period, anchor: Date): [Date, Date] {
  const a = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())
  if (period === 'day') return [a, new Date(a.getTime() + DAY)]
  if (period === 'week') { const s = new Date(a.getTime() - ((a.getDay() + 6) % 7) * DAY); return [s, new Date(s.getTime() + 7 * DAY)] }
  return [new Date(a.getFullYear(), a.getMonth(), 1), new Date(a.getFullYear(), a.getMonth() + 1, 1)]
}

export default function Reports() {
  const { tr, loc, money, date } = useI18n()
  const db = useDB()
  const [period, setPeriod] = useState<Period>('week')
  const [anchor, setAnchor] = useState(toYMD(new Date()))
  const [y, m, d] = anchor.split('-').map(Number)
  const [from, to] = range(period, new Date(y, m - 1, d))
  const inR = (iso: string) => { const t = new Date(iso).getTime(); return t >= from.getTime() && t < to.getTime() }
  const days = Math.round((to.getTime() - from.getTime()) / DAY)

  const bookings = db.bookings.filter((b) => b.status !== 'cancelled' && inR(b.start))
  const tx = db.transactions.filter((t) => inR(t.at) && ['payment', 'extension', 'membership', 'daypass'].includes(t.type))
  const revenue = tx.reduce((a, t) => a + t.amount, 0)
  const cancelled = db.bookings.filter((b) => b.cancelledAt && inR(b.cancelledAt) && b.creditGranted !== undefined).length
  const customers = new Set(bookings.map((b) => b.userId).filter(Boolean))

  // utilisation = booked unit-hours / available unit-hours (24 h x units x days)
  const util = db.spaces.map((s) => {
    const hrs = bookings.filter((b) => b.spaceId === s.id).reduce((a, b) => a + ((new Date(b.end).getTime() - new Date(b.start).getTime()) / HOUR) * b.units, 0)
    return { name: loc(s.name), hours: hrs, pct: (hrs / (24 * days * s.units)) * 100 }
  })
  const topClients = [...customers].map((id) => ({ name: db.users.find((u) => u.id === id)?.name ?? '', spent: bookings.filter((b) => b.userId === id).reduce((a, b) => a + b.total, 0) })).sort((a, b) => b.spent - a.spent).slice(0, 5)

  // income per day for the chart (monthly: one column per day, daily: per hour is overkill -> single bar)
  const series = Array.from({ length: days }, (_, i) => {
    const s = new Date(from.getTime() + i * DAY)
    return { label: String(s.getDate()), value: tx.filter((t) => toYMD(new Date(t.at)) === toYMD(s)).reduce((a, t) => a + t.amount, 0) }
  })

  /** Download the summary as a CSV file (opens in Excel/Sheets). */
  const exportCsv = () => {
    const rows = [['space', 'hours_booked', 'utilization_pct'], ...util.map((u) => [u.name, u.hours.toFixed(1), u.pct.toFixed(1)]), [], ['bookings', bookings.length], ['revenue_cop', revenue], ['cancellations', cancelled]]
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `tempo-report-${period}-${anchor}.csv`; a.click()
  }
  const jump = (p: Period, offsetDays: number) => { setPeriod(p); setAnchor(toYMD(new Date(Date.now() - offsetDays * DAY))) }

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-bold">{tr('Reportes', 'Reports')}</h1>
        <div className="flex items-center gap-2">
          {(['day', 'week', 'month'] as Period[]).map((p) => <button key={p} className={`chip text-sm ${period === p ? 'border-amber text-amber' : ''}`} onClick={() => setPeriod(p)}>{p === 'day' ? tr('Diario', 'Daily') : p === 'week' ? tr('Semanal', 'Weekly') : tr('Mensual', 'Monthly')}</button>)}
          <input type="date" className="field !w-auto" value={anchor} onChange={(e) => setAnchor(e.target.value)} />
          <button className="btn btn-ghost" onClick={exportCsv}>CSV</button><button className="btn btn-ghost" onClick={() => window.print()}>PDF</button></div></div>

      <div className="no-print card p-4 text-sm"><b>{tr('Reportes automáticos', 'Automatic reports')}</b> <span className="text-mute">· {tr('el sistema los genera solo y los envía al administrador (simulado)', 'generated and emailed to the admin automatically (simulated)')}</span>
        <div className="mt-2 flex flex-wrap gap-2"><button className="chip hover:text-amber" onClick={() => jump('day', 1)}>{tr('Ayer', 'Yesterday')}</button><button className="chip hover:text-amber" onClick={() => jump('week', 7)}>{tr('Semana pasada', 'Last week')}</button><button className="chip hover:text-amber" onClick={() => jump('month', 31)}>{tr('Mes pasado', 'Last month')}</button></div></div>

      <p className="text-sm text-mute">{date(from)} → {date(new Date(to.getTime() - 1))}</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={tr('Reservas', 'Bookings')} value={bookings.length} /><Stat label={tr('Ingresos', 'Income')} value={money(revenue)} />
        <Stat label={tr('Clientes activos', 'Active customers')} value={customers.size} /><Stat label={tr('Cancelaciones', 'Cancellations')} value={cancelled} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-4"><h2 className="mb-3 font-bold">{tr('Ingresos por día', 'Income per day')}</h2><ColumnChart items={series} format={money} /></section>
        <section className="card overflow-x-auto p-4"><h2 className="mb-3 font-bold">{tr('Utilización de espacios', 'Space utilisation')}</h2>
          <table className="tbl"><thead><tr><th>{tr('Espacio', 'Space')}</th><th className="text-right">{tr('Horas', 'Hours')}</th><th className="text-right">%</th></tr></thead><tbody>{util.map((u) => <tr key={u.name}><td>{u.name}</td><td className="text-right">{u.hours.toFixed(1)}</td><td className="text-right">{u.pct.toFixed(1)}%</td></tr>)}</tbody></table></section>
      </div>
      <section className="card p-4"><h2 className="mb-3 font-bold">{tr('Mejores clientes', 'Top customers')}</h2>
        <ol className="space-y-1 text-sm">{topClients.map((c, i) => <li key={c.name} className="flex justify-between"><span>{i + 1}. {c.name}</span><span className="text-mute">{money(c.spent)}</span></li>)}</ol></section>
    </div>
  )
}
