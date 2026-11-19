/**
 * api/index.ts
 * Every action the app can perform (the "backend" for the prototype). Each function
 * validates with the rules in lib/rules.ts, changes the database through mutate(),
 * and returns a result object ({ ok: true, ... } or { ok: false, error }).
 *
 * Design choice: the UI never edits data directly; it only calls these functions.
 * To add a real backend later, re-implement these same signatures with HTTP calls
 * and nothing in the pages has to change.
 *
 * Payments are SIMULATED: pay*() functions always succeed and only write ledger lines.
 */
import { mutate, getDB, setSessionUserId } from './store'
import type {
  Booking, DB, Group, MembershipPlan, Permission, Post, Review, Reward, Settings, Space, User, DayPass,
} from './types'
import {
  HOUR, DAY, amountDue, amountPaid, buildSchedule, cancellationOutcome, checkAvailability,
  newCode, quote, toYMD, validateAccess,
} from '../lib/rules'

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string }
const fail = (error: string) => ({ ok: false as const, error })

let seq = 0
/** Unique id: timestamp + counter + random, so two tabs never collide. */
const uid = (p: string) => `${p}-${Date.now().toString(36)}${(seq++).toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`
const nowIso = () => new Date().toISOString()

/** Add an in-app notification (bilingual). */
function notify(db: DB, userId: string | null, es: string, en: string) {
  if (!userId) return
  db.notifications.unshift({ id: uid('n'), userId, at: nowIso(), text: { es, en }, read: false })
}

/** Record what staff did (shown in the employee activity log). */
function logActivity(db: DB, actorId: string | null, action: string) {
  if (!actorId) return
  const u = db.users.find((x) => x.id === actorId)
  if (u && u.role !== 'client') db.activity.unshift({ id: uid('l'), at: nowIso(), userId: actorId, action })
}

// ---- Session -----------------------------------------------------------------

export function login(userId: string) { setSessionUserId(userId) }
export function logout() { setSessionUserId(null) }

/** Quick sign-up: creates a client account (no password in the demo). */
export function register(name: string, email: string): Result<{ userId: string }> {
  if (!name.trim() || !email.includes('@')) return fail('invalid')
  const id = uid('u')
  mutate((db) => {
    db.users.push({
      id, name: name.trim(), email: email.trim(), role: 'client', permissions: [], bio: '', profession: '',
      instruments: [], techPrefs: '', credit: 0, points: 0, following: [], hue: Math.floor(Math.random() * 360), active: true,
    })
  })
  setSessionUserId(id)
  return { ok: true, userId: id }
}

// ---- Housekeeping ------------------------------------------------------------

/**
 * Called on app start and every minute. Simulates what a server job would do:
 *  - confirmed bookings whose end time passed become 'completed'
 *  - expired unpaid holds are cancelled (slot released)
 *  - memberships past their renewal date renew (auto-renew on) or expire
 */
export function tick() {
  const now = Date.now()
  mutate((db) => {
    for (const b of db.bookings) {
      if (b.status === 'confirmed' && new Date(b.end).getTime() < now) b.status = 'completed'
      if (b.status === 'pending' && b.holdUntil && new Date(b.holdUntil).getTime() < now) {
        b.status = 'cancelled'; b.cancelledAt = nowIso()
      }
    }
    for (const m of db.memberships) {
      if (m.status !== 'active' || new Date(m.renewsAt).getTime() > now) continue
      const plan = db.plans.find((p) => p.id === m.planId)
      if (!plan) continue
      if (m.autoRenew) {
        const next = new Date(m.renewsAt)
        if (plan.period === 'annual') next.setFullYear(next.getFullYear() + 1)
        else next.setMonth(next.getMonth() + 1)
        m.renewsAt = next.toISOString()
        db.transactions.push({ id: uid('t'), at: nowIso(), userId: m.userId, type: 'membership', amount: plan.price, ref: m.id, method: 'card', note: `${plan.name.es} (renovación)` })
        notify(db, m.userId, `Tu membresía ${plan.name.es} se renovó.`, `Your ${plan.name.en} membership renewed.`)
      } else {
        m.status = 'expired'
      }
    }
  })
}

