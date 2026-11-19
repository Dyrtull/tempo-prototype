/**
 * pages/admin/SpacesAdmin.tsx
 * Create and edit spaces WITHOUT touching code: names and descriptions in both
 * languages, type, price per hour, capacity, number of units (desks), equipment,
 * whether instalments are allowed, and an active switch that hides a space from
 * customers. This is the "everything configurable" requirement from the brief.
 */
import { useState } from 'react'
import { useDB, useI18n, useUser } from '../../hooks'
import { newSpaceId, saveSpace } from '../../api'
import { Modal } from '../../components/ui'
import type { Space } from '../../api/types'

const blank = (): Space => ({
  id: newSpaceId(), type: 'rehearsal', capacity: 4, units: 1, pricePerHour: 40000, active: true, installmentsEnabled: true,
  name: { es: '', en: '' }, description: { es: '', en: '' }, equipment: { es: [], en: [] },
})

export default function SpacesAdmin() {
  const { tr, loc, money } = useI18n()
  const db = useDB()
  const user = useUser()!
  const [edit, setEdit] = useState<Space | null>(null)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><h1 className="text-3xl font-bold">{tr('Espacios', 'Spaces')}</h1><button className="btn" onClick={() => setEdit(blank())}>{tr('Nuevo espacio', 'New space')}</button></div>
      <div className="card overflow-x-auto p-2"><table className="tbl">
        <thead><tr><th>{tr('Nombre', 'Name')}</th><th>{tr('Tipo', 'Type')}</th><th>{tr('Unidades', 'Units')}</th><th>{tr('Capacidad', 'Capacity')}</th><th>{tr('Precio / h', 'Price / h')}</th><th>{tr('Cuotas', 'Instalm.')}</th><th>{tr('Activo', 'Active')}</th><th /></tr></thead>
        <tbody>{db.spaces.map((s) => (
          <tr key={s.id}><td>{loc(s.name)}</td><td>{s.type}</td><td>{s.units}</td><td>{s.capacity}</td><td>{money(s.pricePerHour)}</td><td>{s.installmentsEnabled ? tr('Sí', 'Yes') : 'No'}</td>
            <td><input type="checkbox" checked={s.active} onChange={(e) => saveSpace({ ...s, active: e.target.checked }, user.id)} /></td>
            <td><button className="text-amber" onClick={() => setEdit(s)}>{tr('Editar', 'Edit')}</button></td></tr>
        ))}</tbody></table></div>

      {edit && (
        <Modal wide title={edit.name.es || tr('Nuevo espacio', 'New space')} onClose={() => setEdit(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="lbl">{tr('Nombre (ES)', 'Name (ES)')}</label><input className="field" value={edit.name.es} onChange={(e) => setEdit({ ...edit, name: { ...edit.name, es: e.target.value } })} /></div>
            <div><label className="lbl">{tr('Nombre (EN)', 'Name (EN)')}</label><input className="field" value={edit.name.en} onChange={(e) => setEdit({ ...edit, name: { ...edit.name, en: e.target.value } })} /></div>
            <div><label className="lbl">{tr('Descripción (ES)', 'Description (ES)')}</label><textarea className="field" rows={3} value={edit.description.es} onChange={(e) => setEdit({ ...edit, description: { ...edit.description, es: e.target.value } })} /></div>
            <div><label className="lbl">{tr('Descripción (EN)', 'Description (EN)')}</label><textarea className="field" rows={3} value={edit.description.en} onChange={(e) => setEdit({ ...edit, description: { ...edit.description, en: e.target.value } })} /></div>
            <div><label className="lbl">{tr('Equipamiento ES (uno por línea)', 'Equipment ES (one per line)')}</label><textarea className="field" rows={4} value={edit.equipment.es.join('\n')} onChange={(e) => setEdit({ ...edit, equipment: { ...edit.equipment, es: e.target.value.split('\n') } })} /></div>
            <div><label className="lbl">{tr('Equipamiento EN (uno por línea)', 'Equipment EN (one per line)')}</label><textarea className="field" rows={4} value={edit.equipment.en.join('\n')} onChange={(e) => setEdit({ ...edit, equipment: { ...edit.equipment, en: e.target.value.split('\n') } })} /></div>
            <div><label className="lbl">{tr('Tipo', 'Type')}</label><select className="field" value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value as Space['type'] })}><option value="recording">{tr('Estudio de grabación', 'Recording studio')}</option><option value="rehearsal">{tr('Sala de ensayo', 'Rehearsal room')}</option><option value="podcast">Podcast</option><option value="desk">Coworking</option></select></div>
            <div><label className="lbl">{tr('Precio por hora (COP)', 'Price per hour (COP)')}</label><input type="number" className="field" value={edit.pricePerHour} onChange={(e) => setEdit({ ...edit, pricePerHour: +e.target.value || 0 })} /></div>
            <div><label className="lbl">{tr('Unidades reservables (puestos)', 'Bookable units (desks)')}</label><input type="number" min={1} className="field" value={edit.units} onChange={(e) => setEdit({ ...edit, units: Math.max(1, +e.target.value || 1) })} /></div>
            <div><label className="lbl">{tr('Capacidad de personas', 'Capacity (people)')}</label><input type="number" min={1} className="field" value={edit.capacity} onChange={(e) => setEdit({ ...edit, capacity: Math.max(1, +e.target.value || 1) })} /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.installmentsEnabled} onChange={(e) => setEdit({ ...edit, installmentsEnabled: e.target.checked })} />{tr('Permitir pago en cuotas', 'Allow instalments')}</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} />{tr('Activo (visible para clientes)', 'Active (visible to customers)')}</label>
          </div>
          <button className="btn mt-5" disabled={!edit.name.es.trim()} onClick={() => {
            // blank English fields fall back to Spanish so the customer site never shows empty text
            const s = { ...edit, name: { ...edit.name, en: edit.name.en || edit.name.es }, description: { ...edit.description, en: edit.description.en || edit.description.es }, equipment: { es: edit.equipment.es.filter(Boolean), en: edit.equipment.en.filter(Boolean) } }
            saveSpace(s, user.id); setEdit(null)
          }}>{tr('Guardar', 'Save')}</button>
        </Modal>
      )}
    </div>
  )
}
