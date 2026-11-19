/**
 * pages/admin/Finance.tsx
 * Money overview built from the transaction ledger and the bookings:
 * total income, income per space, memberships and day passes, outstanding balances,
 * pending instalments, cancellations, credit balances owed to customers and the full
 * transaction history (filterable by type).
 */
import { useState } from 'react'
import { useDB, useI18n } from '../../hooks'
import { BarChart, Stat } from '../../components/ui'
import { activeBookings, amountDue } from '../../lib/rules'
import type { TxType } from '../../api/types'

const INCOME: TxType[] = ['payment', 'extension', 'membership', 'daypass']

export default function Finance() {
  const { tr, loc, money, dateTime } = useI18n()
  const db = useDB()
  const [type, setType] = useState<'all' | TxType>('all')

  const income = db.transactions.filter((t) => INCOME.includes(t.type))
  const total = income.reduce((a, t) => a + t.amount, 0)
  const memberships = income.filter((t) => t.type === 'membership').reduce((a, t) => a + t.amount, 0)
  const passes = income.filter((t) => t.type === 'daypass').reduce((a, t) => a + t.amount, 0)

  // income per space: payment/extension lines reference a booking id
  const perSpace = db.spaces.map((s) => ({
    label: loc(s.name),
    value: income.filter((t) => (t.type === 'payment' || t.type === 'extension') && db.bookings.find((b) => b.id === t.ref)?.spaceId === s.id).reduce((a, t) => a + t.amount, 0),
  }))

  const active = activeBookings(db)
  const pendingTotal = active.reduce((a, b) => a + amountDue(b), 0)
  const pendingInst = active.flatMap((b) => b.installments.filter((i) => !i.paidAt).map((i) => ({ b, i }))).sort((x, y) => x.i.dueDate.localeCompare(y.i.dueDate))
  const cancelled = db.bookings.filter((b) => b.status === 'cancelled' && b.creditGranted !== undefined)
  const creditOwed = db.users.reduce((a, u) => a + u.credit, 0)
  const list = db.transactions.filter((t) => type === 'all' || t.type === type).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 100)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{tr('Finanzas', 'Finance')}</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={tr('Ingresos totales', 'Total income')} value={money(total)} />
        <Stat label={tr('Por membresías', 'Memberships')} value={money(memberships)} hint={`${tr('Pases diarios', 'Day passes')}: ${money(passes)}`} />
        <Stat label={tr('Pagos pendientes', 'Pending payments')} value={money(pendingTotal)} hint={`${pendingInst.length} ${tr('cuotas', 'instalments')}`} />
        <Stat label={tr('Saldos a favor', 'Customer credit')} value={money(creditOwed)} hint={`${cancelled.length} ${tr('cancelaciones', 'cancellations')}`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-4"><h2 className="mb-3 font-bold">{tr('Ingresos por espacio', 'Income by space')}</h2><BarChart items={perSpace} format={money} /></section>
        <section className="card overflow-x-auto p-4"><h2 className="mb-3 font-bold">{tr('Cuotas pendientes', 'Pending instalments')}</h2>
          <table className="tbl"><thead><tr><th>{tr('Vence', 'Due')}</th><th>{tr('Cliente', 'Customer')}</th><th className="text-right">{tr('Valor', 'Amount')}</th></tr></thead>
            <tbody>{pendingInst.slice(0, 8).map(({ b, i }) => <tr key={i.id}><td>{dateTime(i.dueDate)}</td><td>{db.users.find((u) => u.id === b.userId)?.name ?? b.walkInName}</td><td className="text-right">{money(i.amount)}</td></tr>)}</tbody></table>
          {pendingInst.length === 0 && <p className="text-sm text-mute">—</p>}</section>
      </div>
      <section className="card overflow-x-auto p-4">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">{tr('Historial de transacciones', 'Transaction history')}</h2>
          <select className="field !w-auto" value={type} onChange={(e) => setType(e.target.value as 'all' | TxType)}><option value="all">{tr('Todas', 'All')}</option>{(['payment', 'extension', 'membership', 'daypass', 'credit_in', 'credit_out'] as TxType[]).map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
        <table className="tbl"><thead><tr><th>{tr('Fecha', 'Date')}</th><th>{tr('Tipo', 'Type')}</th><th>{tr('Cliente', 'Customer')}</th><th>{tr('Detalle', 'Detail')}</th><th>{tr('Método', 'Method')}</th><th className="text-right">{tr('Valor', 'Amount')}</th></tr></thead>
          <tbody>{list.map((t) => <tr key={t.id}><td>{dateTime(t.at)}</td><td>{t.type}</td><td>{db.users.find((u) => u.id === t.userId)?.name ?? tr('Invitado', 'Guest')}</td><td>{t.note}</td><td>{t.method}</td><td className={`text-right ${t.amount < 0 ? 'text-rec' : ''}`}>{money(t.amount)}</td></tr>)}</tbody></table>
      </section>
    </div>
  )
}
