/**
 * lib/rules.ts
 * Pure business rules (no storage, no React): availability, pricing, instalment
 * schedules, cancellation policy and access-code validation.
 *
 * Why separate from api/index.ts: these functions take the DB as an argument and
 * return values, so they are easy to read, test and later move to a real server
 * unchanged. The mutating API functions call them, and the UI calls them to
 * preview results (e.g. "is this slot free?") before anything is saved.
 */
import type { Booking, DB, Space, UserMembership, Installment } from '../api/types'

export const HOUR = 3600_000
export const DAY = 24 * HOUR

const ms = (iso: string) => new Date(iso).getTime()

/** True when a pending booking's checkout hold has run out (slot released). */
export function isExpiredHold(b: Booking, now = Date.now()): boolean {
  return b.status === 'pending' && !!b.holdUntil && ms(b.holdUntil) < now
}

/** Bookings that currently occupy capacity (confirmed, or pending with a live hold). */
export function activeBookings(db: DB, now = Date.now()): Booking[] {
  return db.bookings.filter((b) => (b.status === 'confirmed' || (b.status === 'pending' && !isExpiredHold(b, now))))
}

export type AvailabilityResult = { ok: true } | { ok: false; reason: string }

/**
 * Can `units` units of a space be booked from `start` to `end`?
 * - Rule checks: min/max duration, same-day setting, start not in the past.
 * - Maintenance blocks: any overlap rejects.
 * - Capacity: sum of overlapping bookings' units (each widened by the buffer,
 *   because a unit must rest `bufferMinutes` between two bookings) + this request
 *   must not exceed the space's `units`.
 * `excludeId` lets us re-check a booking against everything except itself
 * (used when extending or rescheduling).
 */
export function checkAvailability(
  db: DB, spaceId: string, start: Date, end: Date, units = 1, excludeId?: string, now = Date.now(),
): AvailabilityResult {
  const s = db.settings
  const space = db.spaces.find((x) => x.id === spaceId)
  if (!space || !space.active) return { ok: false, reason: 'space_inactive' }

  const hours = (end.getTime() - start.getTime()) / HOUR
  if (hours < s.minHours) return { ok: false, reason: 'too_short' }
  if (hours > s.maxHours) return { ok: false, reason: 'too_long' }
  if (units < 1 || units > space.units) return { ok: false, reason: 'units' }
  if (start.getTime() < now - 5 * 60_000) return { ok: false, reason: 'past' }
  // The same-day rule only applies to NEW bookings, not to extending an existing one.
  if (!excludeId && !s.allowSameDay && start.toDateString() === new Date(now).toDateString()) return { ok: false, reason: 'same_day' }

  // Maintenance blocks have no buffer.
  for (const bl of db.blocks) {
    if (bl.spaceId === spaceId && start.getTime() < ms(bl.end) && end.getTime() > ms(bl.start)) {
      return { ok: false, reason: 'blocked' }
    }
  }

  const buf = s.bufferMinutes * 60_000
  let used = 0
  for (const b of activeBookings(db, now)) {
    if (b.spaceId !== spaceId || b.id === excludeId) continue
    // Overlap test on the buffer-widened existing interval.
    if (start.getTime() < ms(b.end) + buf && end.getTime() > ms(b.start) - buf) used += b.units
  }
  if (used + units > space.units) return { ok: false, reason: 'taken' }
  return { ok: true }
}

/**
 * Hourly timeline for one calendar day: for each hour 0-23, how many units are
 * still free for a 1-hour booking starting then. Drives the clickable hour grid.
 */
export function dayTimeline(db: DB, spaceId: string, day: Date, units = 1, now = Date.now()) {
  const out: { hour: number; free: boolean; left: number }[] = []
  const space = db.spaces.find((x) => x.id === spaceId)
  for (let h = 0; h < 24; h++) {
    const s = new Date(day); s.setHours(h, 0, 0, 0)
    const e = new Date(s.getTime() + HOUR)
    const r = checkAvailability(db, spaceId, s, e, units, undefined, now)
    // "left" is informational (desk pool): free units for this hour
    let left = 0
    if (space) {
      for (let u = space.units; u >= 1; u--) {
        if (checkAvailability(db, spaceId, s, e, u, undefined, now).ok) { left = u; break }
      }
    }
    out.push({ hour: h, free: r.ok, left })
  }
  return out
}

/** Best active membership discount % for a user (0 if none). */
export function membershipDiscount(db: DB, userId: string | null, now = Date.now()): { pct: number; membership?: UserMembership } {
  if (!userId) return { pct: 0 }
  let best = 0
  let found: UserMembership | undefined
  for (const m of db.memberships) {
    if (m.userId !== userId || m.status !== 'active' || ms(m.renewsAt) < now) continue
    const plan = db.plans.find((p) => p.id === m.planId)
    if (plan && plan.discountPct > best) { best = plan.discountPct; found = m }
  }
  return { pct: best, membership: found }
}

