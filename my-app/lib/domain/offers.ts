/**
 * Logique métier des offres de prix, extraite des routes API
 * (`/api/offer`, `/api/offer/[id]`, `/api/offer/status`) afin d'être
 * testable unitairement sans base de données ni réseau.
 */

export type OfferStatus = 'pending' | 'accepted' | 'rejected'

/** Fenêtre de paiement ouverte à l'acheteur après acceptation d'une offre. */
export const OFFER_PAYMENT_WINDOW_MS = 24 * 60 * 60 * 1000

export interface OfferInput {
  offerPrice: unknown
  productId: unknown
}

export interface ValidationResult<T> {
  ok: boolean
  error?: string
  value?: T
}

/**
 * Valide les données d'une demande de création d'offre.
 * Le prix doit être un nombre fini strictement positif, l'identifiant
 * produit un entier positif.
 */
export function validateOfferInput(input: OfferInput): ValidationResult<{
  offerPrice: number
  productId: number
}> {
  const { offerPrice, productId } = input

  if (offerPrice === null || offerPrice === undefined || offerPrice === '') {
    return { ok: false, error: 'Le montant de l\'offre est requis' }
  }
  if (productId === null || productId === undefined || productId === '') {
    return { ok: false, error: 'L\'identifiant du produit est requis' }
  }

  const price = typeof offerPrice === 'number' ? offerPrice : parseFloat(String(offerPrice))
  if (!Number.isFinite(price)) {
    return { ok: false, error: 'Le montant de l\'offre doit être un nombre' }
  }
  if (price <= 0) {
    return { ok: false, error: 'Le montant de l\'offre doit être strictement positif' }
  }

  const id = typeof productId === 'number' ? productId : parseInt(String(productId), 10)
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, error: 'Identifiant de produit invalide' }
  }

  return { ok: true, value: { offerPrice: price, productId: id } }
}

/** Date d'expiration de la fenêtre de paiement, à partir de l'instant d'acceptation. */
export function computeOfferExpiry(acceptedAt: Date): Date {
  return new Date(acceptedAt.getTime() + OFFER_PAYMENT_WINDOW_MS)
}

export interface ExpirableOffer {
  status: OfferStatus
  expiresAt: Date | null
}

/**
 * Une offre est expirée si elle a été acceptée, qu'une date d'expiration
 * existe et que celle-ci est strictement dépassée.
 */
export function isOfferExpired(offer: ExpirableOffer, now: Date): boolean {
  if (offer.status !== 'accepted') return false
  if (!offer.expiresAt) return false
  return offer.expiresAt < now
}

export interface RespondToOfferContext {
  offer: { id: number; status: OfferStatus; buyerId: number; productId: number }
  currentUserId: number
  isConversationParticipant: boolean
}

export interface AuthorizationResult {
  allowed: boolean
  status: number
  error?: string
}

/**
 * Détermine si l'utilisateur courant peut accepter ou refuser une offre.
 * Reproduit les garde-fous de `POST /api/offer/status`.
 */
export function canRespondToOffer(ctx: RespondToOfferContext): AuthorizationResult {
  const { offer, currentUserId, isConversationParticipant } = ctx

  if (offer.status !== 'pending') {
    return { allowed: false, status: 400, error: 'Cette offre a déjà été traitée' }
  }
  if (currentUserId === offer.buyerId) {
    return { allowed: false, status: 403, error: 'Impossible de répondre à sa propre offre' }
  }
  if (!isConversationParticipant) {
    return { allowed: false, status: 403, error: 'Non autorisé' }
  }
  return { allowed: true, status: 200 }
}

/** Statut résultant d'une réponse à une offre. */
export function resolveOfferDecision(accepted: boolean, now: Date): {
  status: OfferStatus
  expiresAt: Date | null
} {
  return accepted
    ? { status: 'accepted', expiresAt: computeOfferExpiry(now) }
    : { status: 'rejected', expiresAt: null }
}
