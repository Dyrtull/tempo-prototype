/**
 * pages/client/Spaces.tsx
 * Catalogue of all active spaces with type filter, price, capacity and rating.
 * Prices, capacities and the list itself come from the database, so whatever the
 * admin edits in the panel appears here without code changes.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDB, useI18n } from '../../hooks'
import { SpaceArt, Stars } from '../../components/ui'
import type { SpaceType } from '../../api/types'

export default function Spaces() {
  const { tr, loc, money } = useI18n()
  const db = useDB()
  const [filter, setFilter] = useState<'all' | SpaceType>('all')
  const types: ['all' | SpaceType, string][] = [
    ['all', tr('Todos', 'All')], ['recording', tr('Estudios', 'Studios')], ['rehearsal', tr('Ensayo', 'Rehearsal')],
    ['podcast', 'Podcast'], ['desk', 'Coworking'],
  ]
  const list = db.spaces.filter((s) => s.active && (filter === 'all' || s.type === filter))
  const rating = (id: string) => {
    const r = db.reviews.filter((x) => x.spaceId === id && !x.hidden)
    return r.length ? r.reduce((a, x) => a + x.rating, 0) / r.length : 0
  }

  return (
    <div>
      <h1 className="text-3xl font-bold">{tr('Espacios', 'Spaces')}</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        {types.map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} className={`chip text-sm ${filter === k ? 'border-amber text-amber' : ''}`}>{label}</button>
        ))}
      </div>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((s) => (
          <Link key={s.id} to={`/spaces/${s.id}`} className="card overflow-hidden hover:border-amber">
            <SpaceArt type={s.type} className="h-40 w-full" />
            <div className="space-y-2 p-4">
              <div className="font-display text-lg font-bold">{loc(s.name)}</div>
              <p className="line-clamp-2 text-sm text-mute">{loc(s.description)}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-amber">{money(s.pricePerHour)} / h</span>
                <span className="text-mute">{s.units > 1 ? `${s.units} ${tr('puestos', 'desks')}` : `${tr('hasta', 'up to')} ${s.capacity}`}</span>
              </div>
              {rating(s.id) > 0 && <Stars value={rating(s.id)} size={14} />}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
