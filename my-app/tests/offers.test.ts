import { describe, it, expect } from 'vitest'
import {
  validateOfferInput,
  computeOfferExpiry,
  isOfferExpired,
  canRespondToOffer,
  resolveOfferDecision,
  OFFER_PAYMENT_WINDOW_MS,
} from '@/lib/domain/offers'

describe('validateOfferInput — création d\'une offre', () => {
  it('accepte un montant et un produit valides (cas nominal)', () => {
    const result = validateOfferInput({ offerPrice: 45.5, productId: 12 })
    expect(result.ok).toBe(true)
    expect(result.value).toEqual({ offerPrice: 45.5, productId: 12 })
  })

  it('accepte un montant transmis sous forme de chaîne', () => {
    const result = validateOfferInput({ offerPrice: '45.50', productId: '12' })
    expect(result.ok).toBe(true)
    expect(result.value?.offerPrice).toBe(45.5)
    expect(result.value?.productId).toBe(12)
  })

  it('accepte le plus petit montant significatif (limite basse)', () => {
    expect(validateOfferInput({ offerPrice: 0.01, productId: 1 }).ok).toBe(true)
  })

  it('refuse un montant négatif', () => {
    const result = validateOfferInput({ offerPrice: -10, productId: 12 })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/positif/)
  })

  it('refuse un montant nul', () => {
    const result = validateOfferInput({ offerPrice: 0, productId: 12 })
    expect(result.ok).toBe(false)
  })

  it('refuse un montant non numérique', () => {
    const result = validateOfferInput({ offerPrice: 'gratuit', productId: 12 })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/nombre/)
  })

  it('refuse un montant manquant', () => {
    expect(validateOfferInput({ offerPrice: undefined, productId: 12 }).ok).toBe(false)
    expect(validateOfferInput({ offerPrice: null, productId: 12 }).ok).toBe(false)
  })

  it('refuse un identifiant de produit manquant ou invalide', () => {
    expect(validateOfferInput({ offerPrice: 10, productId: undefined }).ok).toBe(false)
    expect(validateOfferInput({ offerPrice: 10, productId: 'abc' }).ok).toBe(false)
    expect(validateOfferInput({ offerPrice: 10, productId: -3 }).ok).toBe(false)
  })

  it('refuse Infinity et NaN', () => {
    expect(validateOfferInput({ offerPrice: Infinity, productId: 1 }).ok).toBe(false)
    expect(validateOfferInput({ offerPrice: NaN, productId: 1 }).ok).toBe(false)
  })
})

describe('computeOfferExpiry — fenêtre de paiement de 24 h', () => {
  it('place l\'échéance exactement 24 h après l\'acceptation', () => {
    const acceptedAt = new Date('2026-01-10T12:00:00.000Z')
    expect(computeOfferExpiry(acceptedAt).toISOString()).toBe('2026-01-11T12:00:00.000Z')
  })

  it('utilise bien une constante de 24 heures', () => {
    expect(OFFER_PAYMENT_WINDOW_MS).toBe(86_400_000)
  })
})

describe('isOfferExpired — expiration de la fenêtre de 24 h', () => {
  const acceptedAt = new Date('2026-01-10T12:00:00.000Z')
  const expiresAt = computeOfferExpiry(acceptedAt)

  it('reste valide à 23 h 59 après acceptation', () => {
    const now = new Date(acceptedAt.getTime() + 23 * 60 * 60 * 1000 + 59 * 60 * 1000)
    expect(isOfferExpired({ status: 'accepted', expiresAt }, now)).toBe(false)
  })

  it('reste valide une seconde avant l\'échéance (limite)', () => {
    const now = new Date(expiresAt.getTime() - 1000)
    expect(isOfferExpired({ status: 'accepted', expiresAt }, now)).toBe(false)
  })

  it('n\'est pas expirée pile à l\'échéance (comparaison stricte)', () => {
    expect(isOfferExpired({ status: 'accepted', expiresAt }, new Date(expiresAt))).toBe(false)
  })

  it('est expirée à 24 h 01 après acceptation', () => {
    const now = new Date(acceptedAt.getTime() + 24 * 60 * 60 * 1000 + 60 * 1000)
    expect(isOfferExpired({ status: 'accepted', expiresAt }, now)).toBe(true)
  })

  it('ne considère jamais une offre pending comme expirée', () => {
    const now = new Date(acceptedAt.getTime() + 72 * 60 * 60 * 1000)
    expect(isOfferExpired({ status: 'pending', expiresAt }, now)).toBe(false)
  })

  it('ne considère jamais une offre rejected comme expirée', () => {
    const now = new Date(acceptedAt.getTime() + 72 * 60 * 60 * 1000)
    expect(isOfferExpired({ status: 'rejected', expiresAt }, now)).toBe(false)
  })

  it('ne plante pas si aucune date d\'expiration n\'est enregistrée', () => {
    expect(isOfferExpired({ status: 'accepted', expiresAt: null }, new Date())).toBe(false)
  })
})

describe('canRespondToOffer — droit de répondre à une offre', () => {
  const offer = { id: 1, status: 'pending' as const, buyerId: 7, productId: 3 }

  it('autorise le vendeur participant à la conversation (cas nominal)', () => {
    const result = canRespondToOffer({ offer, currentUserId: 42, isConversationParticipant: true })
    expect(result.allowed).toBe(true)
  })

  it('refuse à l\'émetteur de répondre à sa propre offre', () => {
    const result = canRespondToOffer({ offer, currentUserId: 7, isConversationParticipant: true })
    expect(result.allowed).toBe(false)
    expect(result.status).toBe(403)
  })

  it('refuse un utilisateur étranger à la conversation', () => {
    const result = canRespondToOffer({ offer, currentUserId: 99, isConversationParticipant: false })
    expect(result.allowed).toBe(false)
    expect(result.status).toBe(403)
  })

  it('refuse de traiter une offre déjà rejetée', () => {
    const rejected = { ...offer, status: 'rejected' as const }
    const result = canRespondToOffer({ offer: rejected, currentUserId: 42, isConversationParticipant: true })
    expect(result.allowed).toBe(false)
    expect(result.status).toBe(400)
    expect(result.error).toMatch(/déjà été traitée/)
  })

  it('refuse de traiter une offre déjà acceptée (donc potentiellement expirée)', () => {
    const accepted = { ...offer, status: 'accepted' as const }
    const result = canRespondToOffer({ offer: accepted, currentUserId: 42, isConversationParticipant: true })
    expect(result.allowed).toBe(false)
    expect(result.status).toBe(400)
  })
})

describe('resolveOfferDecision — effet d\'une acceptation ou d\'un refus', () => {
  const now = new Date('2026-02-01T09:00:00.000Z')

  it('accepter ouvre une fenêtre de paiement de 24 h', () => {
    const decision = resolveOfferDecision(true, now)
    expect(decision.status).toBe('accepted')
    expect(decision.expiresAt?.toISOString()).toBe('2026-02-02T09:00:00.000Z')
  })

  it('refuser ne pose aucune échéance', () => {
    const decision = resolveOfferDecision(false, now)
    expect(decision.status).toBe('rejected')
    expect(decision.expiresAt).toBeNull()
  })
})
