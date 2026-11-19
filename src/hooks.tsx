/**
 * hooks.tsx
 * React glue: language context, formatting helpers and the hooks that connect
 * components to the data store and the logged-in user.
 *
 * Translation approach: instead of a big key/value dictionary, every string is
 * written inline as tr('texto en español', 'text in English'). Both languages sit
 * next to each other in the code, so a missing translation is obvious and students
 * can read each page without jumping between files. Data that comes from the
 * database (space names, plans) is stored as {es, en} objects and read with loc().
 */
import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { getDB, subscribe, getSessionUserId } from './api/store'
import type { DB, L10n, Lang, Permission, User } from './api/types'

/** Subscribe a component to the whole database. Re-renders on any change (also from other tabs). */
export function useDB(): DB {
  return useSyncExternalStore(subscribe, getDB)
}

/** The logged-in user of THIS tab (null if nobody). */
export function useUser(): User | null {
  const db = useDB()
  const id = useSyncExternalStore(subscribe, getSessionUserId)
  return db.users.find((u) => u.id === id) ?? null
}

/** Does the user have access to an admin section? Admins can do everything. */
export function can(user: User | null, perm: Permission): boolean {
  if (!user) return false
  if (user.role === 'admin') return true
  return user.role === 'employee' && user.permissions.includes(perm)
}

// ---- Language ----------------------------------------------------------------

interface LangCtx { lang: Lang; setLang: (l: Lang) => void }
const Ctx = createContext<LangCtx>({ lang: 'es', setLang: () => {} })

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try { return (localStorage.getItem('tempo-lang') as Lang) || 'es' } catch { return 'es' }
  })
  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try { localStorage.setItem('tempo-lang', l) } catch { /* ignore */ }
    document.documentElement.lang = l
  }, [])
  const value = useMemo(() => ({ lang, setLang }), [lang, setLang])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** Everything a component needs to render text in the current language. */
export function useI18n() {
  const { lang, setLang } = useContext(Ctx)
  const locale = lang === 'es' ? 'es-CO' : 'en-US'
  return useMemo(() => ({
    lang, setLang, locale,
    /** Inline translation: tr('Reservar', 'Book'). */
    tr: (es: string, en: string) => (lang === 'es' ? es : en),
    /** Pick the right side of a stored bilingual object. */
    loc: (l: L10n) => l[lang],
    /** Pick the right array from {es:[], en:[]}. */
    locList: (l: { es: string[]; en: string[] }) => l[lang],
    /** COP currency, no decimals: $ 90.000 */
    money: (n: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n),
    date: (iso: string | Date) => new Date(iso).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' }),
    time: (iso: string | Date) => new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false }),
    dateTime: (iso: string | Date) => new Date(iso).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }),
  }), [lang, setLang, locale])
}