// ---- Bookings ----------------------------------------------------------------

export interface NewBooking {
  userId: string | null
  walkInName?: string
  groupId?: string
  spaceId: string
  start: Date
  end: Date
  units: number
  createdBy: string
}

/**
 * Create a booking. Customers' bookings start as 'pending' with a checkout hold;
 * staff-created bookings (`confirmNow`) are confirmed straight away.
 * The plan (full / instalments) and payment happen at checkout (payBooking).
 */
export function createBooking(input: NewBooking, opts: { confirmNow?: boolean; paid?: boolean } = {}): Result<{ booking: Booking }> {
  return mutate((db) => {
    const check = checkAvailability(db, input.spaceId, input.start, input.end, input.units)
    if (!check.ok) return fail(check.reason)
    const space = db.spaces.find((s) => s.id === input.spaceId)!
    const hours = (input.end.getTime() - input.start.getTime()) / HOUR
    const q = quote(db, space, input.userId, hours, input.units)
    const id = uid('b')
    const sched = buildSchedule(q.total, input.start.toISOString(), 'full', 1).map((i) => ({ ...i, id: uid('i') }))
    const booking: Booking = {
      id, userId: input.userId, walkInName: input.walkInName, groupId: input.groupId, spaceId: input.spaceId,
      start: input.start.toISOString(), end: input.end.toISOString(), units: input.units,
      status: opts.confirmNow ? 'confirmed' : 'pending', total: q.total, discount: q.discount, plan: 'full',
      installments: sched, accessCode: newCode(db),
      holdUntil: opts.confirmNow ? null : new Date(Date.now() + db.settings.holdMinutes * 60_000).toISOString(),
      createdAt: nowIso(), createdBy: input.createdBy,
    }
    if (opts.paid) {
      booking.installments.forEach((i) => (i.paidAt = nowIso()))
      db.transactions.push({ id: uid('t'), at: nowIso(), userId: input.userId, type: 'payment', amount: q.total, ref: id, method: 'cash', note: space.name.es })
    }
    db.bookings.push(booking)
    logActivity(db, input.createdBy, `Creó la reserva de ${space.name.es}`)
    return { ok: true as const, booking }
  })
}

/** Choose payment plan at checkout: rebuilds the schedule (nothing paid yet). */
export function setBookingPlan(bookingId: string, plan: 'full' | 'installments'): Result {
  return mutate((db) => {
    const b = db.bookings.find((x) => x.id === bookingId)
    const sp = b && db.spaces.find((s) => s.id === b.spaceId)
    if (!b || !sp) return fail('not_found')
    if (b.installments.some((i) => i.paidAt)) return fail('already_paid')
    if (plan === 'installments' && !sp.installmentsEnabled) return fail('not_allowed')
    b.plan = plan
    b.installments = buildSchedule(b.total, b.start, plan, db.settings.installmentCount).map((i) => ({ ...i, id: uid('i') }))
    return { ok: true as const }
  })
}

/**
 * SIMULATED payment. `mode: 'next'` pays the next pending instalment, `'all'`
 * settles everything. `useCredit` first consumes the user's balance in favour.
 * Business rules enforced here:
 *  - the booking is confirmed only after the first payment (condition of payment met);
 *  - loyalty points are credited per COP actually paid;
 *  - every movement is written to the ledger.
 */
