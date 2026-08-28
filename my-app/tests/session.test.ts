import { describe, it, expect, vi } from 'vitest'
import { resolveTokenSubject, isDatabaseUserId } from '@/lib/domain/session'

/**
 * Le `sub` OAuth renvoyé par Google est un entier d'une vingtaine de chiffres,
 * sans rapport avec les identifiants auto-incrémentés de la base.
 */
const GOOGLE_SUB = '104729318475620183947'

/** Fabrique une recherche par e-mail simulée, sans accès base ni réseau. */
function fakeDirectory(entries: Record<string, number>) {
  return vi.fn(async (email: string) =>
    email in entries ? { id: entries[email] } : null
  )
}

describe('resolveTokenSubject — connexion par identifiants (comportement inchangé)', () => {
  it("conserve l'identifiant renvoyé par authorize()", async () => {
    const findUserByEmail = fakeDirectory({})
    const result = await resolveTokenSubject({
      provider: 'credentials',
      user: { id: '14', email: 'lucas@flipit.com' },
      findUserByEmail,
    })
    expect(result.sub).toBe('14')
    expect(result.error).toBeUndefined()
  })

  it("n'interroge jamais la base pour une connexion par identifiants", async () => {
    const findUserByEmail = fakeDirectory({ 'lucas@flipit.com': 14 })
    await resolveTokenSubject({
      provider: 'credentials',
      user: { id: '14', email: 'lucas@flipit.com' },
      findUserByEmail,
    })
    expect(findUserByEmail).not.toHaveBeenCalled()
  })

  it("produit un identifiant exploitable par Number()", async () => {
    const result = await resolveTokenSubject({
      provider: 'credentials',
      user: { id: '14', email: 'lucas@flipit.com' },
      findUserByEmail: fakeDirectory({}),
    })
    expect(Number(result.sub)).toBe(14)
    expect(isDatabaseUserId(result.sub)).toBe(true)
  })

  it("signale l'absence d'identifiant", async () => {
    const result = await resolveTokenSubject({
      provider: 'credentials',
      user: { id: null, email: 'lucas@flipit.com' },
      findUserByEmail: fakeDirectory({}),
    })
    expect(result.sub).toBeNull()
    expect(result.error).toMatch(/Identifiant/)
  })
})

describe('resolveTokenSubject — connexion Google d\'un compte existant', () => {
  it("résout l'identifiant en base à partir de l'e-mail", async () => {
    const findUserByEmail = fakeDirectory({ 'lucas@gmail.com': 10 })
    const result = await resolveTokenSubject({
      provider: 'google',
      user: { id: GOOGLE_SUB, email: 'lucas@gmail.com' },
      findUserByEmail,
    })
    expect(result.sub).toBe('10')
    expect(findUserByEmail).toHaveBeenCalledWith('lucas@gmail.com')
  })

  it("n'écrit jamais le sub OAuth dans le jeton (régression)", async () => {
    const result = await resolveTokenSubject({
      provider: 'google',
      user: { id: GOOGLE_SUB, email: 'lucas@gmail.com' },
      findUserByEmail: fakeDirectory({ 'lucas@gmail.com': 10 }),
    })
    expect(result.sub).not.toBe(GOOGLE_SUB)
    expect(isDatabaseUserId(result.sub)).toBe(true)
  })

  it("relie la session au compte par identifiants portant le même e-mail", async () => {
    // Un compte Credentials existe déjà (id 3) : la connexion Google doit s'y
    // rattacher plutôt que de créer un second compte.
    const findUserByEmail = fakeDirectory({ 'jeremy@flipit.com': 3 })
    const result = await resolveTokenSubject({
      provider: 'google',
      user: { id: GOOGLE_SUB, email: 'jeremy@flipit.com' },
      findUserByEmail,
    })
    expect(result.sub).toBe('3')
  })

  it("ignore les espaces parasites autour de l'e-mail", async () => {
    const findUserByEmail = fakeDirectory({ 'lucas@gmail.com': 10 })
    const result = await resolveTokenSubject({
      provider: 'google',
      user: { id: GOOGLE_SUB, email: '  lucas@gmail.com  ' },
      findUserByEmail,
    })
    expect(result.sub).toBe('10')
  })
})

describe('resolveTokenSubject — première connexion Google', () => {
  it("résout l'identifiant du compte créé par le callback signIn", async () => {
    // signIn() crée l'utilisateur avant que jwt() ne soit appelé : au moment
    // de la résolution, le compte existe donc en base.
    const findUserByEmail = fakeDirectory({ 'nouveau@gmail.com': 42 })
    const result = await resolveTokenSubject({
      provider: 'google',
      user: { id: GOOGLE_SUB, email: 'nouveau@gmail.com' },
      findUserByEmail,
    })
    expect(result.sub).toBe('42')
  })

  it("signale l'anomalie si aucun compte n'a été créé, sans retomber sur le sub OAuth", async () => {
    const result = await resolveTokenSubject({
      provider: 'google',
      user: { id: GOOGLE_SUB, email: 'fantome@gmail.com' },
      findUserByEmail: fakeDirectory({}),
    })
    expect(result.sub).toBeNull()
    expect(result.error).toMatch(/Aucun utilisateur en base/)
  })

  it("refuse un profil Google sans adresse e-mail", async () => {
    const findUserByEmail = fakeDirectory({})
    const result = await resolveTokenSubject({
      provider: 'google',
      user: { id: GOOGLE_SUB, email: null },
      findUserByEmail,
    })
    expect(result.sub).toBeNull()
    expect(result.error).toMatch(/e-mail/)
    expect(findUserByEmail).not.toHaveBeenCalled()
  })
})

describe('isDatabaseUserId — distinction identifiant base / sub OAuth', () => {
  it('reconnaît un identifiant en base', () => {
    expect(isDatabaseUserId('14')).toBe(true)
    expect(isDatabaseUserId(14)).toBe(true)
  })

  it('rejette un sub OAuth Google (au-delà des entiers sûrs)', () => {
    expect(isDatabaseUserId(GOOGLE_SUB)).toBe(false)
  })

  it('rejette les valeurs absentes ou non numériques', () => {
    expect(isDatabaseUserId(undefined)).toBe(false)
    expect(isDatabaseUserId(null)).toBe(false)
    expect(isDatabaseUserId('')).toBe(false)
    expect(isDatabaseUserId('abc')).toBe(false)
    expect(isDatabaseUserId('0')).toBe(false)
    expect(isDatabaseUserId('-3')).toBe(false)
  })
})
