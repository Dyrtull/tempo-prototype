/**
 * api/store.ts
 * The only place that touches localStorage. It plays the role of the database
 * connection: `getDB()` reads, `mutate()` changes + saves + notifies.
 *
 * How it fits in: the functions in api/index.ts call mutate(); React components
 * subscribe through useDB() (hooks.ts). Swapping this file for a real HTTP/Supabase
 * client is how a backend would be added later.
 *
 * Cross-tab sync: the browser fires a 'storage' event in OTHER tabs when
 * localStorage changes. We listen to it, so a booking made in the customer tab
 * shows up in an admin tab immediately. This is the demo's "real-time" feature.
 */
import type { DB } from './types'
import { buildSeed } from './seed'

const DB_KEY = 'tempo-db-v1'
const SESSION_KEY = 'tempo-session' // sessionStorage: each tab can be a different user

let cache: DB | null = null
const listeners = new Set<() => void>()

/** Read the database, seeding demo data the first time (or after a reset). */
export function getDB(): DB {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) {
      cache = JSON.parse(raw) as DB
      return cache
    }
  } catch { /* corrupted or blocked storage: fall through to a fresh seed */ }
  cache = buildSeed()
  persist()
  return cache
}

/** Write the cache to localStorage (ignored silently if storage is unavailable). */
function persist() {
  try { localStorage.setItem(DB_KEY, JSON.stringify(cache)) } catch { /* private mode */ }
}

/**
 * Apply a change. The callback receives a draft it may modify freely; we then
 * replace the cache with a shallow-cloned object so useSyncExternalStore sees a
 * new reference and React re-renders.
 */
export function mutate<T>(fn: (db: DB) => T): T {
  const db = getDB()
  const result = fn(db)
  cache = { ...db }
  persist()
  listeners.forEach((l) => l())
  return result
}

/** Subscribe to any change (used by useSyncExternalStore). */
export function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Replace everything with fresh demo data ("Reset demo" button). */
export function resetDB() {
  cache = buildSeed()
  persist()
  listeners.forEach((l) => l())
}

// Another tab changed the data: drop our cache and notify our components.
window.addEventListener('storage', (e) => {
  if (e.key === DB_KEY) {
    cache = null
    listeners.forEach((l) => l())
  }
})

// ---- Session (who is logged in, per tab) ----------------------------------

export function getSessionUserId(): string | null {
  try { return sessionStorage.getItem(SESSION_KEY) } catch { return null }
}

export function setSessionUserId(id: string | null) {
  try {
    if (id) sessionStorage.setItem(SESSION_KEY, id)
    else sessionStorage.removeItem(SESSION_KEY)
  } catch { /* ignore */ }
  listeners.forEach((l) => l())
}