export function payBooking(bookingId: string, opts: { mode: 'next' | 'all'; method: string; useCredit?: boolean }): Result<{ paid: number }> {
  return mutate((db) => {
    const b = db.bookings.find((x) => x.id === bookingId)
    if (!b) return fail('not_found')
    if (b.status === 'cancelled') return fail('cancelled')
    const user = b.userId ? db.users.find((u) => u.id === b.userId) : undefined
    const pending = b.installments.filter((i) => !i.paidAt)
    const toPay = opts.mode === 'all' ? pending : pending.slice(0, 1)
    if (!toPay.length) return fail('nothing_due')
    const amount = toPay.reduce((a, i) => a + i.amount, 0)

    // Credit first, remainder by "card"/PSE/Nequi (simulated)
    let fromCredit = 0
    if (opts.useCredit && user && user.credit > 0) {
      fromCredit = Math.min(user.credit, amount)
      user.credit -= fromCredit
      db.transactions.push({ id: uid('t'), at: nowIso(), userId: user.id, type: 'credit_out', amount: -fromCredit, ref: b.id, method: 'credit', note: 'Saldo a favor aplicado' })
    }
    const external = amount - fromCredit
    if (external > 0) {
      db.transactions.push({ id: uid('t'), at: nowIso(), userId: b.userId, type: 'payment', amount: external, ref: b.id, method: opts.method, note: db.spaces.find((s) => s.id === b.spaceId)?.name.es ?? '' })
    }
    toPay.forEach((i) => (i.paidAt = nowIso()))
    if (b.status === 'pending') { b.status = 'confirmed'; b.holdUntil = null }
    if (user) {
      user.points += Math.floor(amount / db.settings.copPerPoint)
      notify(db, user.id, `Pago recibido por $${amount.toLocaleString('es-CO')}.`, `Payment received: COP ${amount.toLocaleString('en-US')}.`)
    }
    return { ok: true as const, paid: amount }
  })
}

/**
 * Cancel a booking. Within the policy window the amount already paid becomes credit
 * for the customer ("saldo a favor"); late cancellations get nothing back unless
 * staff forces a refund (`forceRefund`).
 */
export function cancelBooking(bookingId: string, actorId: string, forceRefund = false): Result<{ credit: number }> {
  return mutate((db) => {
    const b = db.bookings.find((x) => x.id === bookingId)
    if (!b || b.status === 'cancelled' || b.status === 'completed') return fail('not_cancellable')
    const out = cancellationOutcome(db, b)
    const credit = out.inTime || forceRefund ? amountPaid(b) : 0
    b.status = 'cancelled'; b.cancelledAt = nowIso(); b.creditGranted = credit
    const user = b.userId ? db.users.find((u) => u.id === b.userId) : undefined
    if (user && credit > 0) {
      user.credit += credit
      db.transactions.push({ id: uid('t'), at: nowIso(), userId: user.id, type: 'credit_in', amount: credit, ref: b.id, method: 'credit', note: 'Cancelación aprobada' })
    }
    notify(db, b.userId, credit > 0 ? `Reserva cancelada. Saldo a favor: $${credit.toLocaleString('es-CO')}.` : 'Reserva cancelada sin saldo a favor (fuera de plazo).',
      credit > 0 ? `Booking cancelled. Credit: COP ${credit.toLocaleString('en-US')}.` : 'Booking cancelled with no credit (late cancellation).')
    logActivity(db, actorId, 'Canceló una reserva')
    return { ok: true as const, credit }
  })
}

/** Move a booking to a new start time (same duration), if the new slot is free. */
export function rescheduleBooking(bookingId: string, newStart: Date, actorId: string, staff = false): Result {
  return mutate((db) => {
    const b = db.bookings.find((x) => x.id === bookingId)
    if (!b || (b.status !== 'confirmed' && b.status !== 'pending')) return fail('not_modifiable')
    if (!staff && !cancellationOutcome(db, b).inTime) return fail('too_late')
    const dur = new Date(b.end).getTime() - new Date(b.start).getTime()
    const newEnd = new Date(newStart.getTime() + dur)
    const check = checkAvailability(db, b.spaceId, newStart, newEnd, b.units, b.id)
    if (!check.ok) return fail(check.reason)
    b.start = newStart.toISOString(); b.end = newEnd.toISOString()
    logActivity(db, actorId, 'Modificó una reserva')
    return { ok: true as const }
  })
}

