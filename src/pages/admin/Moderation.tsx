/**
 * pages/admin/Moderation.tsx
 * Queue of community posts and space reviews reported by users. The admin (or an
 * employee with the "moderation" permission) can hide the content (it disappears for
 * customers) or dismiss the report. Actions are logged in the staff activity log.
 */
import { useDB, useI18n, useUser } from '../../hooks'
import { moderatePost, moderateReview } from '../../api'
import { Stars } from '../../components/ui'

export default function Moderation() {
  const { tr, loc, dateTime } = useI18n()
  const db = useDB()
  const me = useUser()!
  const posts = db.posts.filter((p) => p.reported)
  const reviews = db.reviews.filter((r) => r.reported)
  const name = (id: string) => db.users.find((u) => u.id === id)?.name

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{tr('Moderación', 'Moderation')}</h1>
      {posts.length + reviews.length === 0 && <p className="text-mute">{tr('No hay contenido reportado.', 'No reported content.')}</p>}
      {posts.map((p) => (
        <div key={p.id} className="card space-y-2 p-4"><div className="text-xs text-mute">{tr('Publicación de', 'Post by')} {name(p.authorId)} · {dateTime(p.createdAt)}</div><p className="text-sm">{p.text}</p>
          <div className="flex gap-2"><button className="btn btn-danger" onClick={() => moderatePost(p.id, 'hide', me.id)}>{tr('Ocultar', 'Hide')}</button><button className="btn btn-ghost" onClick={() => moderatePost(p.id, 'dismiss', me.id)}>{tr('Descartar reporte', 'Dismiss report')}</button></div></div>
      ))}
      {reviews.map((r) => (
        <div key={r.id} className="card space-y-2 p-4"><div className="text-xs text-mute">{tr('Reseña de', 'Review by')} {name(r.userId)} · {loc(db.spaces.find((s) => s.id === r.spaceId)!.name)}</div><Stars value={r.rating} size={14} /><p className="text-sm">{r.text}</p>
          <div className="flex gap-2"><button className="btn btn-danger" onClick={() => moderateReview(r.id, 'hide', me.id)}>{tr('Ocultar', 'Hide')}</button><button className="btn btn-ghost" onClick={() => moderateReview(r.id, 'dismiss', me.id)}>{tr('Descartar reporte', 'Dismiss report')}</button></div></div>
      ))}
    </div>
  )
}
