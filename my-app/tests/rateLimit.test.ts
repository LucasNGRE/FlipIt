import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { rateLimit } from '@/lib/rateLimit'

/**
 * `lib/rateLimit.ts` conserve son état dans une Map de module.
 * Chaque test utilise donc une clé distincte pour rester isolé,
 * et les horloges sont simulées pour tester les fenêtres temporelles.
 */

describe('rateLimit — signalements (5 par heure)', () => {
  const OPTS = { limit: 5, windowMs: 60 * 60 * 1000 }

  it('autorise les requêtes sous la limite', () => {
    const key = 'reports:user:nominal'
    for (let i = 1; i <= 5; i++) {
      expect(rateLimit(key, OPTS).allowed).toBe(true)
    }
  })

  it('bloque la requête qui dépasse la limite', () => {
    const key = 'reports:user:depassement'
    for (let i = 1; i <= 5; i++) rateLimit(key, OPTS)
    const sixieme = rateLimit(key, OPTS)
    expect(sixieme.allowed).toBe(false)
    expect(sixieme.retryAfter).toBeGreaterThan(0)
  })

  it('continue de bloquer les requêtes suivantes', () => {
    const key = 'reports:user:persistant'
    for (let i = 1; i <= 6; i++) rateLimit(key, OPTS)
    expect(rateLimit(key, OPTS).allowed).toBe(false)
  })

  it('isole les compteurs entre utilisateurs distincts', () => {
    const a = 'reports:user:aaa'
    const b = 'reports:user:bbb'
    for (let i = 1; i <= 6; i++) rateLimit(a, OPTS)
    expect(rateLimit(a, OPTS).allowed).toBe(false)
    expect(rateLimit(b, OPTS).allowed).toBe(true)
  })
})

describe('rateLimit — remise à zéro de la fenêtre', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-01T10:00:00.000Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('réautorise après expiration de la fenêtre horaire', () => {
    const key = 'reports:user:fenetre'
    const opts = { limit: 5, windowMs: 60 * 60 * 1000 }

    for (let i = 1; i <= 5; i++) expect(rateLimit(key, opts).allowed).toBe(true)
    expect(rateLimit(key, opts).allowed).toBe(false)

    // 59 minutes plus tard : toujours bloqué
    vi.advanceTimersByTime(59 * 60 * 1000)
    expect(rateLimit(key, opts).allowed).toBe(false)

    // Au-delà de l'heure : compteur réinitialisé
    vi.advanceTimersByTime(2 * 60 * 1000)
    expect(rateLimit(key, opts).allowed).toBe(true)
  })
})

describe('rateLimit — lockout du login admin (5 tentatives / 15 min, blocage 30 min)', () => {
  const OPTS = { limit: 5, windowMs: 15 * 60 * 1000, lockoutMs: 30 * 60 * 1000 }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-01T10:00:00.000Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('autorise 5 tentatives puis verrouille', () => {
    const key = 'admin-login:203.0.113.10'
    for (let i = 1; i <= 5; i++) {
      expect(rateLimit(key, OPTS).allowed).toBe(true)
    }
    expect(rateLimit(key, OPTS).allowed).toBe(false)
  })

  it('maintient le verrou pendant 30 minutes après dépassement', () => {
    const key = 'admin-login:203.0.113.11'
    for (let i = 1; i <= 6; i++) rateLimit(key, OPTS)

    // 29 minutes plus tard : encore verrouillé
    vi.advanceTimersByTime(29 * 60 * 1000)
    const encore = rateLimit(key, OPTS)
    expect(encore.allowed).toBe(false)
    expect(encore.retryAfter).toBeGreaterThan(0)

    // Après 30 minutes : le verrou est levé
    vi.advanceTimersByTime(2 * 60 * 1000)
    expect(rateLimit(key, OPTS).allowed).toBe(true)
  })

  it('isole le verrou par adresse IP', () => {
    const attaquant = 'admin-login:198.51.100.1'
    const legitime = 'admin-login:198.51.100.2'
    for (let i = 1; i <= 6; i++) rateLimit(attaquant, OPTS)
    expect(rateLimit(attaquant, OPTS).allowed).toBe(false)
    expect(rateLimit(legitime, OPTS).allowed).toBe(true)
  })

  it('indique un délai d\'attente exploitable par le client', () => {
    const key = 'admin-login:198.51.100.3'
    for (let i = 1; i <= 6; i++) rateLimit(key, OPTS)
    const bloque = rateLimit(key, OPTS)
    expect(bloque.retryAfter).toBeLessThanOrEqual(30 * 60)
  })
})
