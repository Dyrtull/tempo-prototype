/**
 * pages/client/PublicProfile.tsx
 * What other members see: bio, profession, instruments, followers, groups and posts,
 * with a Follow button. Private data (credit, points, payments) is never shown here.
 */
import { Link, useParams } from 'react-router-dom'
import { useDB, useI18n, useUser } from '../../hooks'
import { toggleFollow } from '../../api'
import { Avatar } from '../../components/ui'

export default function PublicProfile() {
  const { id } = useParams()
  const { tr, dateTime } = useI18n()
  const db = useDB()
  const me = useUser()
  const u = db.users.find((x) => x.id === id)
  if (!u) return <p className="text-mute">{tr('Perfil no encontrado.', 'Profile not found.')}</p>
  const followers = db.users.filter((x) => x.following.includes(u.id)).length
  const groups = db.groups.filter((g) => g.memberIds.includes(u.id))
  const posts = db.posts.filter((p) => p.authorId === u.id && !p.hidden)

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="card flex flex-wrap items-center gap-4 p-6">
        <Avatar name={u.name} hue={u.hue} size={72} />
        <div className="flex-1"><h1 className="text-2xl font-bold">{u.name}</h1><div className="text-sm text-mute">{u.profession}</div>
          <div className="mt-1 text-xs text-mute">{followers} {tr('seguidores', 'followers')} · {u.following.length} {tr('siguiendo', 'following')}</div></div>
        {me && me.id !== u.id && <button className="btn" onClick={() => toggleFollow(me.id, u.id)}>{me.following.includes(u.id) ? tr('Siguiendo', 'Following') : tr('Seguir', 'Follow')}</button>}
      </div>
      {u.bio && <p className="text-sm">{u.bio}</p>}
      {u.instruments.length > 0 && <div className="flex flex-wrap gap-2">{u.instruments.map((i) => <span key={i} className="chip">{i}</span>)}</div>}
      {groups.length > 0 && <div className="text-sm"><b>{tr('Grupos', 'Groups')}:</b> {groups.map((g) => g.name).join(', ')}</div>}
      <h2 className="font-bold text-mute">{tr('Publicaciones', 'Posts')}</h2>
      {posts.map((p) => <div key={p.id} className="card p-4 text-sm">{p.text}<div className="mt-2 text-xs text-mute">{dateTime(p.createdAt)}</div></div>)}
      <Link to="/community" className="text-xs text-mute hover:text-cream">← {tr('Comunidad', 'Community')}</Link>
    </div>
  )
}
