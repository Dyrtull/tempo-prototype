/**
 * api/types.ts
 * Data model of TEMPO. Every entity the client app and the admin panel share
 * is declared here. When a real backend is added, these interfaces become the
 * contract (API schemas / database tables); the UI does not need to change.
 *
 * Money is always an integer number of COP (no decimals) to avoid rounding bugs.
 * Dates are ISO-8601 strings (UTC) so they serialise cleanly to JSON/localStorage.
 */

/** Text that exists in both launch languages. */
export interface L10n { es: string; en: string }
export type Lang = 'es' | 'en'

/** Kinds of rentable space. 'desk' is a pool: `units` individual desks. */
export type SpaceType = 'recording' | 'rehearsal' | 'podcast' | 'desk'

export interface Space {
  id: string
  type: SpaceType
  name: L10n
  description: L10n
  equipment: { es: string[]; en: string[] }
  /** Max people allowed inside (shown to the customer). */
  capacity: number
  /** How many identical units can be booked at once (15 for the desk pool, 1 otherwise). */
  units: number
  pricePerHour: number // COP per unit per hour
  active: boolean
  /** Admin switch: may this service be paid in instalments? */
  installmentsEnabled: boolean
}

/** Permission keys an employee may be granted by the admin. */
export type Permission =
  | 'bookings' | 'spaces' | 'users' | 'finance'
  | 'reports' | 'plans' | 'access' | 'moderation' | 'settings'

export type Role = 'client' | 'employee' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  permissions: Permission[]   // only meaningful for employees; admin has all
  bio: string
  profession: string
  instruments: string[]
  techPrefs: string           // free text: DAW, mic preferences, etc.
  credit: number              // balance in favour (COP) from approved cancellations
  points: number              // loyalty points
  following: string[]         // user ids this user follows
  hue: number                 // 0-360, drives the generated avatar colour
  active: boolean
}

/** Band / production team / company profile that can make group bookings. */
export interface Group {
  id: string
  name: string
  kind: 'band' | 'musicians' | 'production' | 'company'
  description: string
  ownerId: string
  memberIds: string[]
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

export interface Installment {
  id: string
  dueDate: string
  amount: number
  paidAt: string | null
}

export interface Booking {
  id: string
  /** Registered customer; null for walk-ins created by staff. */
  userId: string | null
  walkInName?: string
  groupId?: string
  spaceId: string
  start: string
  end: string
  units: number               // desks/rooms taken (group desks combine several)
  status: BookingStatus
  total: number               // COP, grows when an extension is bought
  discount: number            // COP already subtracted from `total` (membership)
  plan: 'full' | 'installments'
  installments: Installment[] // always present; "full" has a single instalment
  accessCode: string          // 6 digits, valid only inside [start, end] once fully paid
  /** A pending booking holds its slot only until this moment (checkout timer). */
  holdUntil: string | null
  createdAt: string
  createdBy: string           // user id (customer or staff)
  cancelledAt?: string
  creditGranted?: number      // COP returned as credit when cancelled in time
}

/** Maintenance block set by staff: the space is unavailable. */
export interface Block {
  id: string
  spaceId: string
  start: string
  end: string
  reason: string
}

export type TxType = 'payment' | 'extension' | 'membership' | 'daypass' | 'credit_in' | 'credit_out'

/** Immutable ledger line. Everything that moves money creates one. */
export interface Transaction {
  id: string
  at: string
  userId: string | null
  type: TxType
  amount: number              // positive = money/credit in, negative = credit used or refunded
  ref?: string                // booking id, membership id...
  method: string              // 'card' | 'pse' | 'nequi' | 'credit' | 'cash'
  note: string
}

export interface MembershipPlan {
  id: string
  name: L10n
  period: 'monthly' | 'annual'
  price: number
  /** Percentage discount applied to every booking while the plan is active. */
  discountPct: number
  benefits: { es: string[]; en: string[] }
  active: boolean
}

export interface UserMembership {
  id: string
  userId: string
  planId: string
  start: string
  renewsAt: string
  autoRenew: boolean
  status: 'active' | 'cancelled' | 'expired'
}

/** Day pass bought without an account. */
export interface DayPass {
  id: string
  name: string
  email: string
  date: string               // yyyy-mm-dd
  code: string
  price: number
  boughtAt: string
}

export interface Post {
  id: string
  authorId: string
  text: string
  createdAt: string
  likes: string[]            // user ids
  comments: { id: string; authorId: string; text: string; createdAt: string }[]
  reported: boolean
  hidden: boolean
}

export interface Review {
  id: string
  spaceId: string
  userId: string
  bookingId: string
  rating: number             // 1-5
  text: string
  experience: { sound: number; comfort: number; equipment: number } // 1-5 each
  createdAt: string
  reported: boolean
  hidden: boolean
}

export interface Reward {
  id: string
  name: L10n
  cost: number               // points
  description: L10n
  active: boolean
}

export interface Redemption { id: string; userId: string; rewardId: string; at: string }

export interface AccessEvent {
  id: string
  at: string
  spaceId: string
  bookingId: string | null
  userId: string | null
  code: string
  direction: 'in' | 'out'
  result: 'granted' | 'denied'
  reason: string
}

export interface ActivityEntry { id: string; at: string; userId: string; action: string }

export interface Notification { id: string; userId: string; at: string; text: L10n; read: boolean }

/** Every operational rule the admin can change without touching code. */
export interface Settings {
  currency: 'COP'
  open24x7: boolean
  minHours: number
  maxHours: number
  bufferMinutes: number          // gap between two bookings of the same unit
  allowSameDay: boolean
  cancellationHours: number      // free cancellation only if >= this many hours before start
  holdMinutes: number            // how long an unpaid booking holds its slot
  installmentCount: number       // max instalments offered
  commonZoneCapacity: number
  copPerPoint: number            // COP spent to earn 1 loyalty point
  dayPassPrice: number           // COP, price of a one-day coworking pass
  languages: Lang[]
}

/** The whole database. Persisted as one JSON blob. */
export interface DB {
  version: number
  settings: Settings
  spaces: Space[]
  users: User[]
  groups: Group[]
  bookings: Booking[]
  blocks: Block[]
  transactions: Transaction[]
  plans: MembershipPlan[]
  memberships: UserMembership[]
  dayPasses: DayPass[]
  posts: Post[]
  reviews: Review[]
  rewards: Reward[]
  redemptions: Redemption[]
  access: AccessEvent[]
  activity: ActivityEntry[]
  notifications: Notification[]
}