/**
 * Extend a running/upcoming booking by `extra` hours if the space is free and the
 * total stays within the max duration. Paid immediately in-app (simulated).
 */
export function extendBooking(bookingId: string, extra: number, method: string): Result<{ cost: number }> {
  return mutate((db) => {
    const b = db.bookings.find((x) => x.id === bookingId)
    const sp = b && db.spaces.find((s) => s.id === b.spaceId)
    if (!b || !sp || b.status !== 'confirmed') return fail('not_modifiable')
    const newEnd = new Date(new Date(b.end).getTime() + extra * HOUR)
    // Extension checks overlap but "start in the past" is fine for a running booking.
    const check = checkAvailability(db, b.spaceId, new Date(b.start), newEnd, b.units, b.id, new Date(b.start).getTime())
    if (!check.ok) return fail(check.reason)
    const q = quote(db, sp, b.userId, extra, b.units)
    b.end = newEnd.toISOString(); b.total += q.total; b.discount += q.discount
    b.installments.push({ id: uid('i'), dueDate: nowIso(), amount: q.total, paidAt: nowIso() })
    db.transactions.push({ id: uid('t'), at: nowIso(), userId: b.userId, type: 'extension', amount: q.total, ref: b.id, method, note: `+${extra} h · ${sp.name.es}` })
    const user = b.userId ? db.users.find((u) => u.id === b.userId) : undefined
    if (user) user.points += Math.floor(q.total / db.settings.copPerPoint)
    return { ok: true as const, cost: q.total }
  })
}

// ---- Maintenance blocks ------------------------------------------------------

export function addBlock(spaceId: string, start: Date, end: Date, reason: string, actorId: string): Result {
  return mutate((db) => {
    // Refuse if confirmed bookings already live in that window: staff must cancel them first.
    const clash = db.bookings.some((b) => b.spaceId === spaceId && (b.status === 'confirmed' || b.status === 'pending')
      && start.getTime() < new Date(b.end).getTime() && end.getTime() > new Date(b.start).getTime())
    if (clash) return fail('has_bookings')
    db.blocks.push({ id: uid('bl'), spaceId, start: start.toISOString(), end: end.toISOString(), reason })
    logActivity(db, actorId, `Bloqueó un espacio: ${reason}`)
    return { ok: true as const }
  })
}
export function removeBlock(id: string, actorId: string) {
  mutate((db) => { db.blocks = db.blocks.filter((b) => b.id !== id); logActivity(db, actorId, 'Quitó un bloqueo') })
}

// ---- Spaces (admin) ----------------------------------------------------------

export function saveSpace(space: Space, actorId: string) {
  mutate((db) => {
    const i = db.spaces.findIndex((s) => s.id === space.id)
    if (i >= 0) db.spaces[i] = space; else db.spaces.push(space)
    logActivity(db, actorId, `Guardó el espacio ${space.name.es}`)
  })
}
export const newSpaceId = () => uid('sp')

// ---- Users, employees, profiles ---------------------------------------------

export function saveUser(user: User, actorId?: string) {
  mutate((db) => {
    const i = db.users.findIndex((u) => u.id === user.id)
    if (i >= 0) db.users[i] = user; else db.users.push(user)
    if (actorId) logActivity(db, actorId, `Actualizó al usuario ${user.name}`)
  })
}
export function createEmployee(name: string, email: string, permissions: Permission[], actorId: string) {
  mutate((db) => {
    db.users.push({
      id: uid('u'), name, email, role: 'employee', permissions, bio: '', profession: 'Empleado', instruments: [],
      techPrefs: '', credit: 0, points: 0, following: [], hue: Math.floor(Math.random() * 360), active: true,
    })
    logActivity(db, actorId, `Creó la cuenta de empleado ${name}`)
  })
}
export function saveGroup(g: Group) {
  mutate((db) => {
    const i = db.groups.findIndex((x) => x.id === g.id)
    if (i >= 0) db.groups[i] = g; else db.groups.push(g)
  })
}
export const newGroupId = () => uid('g')