/** Gross price, discount and net total for a prospective booking. */
export function quote(db: DB, space: Space, userId: string | null, hours: number, units: number) {
  const gross = Math.round(space.pricePerHour * hours * units)
  const { pct } = membershipDiscount(db, userId)
  const discount = Math.round((gross * pct) / 100)
  return { gross, discount, total: gross - discount, pct }
}

/**
 * Instalment schedule. Rules:
 *  - "full": a single instalment due now.
 *  - "installments": up to settings.installmentCount payments, evenly spaced between
 *    now and 24 h before the start, so the service is fully paid before use.
 *    If the start is too close to space them out, fewer instalments are offered.
 * The last instalment absorbs the rounding remainder so amounts add up exactly.
 */
export function buildSchedule(
  total: number, startIso: string, plan: 'full' | 'installments', maxCount: number, now = Date.now(),
): Omit<Installment, 'id'>[] {
  if (plan === 'full') return [{ dueDate: new Date(now).toISOString(), amount: total, paidAt: null }]
  const n = maxInstallments(startIso, maxCount, now)
  if (n < 2) return [{ dueDate: new Date(now).toISOString(), amount: total, paidAt: null }]
  const lastDue = ms(startIso) - DAY
  const span = lastDue - now
  const base = Math.floor(total / n)
  const out: Omit<Installment, 'id'>[] = []
  for (let i = 0; i < n; i++) {
    const due = i === 0 ? now : now + Math.round((span * i) / (n - 1))
    out.push({ dueDate: new Date(due).toISOString(), amount: i === n - 1 ? total - base * (n - 1) : base, paidAt: null })
  }
  return out
}

/** How many instalments a booking starting at `startIso` can be split into (min 1). */
export function maxInstallments(startIso: string, maxCount: number, now = Date.now()): number {
  const days = Math.floor((ms(startIso) - DAY - now) / DAY)
  // 1 payment now + one per full day left before the last due date
  return Math.max(1, Math.min(maxCount, days + 1))
}

export const amountPaid = (b: Booking) => b.installments.reduce((a, i) => a + (i.paidAt ? i.amount : 0), 0)
export const amountDue = (b: Booking) => b.total - amountPaid(b)
export const nextInstallment = (b: Booking) => b.installments.find((i) => !i.paidAt)

/** Cancellation policy: free (credit) only if at least `cancellationHours` before start. */
export function cancellationOutcome(db: DB, b: Booking, now = Date.now()) {
  const hoursLeft = (ms(b.start) - now) / HOUR
  const inTime = hoursLeft >= db.settings.cancellationHours
  return { inTime, hoursLeft, credit: inTime ? amountPaid(b) : 0 }
}

export type AccessCheck = { ok: boolean; reason: string; booking?: Booking }

/**
 * Validate a door code for a space at a given moment. Granted only if:
 *  - a confirmed booking for THAT space has this code,
 *  - `at` is inside [start, end] (late arrival never shifts the end),
 *  - the booking is completely paid (instalments must be settled before use).
 * A day pass code (6 digits, today's date) opens the coworking desks.
 */
export function validateAccess(db: DB, spaceId: string, code: string, at: Date): AccessCheck {
  const t = at.getTime()
  const b = db.bookings.find((x) => x.accessCode === code && x.spaceId === spaceId && x.status !== 'cancelled')
  if (!b) {
    const space = db.spaces.find((s) => s.id === spaceId)
    const dp = db.dayPasses.find((p) => p.code === code && p.date === toYMD(at))
    if (dp && space?.type === 'desk') return { ok: true, reason: 'daypass' }
    return { ok: false, reason: 'unknown_code' }
  }
  if (b.status === 'pending') return { ok: false, reason: 'not_confirmed', booking: b }
  if (amountDue(b) > 0) return { ok: false, reason: 'unpaid', booking: b }
  if (t < ms(b.start)) return { ok: false, reason: 'too_early', booking: b }
  if (t > ms(b.end)) return { ok: false, reason: 'expired', booking: b }
  return { ok: true, reason: 'ok', booking: b }
}

/** Random 6-digit numeric code that no existing booking or day pass uses. */
export function newCode(db: DB): string {
  for (;;) {
    const c = String(100000 + Math.floor(Math.random() * 900000))
    if (!db.bookings.some((b) => b.accessCode === c) && !db.dayPasses.some((p) => p.code === c)) return c
  }
}

/** yyyy-mm-dd in local time. */
export function toYMD(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
