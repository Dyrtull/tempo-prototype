/**
 * pages/client/Community.tsx
 * The networking module: a feed of posts with likes, comments, follow buttons and
 * a report button (reported content lands in the admin moderation queue).
 * Hidden posts (moderated) never show up here. Filter "Following" shows only people
 * the user follows.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDB, useI18n, useUser } from '../../hooks'
import { addComment, createPost, reportPost, toggleFollow, toggleLike } from '../../api'
import { Avatar } from '../../components/ui'

export default function Community() {
  const { tr, dateTime } = useI18n()
  const db = useDB()
  const user = useUser()
  const [text, setText] = useState('')
  const [only, setOnly] = useState(false)
  const [comment, setComment] = useState<Record<string, string>>({})

  const posts = db.posts.filter((p) => !p.hidden && (!only || (user && user.following.includes(p.authorId))))
  const who = (id: string) => db.users.find((u) => u.id === id)

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between"><h1 className="text-3xl font-bold">{tr('Comunidad', 'Community')}</h1>
        {user && <div className="flex gap-2"><button className={`chip text-sm ${!only ? 'border-amber text-amber' : ''}`} onClick={() => setOnly(false)}>{tr('Todos', 'All')}</button><button className={`chip text-sm ${only ? 'border-amber text-amber' : ''}`} onClick={() => setOnly(true)}>{tr('Siguiendo', 'Following')}</button></div>}</div>

      {user ? (
        <div className="card space-y-2 p-4">
          <textarea className="field" rows={2} placeholder={tr('Comparte algo con la comunidad…', 'Share something with the community…')} value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn" onClick={() => { createPost(user.id, text); setText('') }}>{tr('Publicar', 'Post')}</button>
        </div>
      ) : <p className="text-sm text-mute"><Link className="text-amber" to="/login">{tr('Ingresa', 'Log in')}</Link> {tr('para publicar y conectar.', 'to post and connect.')}</p>}

      {posts.map((p) => {
        const a = who(p.authorId)
        if (!a) return null
        const liked = user && p.likes.includes(user.id)
        return (
          <article key={p.id} className="card space-y-3 p-4">
            <div className="flex items-center gap-3">
              <Link to={`/u/${a.id}`}><Avatar name={a.name} hue={a.hue} /></Link>
              <div className="flex-1"><Link to={`/u/${a.id}`} className="font-semibold hover:text-amber">{a.name}</Link><div className="text-xs text-mute">{a.profession} · {dateTime(p.createdAt)}</div></div>
              {user && user.id !== a.id && <button className="chip hover:text-amber" onClick={() => toggleFollow(user.id, a.id)}>{user.following.includes(a.id) ? tr('Siguiendo', 'Following') : tr('Seguir', 'Follow')}</button>}
            </div>
            <p className="text-sm">{p.text}</p>
            <div className="flex items-center gap-4 text-xs text-mute">
              <button disabled={!user} className={liked ? 'text-amber' : 'hover:text-cream'} onClick={() => user && toggleLike(p.id, user.id)}>♥ {p.likes.length}</button>
              <span>{p.comments.length} {tr('comentarios', 'comments')}</span>
              {user && <button className="ml-auto hover:text-rec" onClick={() => reportPost(p.id)}>{p.reported ? tr('Reportado', 'Reported') : tr('Reportar', 'Report')}</button>}
            </div>
            {p.comments.map((c) => <div key={c.id} className="rounded-lg bg-panel2 p-2 text-xs"><b>{who(c.authorId)?.name}</b> <span className="text-mute">{c.text}</span></div>)}
            {user && <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); addComment(p.id, user.id, comment[p.id] ?? ''); setComment({ ...comment, [p.id]: '' }) }}>
              <input className="field" placeholder={tr('Escribe un comentario', 'Write a comment')} value={comment[p.id] ?? ''} onChange={(e) => setComment({ ...comment, [p.id]: e.target.value })} /><button className="btn btn-ghost">{tr('Enviar', 'Send')}</button></form>}
          </article>
        )
      })}
    </div>
  )
}