// ---- Memberships & day passes -----------------------------------------------

/** Buy a plan (simulated payment). Replaces any active membership of the user. */
export function buyMembership(userId: string, planId: string, method: string): Result {
  return mutate((db) => {
    const plan = db.plans.find((p) => p.id === planId && p.active)
    if (!plan) return fail('not_found')
    db.memberships.forEach((m) => { if (m.userId === userId && m.status === 'active') m.status = 'cancelled' })
    const renews = new Date()
    if (plan.period === 'annual') renews.setFullYear(renews.getFullYear() + 1); else renews.setMonth(renews.getMonth() + 1)
    const id = uid('m')
    db.memberships.push({ id, userId, planId, start: nowIso(), renewsAt: renews.toISOString(), autoRenew: true, status: 'active' })
    db.transactions.push({ id: uid('t'), at: nowIso(), userId, type: 'membership', amount: plan.price, ref: id, method, note: plan.name.es })
    notify(db, userId, `Membresía ${plan.name.es} activada.`, `${plan.name.en} membership activated.`)
    return { ok: true as const }
  })
}
export function setAutoRenew(membershipId: string, value: boolean) {
  mutate((db) => { const m = db.memberships.find((x) => x.id === membershipId); if (m) m.autoRenew = value })
}
export function savePlan(plan: MembershipPlan, actorId: string) {
  mutate((db) => {
    const i = db.plans.findIndex((p) => p.id === plan.id)
    if (i >= 0) db.plans[i] = plan; else db.plans.push(plan)
    logActivity(db, actorId, `Guardó el plan ${plan.name.es}`)
  })
}
export const newPlanId = () => uid('p')

/** Day pass purchase WITHOUT an account (guest checkout). */
export function buyDayPass(name: string, email: string, date: string, method: string): Result<{ pass: DayPass }> {
  if (!name.trim() || !email.includes('@')) return fail('invalid')
  return mutate((db) => {
    const pass: DayPass = { id: uid('dp'), name, email, date, code: newCode(db), price: db.settings.dayPassPrice, boughtAt: nowIso() }
    db.dayPasses.push(pass)
    db.transactions.push({ id: uid('t'), at: nowIso(), userId: null, type: 'daypass', amount: pass.price, ref: pass.id, method, note: 'Pase diario' })
    return { ok: true as const, pass }
  })
}

// ---- Community ---------------------------------------------------------------

export function createPost(authorId: string, text: string) {
  if (!text.trim()) return
  mutate((db) => { db.posts.unshift({ id: uid('po'), authorId, text: text.trim(), createdAt: nowIso(), likes: [], comments: [], reported: false, hidden: false }) })
}
export function toggleLike(postId: string, userId: string) {
  mutate((db) => {
    const p = db.posts.find((x) => x.id === postId); if (!p) return
    p.likes = p.likes.includes(userId) ? p.likes.filter((x) => x !== userId) : [...p.likes, userId]
  })
}
export function addComment(postId: string, authorId: string, text: string) {
  if (!text.trim()) return
  mutate((db) => { db.posts.find((x) => x.id === postId)?.comments.push({ id: uid('c'), authorId, text: text.trim(), createdAt: nowIso() }) })
}
export function toggleFollow(userId: string, targetId: string) {
  mutate((db) => {
    const u = db.users.find((x) => x.id === userId); if (!u) return
    u.following = u.following.includes(targetId) ? u.following.filter((x) => x !== targetId) : [...u.following, targetId]
  })
}
export function reportPost(postId: string) { mutate((db) => { const p = db.posts.find((x) => x.id === postId); if (p) p.reported = true }) }
export function moderatePost(postId: string, action: 'hide' | 'dismiss', actorId: string) {
  mutate((db) => {
    const p = db.posts.find((x) => x.id === postId); if (!p) return
    if (action === 'hide') p.hidden = true
    p.reported = false
    logActivity(db, actorId, action === 'hide' ? 'Ocultó una publicación' : 'Descartó un reporte')
  })
}

