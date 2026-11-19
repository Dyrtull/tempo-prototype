/**
 * api/seed.ts
 * Builds the fictional-but-coherent demo database: 7 spaces (2 recording studios,
 * 3 rehearsal rooms, 1 podcast studio, a 15-desk coworking pool), users, 5 weeks of
 * past bookings (so reports have data), a week of upcoming bookings, memberships,
 * community posts, reviews and rewards.
 *
 * Everything is generated relative to "today", so the demo always looks current.
 * A small seeded random generator (mulberry32) makes the result deterministic:
 * resetting the demo always produces the same story.
 */
import type {
  DB, Booking, Space, User, Transaction, Post, Review, AccessEvent, Installment,
} from './types'

/** Tiny deterministic PRNG: same seed -> same sequence. */
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** ISO string for "today + dayOffset days at the given hour (local time)". */
function at(dayOffset: number, hour: number, minute = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + dayOffset)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

let idCounter = 0
const nid = (p: string) => `${p}-${(++idCounter).toString(36)}`

export function buildSeed(): DB {
  idCounter = 0
  const rnd = mulberry32(2024)

  // ---- Spaces --------------------------------------------------------------
  const spaces: Space[] = [
    {
      id: 'rec-a', type: 'recording', capacity: 6, units: 1, pricePerHour: 90000, active: true, installmentsEnabled: true,
      name: { es: 'Estudio A · Sala de control', en: 'Studio A · Control room' },
      description: {
        es: 'Estudio principal con sala de control tratada acústicamente y cabina amplia para bandas completas.',
        en: 'Main studio with an acoustically treated control room and a live room big enough for a full band.',
      },
      equipment: {
        es: ['Interfaz 16 canales', 'Monitores de campo cercano', 'Micrófonos de condensador y dinámicos', 'Piano digital 88 teclas', 'Cabina de aislamiento'],
        en: ['16-channel interface', 'Near-field monitors', 'Condenser and dynamic mics', '88-key digital piano', 'Isolation booth'],
      },
    },
    {
      id: 'rec-b', type: 'recording', capacity: 4, units: 1, pricePerHour: 70000, active: true, installmentsEnabled: true,
      name: { es: 'Estudio B · Cabina vocal', en: 'Studio B · Vocal booth' },
      description: {
        es: 'Estudio compacto pensado para voces, producción electrónica y mezcla.',
        en: 'Compact studio built for vocals, electronic production and mixing.',
      },
      equipment: {
        es: ['Interfaz 8 canales', 'Monitores de 5"', 'Micrófono de condensador de gran diafragma', 'Controlador MIDI', 'Estación de producción'],
        en: ['8-channel interface', '5" monitors', 'Large-diaphragm condenser mic', 'MIDI controller', 'Production workstation'],
      },
    },
    {
      id: 'reh-1', type: 'rehearsal', capacity: 8, units: 1, pricePerHour: 45000, active: true, installmentsEnabled: true,
      name: { es: 'Sala de ensayo 1', en: 'Rehearsal room 1' },
      description: {
        es: 'Sala amplia con backline completo para bandas de hasta 8 personas.',
        en: 'Large room with a full backline for bands of up to 8 people.',
      },
      equipment: {
        es: ['Batería acústica', 'Amplificador de guitarra y bajo', 'Mezclador y PA', '4 micrófonos', 'Aire acondicionado'],
        en: ['Acoustic drum kit', 'Guitar and bass amps', 'Mixer and PA', '4 microphones', 'Air conditioning'],
      },
    },
    {
      id: 'reh-2', type: 'rehearsal', capacity: 6, units: 1, pricePerHour: 40000, active: true, installmentsEnabled: true,
      name: { es: 'Sala de ensayo 2', en: 'Rehearsal room 2' },
      description: { es: 'Sala mediana con backline y teclado.', en: 'Mid-size room with backline and keyboard.' },
      equipment: {
        es: ['Batería acústica', 'Amplificadores', 'Teclado', 'PA', 'Aire acondicionado'],
        en: ['Acoustic drum kit', 'Amps', 'Keyboard', 'PA', 'Air conditioning'],
      },
    },
    {
      id: 'reh-3', type: 'rehearsal', capacity: 5, units: 1, pricePerHour: 35000, active: true, installmentsEnabled: true,
      name: { es: 'Sala de ensayo 3 · Acústica', en: 'Rehearsal room 3 · Acoustic' },
      description: { es: 'Sala íntima para formatos acústicos y trío.', en: 'Intimate room for acoustic formats and trios.' },
      equipment: { es: ['Sillas y atriles', 'Piano vertical', '2 micrófonos', 'Sistema de sonido pequeño'], en: ['Chairs and stands', 'Upright piano', '2 microphones', 'Small PA'] },
    },
    {
      id: 'pod', type: 'podcast', capacity: 4, units: 1, pricePerHour: 55000, active: true, installmentsEnabled: true,
      name: { es: 'Estudio de podcast', en: 'Podcast studio' },
      description: { es: 'Mesa para hasta 4 voces con grabación multipista y cámara opcional.', en: 'Table for up to 4 voices with multitrack recording and optional camera.' },
      equipment: { es: ['4 micrófonos dinámicos', 'Mezclador de podcast', 'Cámara 4K', 'Paneles acústicos'], en: ['4 dynamic mics', 'Podcast mixer', '4K camera', 'Acoustic panels'] },
    },
    {
      id: 'desk', type: 'desk', capacity: 1, units: 15, pricePerHour: 8000, active: true, installmentsEnabled: false,
      name: { es: 'Coworking · Puestos individuales', en: 'Coworking · Individual desks' },
      description: {
        es: '15 puestos individuales con fibra óptica y café. Se pueden combinar para formar un espacio grupal.',
        en: '15 individual desks with fibre internet and coffee. Desks can be combined into a group workspace.',
      },
      equipment: { es: ['Escritorio y silla ergonómica', 'Internet fibra óptica', 'Café y agua', 'Lockers'], en: ['Desk and ergonomic chair', 'Fibre internet', 'Coffee and water', 'Lockers'] },
    },
  ]

  // ---- Users ---------------------------------------------------------------
  const mk = (
    id: string, name: string, role: User['role'], profession: string, instruments: string[],
    bio: string, hue: number, extra: Partial<User> = {},
  ): User => ({
    id, name, email: `${name.split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}@tempo.demo`,
    role, permissions: [], bio, profession, instruments, techPrefs: '', credit: 0, points: 0,
    following: [], hue, active: true, ...extra,
  })

  const users: User[] = [
    mk('u-admin', 'Valentina Ríos', 'admin', 'Directora de TEMPO', [], 'Gestiona TEMPO.', 160),
    mk('u-emp1', 'Camilo Torres', 'employee', 'Recepción y soporte técnico', [], 'Turno de tarde.', 30,
      { permissions: ['bookings', 'access'] }),
    mk('u-emp2', 'Laura Gómez', 'employee', 'Community manager', [], 'Modera la comunidad.', 300,
      { permissions: ['bookings', 'moderation', 'reports'] }),
    mk('u1', 'Mariana Cano', 'client', 'Productora musical', ['Teclados', 'Sintetizadores'],
      'Productora de pop alternativo. Busco vocalistas y guitarristas para EP nuevo.', 25,
      { techPrefs: 'Ableton Live, monitores planos, grabación a 48 kHz.', credit: 45000, points: 320, following: ['u2', 'u5'] }),
    mk('u2', 'Sebastián Ortiz', 'client', 'Guitarrista', ['Guitarra eléctrica', 'Guitarra acústica'],
      'Guitarrista de sesión y miembro de Los Cuervos.', 210, { points: 150, following: ['u1', 'u4'] }),
    mk('u3', 'Daniela Mejía', 'client', 'Podcaster', ['Voz'],
      'Conduzco "Sonidos de la ciudad", un podcast sobre música paisa.', 340, { points: 90, following: ['u1'] }),
    mk('u4', 'Juan Pablo Arango', 'client', 'Baterista', ['Batería', 'Percusión'],
      'Baterista de Los Cuervos. Disponible para sesiones.', 95, { points: 210, following: ['u2'] }),
    mk('u5', 'Isabela Restrepo', 'client', 'Cantautora', ['Voz', 'Guitarra acústica'],
      'Escribo canciones en español. Primer disco en camino.', 280, { points: 60, following: ['u1', 'u3'] }),
    mk('u6', 'Andrés Vélez', 'client', 'Ingeniero de sonido', ['Mezcla', 'Mastering'],
      'Mezcla y mastering. Trabajo con bandas independientes.', 180, { points: 40 }),
    mk('u7', 'Camila Zapata', 'client', 'Diseñadora y freelancer', [],
      'Trabajo remoto desde el coworking.', 60, { points: 15 }),
  ]
  const clientIds = users.filter((u) => u.role === 'client').map((u) => u.id)

  const groups = [
    { id: 'g1', name: 'Los Cuervos', kind: 'band' as const, description: 'Rock alternativo desde Medellín.', ownerId: 'u2', memberIds: ['u2', 'u4'] },
    { id: 'g2', name: 'Estudio Luna', kind: 'production' as const, description: 'Equipo de producción de música para audiovisuales.', ownerId: 'u1', memberIds: ['u1', 'u6'] },
  ]

  // ---- Bookings & transactions --------------------------------------------
  const bookings: Booking[] = []
  const transactions: Transaction[] = []
  const reviews: Review[] = []
  const access: AccessEvent[] = []

  /** Create one booking (+ its ledger lines) and push it to the arrays. */
  function addBooking(opts: {
    space: Space; userId: string; start: string; hours: number; units?: number
    status: Booking['status']; paidFraction?: number; installments?: boolean; groupId?: string
  }) {
    const { space, userId, start, hours, status } = opts
    const units = opts.units ?? 1
    const end = new Date(new Date(start).getTime() + hours * 3600_000).toISOString()
    const total = space.pricePerHour * hours * units
    const useInst = !!opts.installments && space.installmentsEnabled
    const n = useInst ? 3 : 1
    const startMs = new Date(start).getTime()
    const paidFraction = opts.paidFraction ?? 1
    const installments: Installment[] = []
    for (let i = 0; i < n; i++) {
      // instalment i is due (n - i) days before the booking: with 3 it is -3d, -2d, -1d,
      // so the service is always fully paid at least 24 h before use.
      const due = new Date(startMs - (n - i) * 24 * 3600_000)
      const amount = i === n - 1 ? total - Math.floor(total / n) * (n - 1) : Math.floor(total / n)
      const paid = i < Math.round(n * paidFraction)
      installments.push({ id: nid('i'), dueDate: due.toISOString(), amount, paidAt: paid ? new Date(Math.min(due.getTime(), Date.now())).toISOString() : null })
    }
    const id = nid('b')
    const b: Booking = {
      id, userId, spaceId: space.id, start, end, units, status, total, discount: 0,
      plan: useInst ? 'installments' : 'full', installments,
      accessCode: String(100000 + Math.floor(rnd() * 900000)),
      holdUntil: null, createdAt: new Date(startMs - 3 * 24 * 3600_000).toISOString(), createdBy: userId,
      groupId: opts.groupId,
    }
    bookings.push(b)
    for (const inst of installments) {
      if (inst.paidAt) transactions.push({ id: nid('t'), at: inst.paidAt, userId, type: 'payment', amount: inst.amount, ref: id, method: rnd() > 0.5 ? 'card' : 'pse', note: space.name.es })
    }
    return b
  }

  // Daily "windows" never overlap and leave >= 3 h gaps, so seed bookings never
  // conflict with each other or with the 30-minute buffer rule.
  const windows: [number, number][] = [[9, 11], [14, 17], [19, 22]]

  // Past 35 days: completed bookings (feeds reports, revenue, reviews, access log).
  for (let d = -35; d <= -1; d++) {
    for (const sp of spaces) {
      for (const [h0, h1] of windows) {
        const p = sp.type === 'desk' ? 0.55 : sp.type === 'recording' ? 0.45 : 0.3
        if (rnd() > p) continue
        const hours = Math.min(h1 - h0, 1 + Math.floor(rnd() * 3))
        const uid = clientIds[Math.floor(rnd() * clientIds.length)]
        const units = sp.type === 'desk' ? 1 + Math.floor(rnd() * 3) : 1
        const b = addBooking({ space: sp, userId: uid, start: at(d, h0), hours, units, status: 'completed', installments: rnd() > 0.7 })
        // access log: one entry and one exit for completed bookings
        access.push({ id: nid('a'), at: b.start, spaceId: sp.id, bookingId: b.id, userId: uid, code: b.accessCode, direction: 'in', result: 'granted', reason: 'ok' })
        access.push({ id: nid('a'), at: b.end, spaceId: sp.id, bookingId: b.id, userId: uid, code: b.accessCode, direction: 'out', result: 'granted', reason: 'ok' })
        // some completed bookings were reviewed
        if (sp.type !== 'desk' && rnd() > 0.65) {
          const rating = 3 + Math.floor(rnd() * 3)
          reviews.push({
            id: nid('r'), spaceId: sp.id, userId: uid, bookingId: b.id, rating,
            text: ['Excelente sonido y muy buena atención.', 'Todo limpio y el equipo funcionó perfecto.', 'Volveremos pronto, muy cómodo para ensayar.', 'Buen espacio, el aire acondicionado ayudó mucho.', 'Ideal para grabar voces, la cabina es silenciosa.'][Math.floor(rnd() * 5)],
            experience: { sound: Math.min(5, rating + (rnd() > 0.5 ? 1 : 0)), comfort: rating, equipment: Math.min(5, rating + 1) },
            createdAt: b.end, reported: false, hidden: false,
          })
        }
      }
    }
  }
  // A few reported items so the moderation queue is not empty.
  if (reviews[0]) reviews[0].reported = true

  // Today + next 6 days: confirmed upcoming bookings (today only future windows).
  const nowH = new Date().getHours()
  for (let d = 0; d <= 6; d++) {
    for (const sp of spaces) {
      for (const [h0, h1] of windows) {
        if (d === 0 && h0 <= nowH + 1) continue
        // keep clear of the demo maintenance block (reh-3, tomorrow 09-13)
        if (sp.id === 'reh-3' && d === 1 && h0 < 13) continue
        if (rnd() > (sp.type === 'desk' ? 0.6 : 0.3)) continue
        const hours = Math.min(h1 - h0, 1 + Math.floor(rnd() * 3))
        const uid = clientIds[Math.floor(rnd() * clientIds.length)]
        const far = d >= 3
        addBooking({
          space: sp, userId: uid, start: at(d, h0), hours,
          units: sp.type === 'desk' ? 1 + Math.floor(rnd() * 3) : 1,
          status: 'confirmed', installments: far && rnd() > 0.4, paidFraction: far ? 1 / 3 : 1,
        })
      }
    }
  }

  // Make Mariana (the demo customer) have a clear, friendly set of bookings. They use
  // 11:30-13:30, a gap between the random windows, so they never conflict (30 min buffer ok).
  const mariana = users.find((u) => u.id === 'u1')!
  addBooking({ space: spaces[0], userId: mariana.id, start: at(2, 11, 30), hours: 2, status: 'confirmed', installments: true, paidFraction: 1 / 3 })
  addBooking({ space: spaces[1], userId: mariana.id, start: at(-4, 11, 30), hours: 2, status: 'completed' })

  // ---- Memberships --------------------------------------------------------
  const plans = [
    { id: 'p-flex', name: { es: 'Flex Coworking', en: 'Flex Coworking' }, period: 'monthly' as const, price: 150000, discountPct: 10, active: true,
      benefits: { es: ['10% de descuento en todas las reservas', 'Café y agua ilimitados', 'Locker personal'], en: ['10% off every booking', 'Unlimited coffee and water', 'Personal locker'] } },
    { id: 'p-pro', name: { es: 'Pro Estudio', en: 'Pro Studio' }, period: 'monthly' as const, price: 350000, discountPct: 20, active: true,
      benefits: { es: ['20% de descuento en todas las reservas', 'Prioridad en eventos de la comunidad', 'Pase de invitado mensual'], en: ['20% off every booking', 'Priority for community events', 'Monthly guest pass'] } },
    { id: 'p-annual', name: { es: 'Pro Anual', en: 'Pro Annual' }, period: 'annual' as const, price: 3360000, discountPct: 25, active: true,
      benefits: { es: ['25% de descuento en todas las reservas', 'Dos meses gratis frente al plan mensual', 'Todo lo de Pro Estudio'], en: ['25% off every booking', 'Two months free vs the monthly plan', 'Everything in Pro Studio'] } },
  ]
  const memberships = [
    { id: 'm1', userId: 'u1', planId: 'p-pro', start: at(-12, 9), renewsAt: at(18, 9), autoRenew: true, status: 'active' as const },
    { id: 'm2', userId: 'u2', planId: 'p-flex', start: at(-20, 9), renewsAt: at(10, 9), autoRenew: true, status: 'active' as const },
    { id: 'm3', userId: 'u7', planId: 'p-annual', start: at(-90, 9), renewsAt: at(275, 9), autoRenew: false, status: 'active' as const },
  ]
  for (const m of memberships) {
    const plan = plans.find((p) => p.id === m.planId)!
    transactions.push({ id: nid('t'), at: m.start, userId: m.userId, type: 'membership', amount: plan.price, ref: m.id, method: 'card', note: plan.name.es })
  }
  // Mariana's cancelled booking earlier produced her 45,000 COP credit.
  transactions.push({ id: nid('t'), at: at(-6, 12), userId: 'u1', type: 'credit_in', amount: 45000, method: 'credit', note: 'Cancelación aprobada' })

  // ---- Day passes ---------------------------------------------------------
  const dayPasses = [
    { id: 'dp1', name: 'Visitante Demo', email: 'visitante@example.com', date: at(-3, 0).slice(0, 10), code: '482913', price: 35000, boughtAt: at(-4, 11) },
  ]
  transactions.push({ id: nid('t'), at: dayPasses[0].boughtAt, userId: null, type: 'daypass', amount: 35000, ref: 'dp1', method: 'nequi', note: 'Pase diario' })

  // ---- Community ----------------------------------------------------------
  const posts: Post[] = [
    { id: 'po1', authorId: 'u1', text: 'Busco vocalista para un EP de pop alternativo. Grabamos en el Estudio A el mes que viene. Escríbanme.', createdAt: at(-1, 18), likes: ['u2', 'u5', 'u3'], comments: [{ id: 'c1', authorId: 'u5', text: 'Me interesa. Te escribo.', createdAt: at(-1, 19) }], reported: false, hidden: false },
    { id: 'po2', authorId: 'u2', text: 'Ensayo abierto el sábado en la sala 1. Traigan sus instrumentos y armamos jam.', createdAt: at(-2, 12), likes: ['u1', 'u4'], comments: [], reported: false, hidden: false },
    { id: 'po3', authorId: 'u3', text: 'Nuevo episodio de "Sonidos de la ciudad" grabado en el estudio de podcast. El audio quedó limpio.', createdAt: at(-3, 16), likes: ['u1'], comments: [{ id: 'c2', authorId: 'u1', text: 'Qué buen sonido.', createdAt: at(-3, 17) }], reported: false, hidden: false },
    { id: 'po4', authorId: 'u6', text: 'Ofrezco sesiones de mezcla y mastering para bandas del coworking. Primera sesión con 20% de descuento.', createdAt: at(-4, 10), likes: [], comments: [], reported: false, hidden: false },
    { id: 'po5', authorId: 'u4', text: 'Baterista disponible para sesiones de grabación. Rock, pop y funk.', createdAt: at(-5, 9), likes: ['u2'], comments: [], reported: false, hidden: false },
    { id: 'po6', authorId: 'u7', text: 'Compra YA seguidores falsos en mi enlace!!! (spam)', createdAt: at(-1, 8), likes: [], comments: [], reported: true, hidden: false },
  ]

  // ---- Rewards ------------------------------------------------------------
  const rewards = [
    { id: 'rw1', name: { es: '1 hora de ensayo gratis', en: '1 free rehearsal hour' }, cost: 200, description: { es: 'Canjeable en cualquier sala de ensayo.', en: 'Redeemable in any rehearsal room.' }, active: true },
    { id: 'rw2', name: { es: 'Café y snack de cortesía', en: 'Free coffee and snack' }, cost: 50, description: { es: 'Retira en recepción.', en: 'Pick up at reception.' }, active: true },
    { id: 'rw3', name: { es: '30 minutos de estudio', en: '30 min of studio time' }, cost: 400, description: { es: 'Media hora extra en Estudio A o B.', en: 'Extra half hour in Studio A or B.' }, active: true },
    { id: 'rw4', name: { es: 'Camiseta TEMPO', en: 'TEMPO t-shirt' }, cost: 600, description: { es: 'Edición limitada.', en: 'Limited edition.' }, active: true },
  ]

  return {
    version: 1,
    settings: {
      currency: 'COP', open24x7: true, minHours: 1, maxHours: 10, bufferMinutes: 30,
      allowSameDay: true, cancellationHours: 24, holdMinutes: 15, installmentCount: 3,
      commonZoneCapacity: 30, copPerPoint: 1000, dayPassPrice: 35000, languages: ['es', 'en'],
    },
    spaces, users, groups, bookings, blocks: [
      { id: 'bl1', spaceId: 'reh-3', start: at(1, 9), end: at(1, 13), reason: 'Mantenimiento de piano' },
    ],
    transactions, plans, memberships, dayPasses, posts, reviews, rewards,
    redemptions: [{ id: 'rd1', userId: 'u1', rewardId: 'rw2', at: at(-8, 10) }],
    access,
    activity: [
      { id: nid('l'), at: at(-1, 17), userId: 'u-emp1', action: 'Creó una reserva manual' },
      { id: nid('l'), at: at(-1, 18), userId: 'u-emp2', action: 'Revisó contenido reportado' },
    ],
    notifications: [
      { id: nid('n'), userId: 'u1', at: at(-1, 9), text: { es: 'Bienvenida a TEMPO. Tu membresía Pro Estudio está activa.', en: 'Welcome to TEMPO. Your Pro Studio membership is active.' }, read: false },
    ],
  }
}