// ---- Reviews -----------------------------------------------------------------

export function addReview(r: Omit<Review, 'id' | 'createdAt' | 'reported' | 'hidden'>): Result {
  return mutate((db) => {
    const b = db.bookings.find((x) => x.id === r.bookingId)
    if (!b || b.status !== 'completed') return fail('not_completed')
    if (db.reviews.some((x) => x.bookingId === r.bookingId)) return fail('already')
    db.reviews.unshift({ ...r, id: uid('r'), createdAt: nowIso(), reported: false, hidden: false })
    return { ok: true as const }
  })
}
export function reportReview(id: string) { mutate((db) => { const r = db.reviews.find((x) => x.id === id); if (r) r.reported = true }) }
export function moderateReview(id: string, action: 'hide' | 'dismiss', actorId: string) {
  mutate((db) => {
    const r = db.reviews.find((x) => x.id === id); if (!r) return
    if (action === 'hide') r.hidden = true
    r.reported = false
    logActivity(db, actorId, action === 'hide' ? 'Ocultó una reseña' : 'Descartó un reporte de reseña')
  })
}

// ---- Rewards -----------------------------------------------------------------

export function redeemReward(userId: string, rewardId: string): Result {
  return mutate((db) => {
    const u = db.users.find((x) => x.id === userId); const r = db.rewards.find((x) => x.id === rewardId && x.active)
    if (!u || !r) return fail('not_found')
    if (u.points < r.cost) return fail('points')
    u.points -= r.cost
    db.redemptions.push({ id: uid('rd'), userId, rewardId, at: nowIso() })
    notify(db, userId, `Canjeaste: ${r.name.es}.`, `You redeemed: ${r.name.en}.`)
    return { ok: true as const }
  })
}
export function saveReward(r: Reward, actorId: string) {
  mutate((db) => {
    const i = db.rewards.findIndex((x) => x.id === r.id)
    if (i >= 0) db.rewards[i] = r; else db.rewards.push(r)
    logActivity(db, actorId, `Guardó la recompensa ${r.name.es}`)
  })
}
export const newRewardId = () => uid('rw')

// ---- Access control (door simulator) ----------------------------------------

/**
 * Simulates a door reader. Validates the code (lib/rules.validateAccess) and logs the
 * attempt. Direction alternates per booking: first valid use is "in", the next "out".
 */
export function doorAttempt(spaceId: string, code: string, at: Date): { ok: boolean; reason: string; direction?: 'in' | 'out' } {
  return mutate((db) => {
    const res = validateAccess(db, spaceId, code, at)
    let direction: 'in' | 'out' = 'in'
    if (res.ok && res.booking) {
      const last = [...db.access].filter((a) => a.bookingId === res.booking!.id && a.result === 'granted').sort((a, b) => b.at.localeCompare(a.at))[0]
      direction = last?.direction === 'in' ? 'out' : 'in'
    }
    db.access.unshift({
      id: uid('a'), at: at.toISOString(), spaceId, bookingId: res.booking?.id ?? null, userId: res.booking?.userId ?? null,
      code, direction, result: res.ok ? 'granted' : 'denied', reason: res.reason,
    })
    return { ok: res.ok, reason: res.reason, direction }
  })
}

// ---- Settings & misc ---------------------------------------------------------

export function saveSettings(s: Settings, actorId: string) {
  mutate((db) => { db.settings = s; logActivity(db, actorId, 'Cambió la configuración general') })
}
export function markNotificationsRead(userId: string) {
  mutate((db) => { db.notifications.forEach((n) => { if (n.userId === userId) n.read = true }) })
}

// Re-export small helpers pages use alongside the API.
export { getDB, amountDue, amountPaid, toYMD, DAY }
