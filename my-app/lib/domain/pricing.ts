/**
 * Calculs monétaires du tunnel de paiement, extraits de
 * `/api/stripe/payment-intent` et `/api/orders/[id]/confirm`.
 *
 * Convention : la commission plateforme est payée par l'acheteur EN SUS
 * du prix produit. Le vendeur perçoit le prix produit en entier.
 */

/** Taux de commission plateforme appliqué au prix produit. */
export const COMMISSION_RATE = 0.1

/** Frais de livraison appliqués par défaut si le client n'en fournit pas. */
export const DEFAULT_DELIVERY_COST = 4

export interface OrderAmounts {
  finalPrice: number
  deliveryCost: number
  commission: number
  total: number
  amountCents: number
}

/** Arrondi monétaire au centime. */
function roundCents(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Détaille le montant débité à l'acheteur.
 * @throws si le prix final n'est pas un nombre fini positif.
 */
export function computeOrderAmounts(
  finalPrice: number,
  deliveryCost: number = DEFAULT_DELIVERY_COST
): OrderAmounts {
  if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
    throw new Error('Prix final invalide')
  }
  const delivery = Number.isFinite(deliveryCost) && deliveryCost >= 0
    ? deliveryCost
    : DEFAULT_DELIVERY_COST

  const commission = roundCents(finalPrice * COMMISSION_RATE)
  const total = roundCents(finalPrice + delivery + commission)

  return {
    finalPrice,
    deliveryCost: delivery,
    commission,
    total,
    amountCents: Math.round(total * 100),
  }
}

/** Montant transféré au vendeur, en centimes : le prix produit entier. */
export function computeTransferAmountCents(finalPrice: number): number {
  if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
    throw new Error('Prix final invalide')
  }
  return Math.round(finalPrice * 100)
}

/**
 * Prix retenu pour la commande : le montant de l'offre si elle a bien été
 * acceptée, sinon le prix affiché du produit.
 */
export function resolveFinalPrice(
  productPrice: number,
  offer?: { offerPrice: number; status: string } | null
): number {
  if (offer && offer.status === 'accepted' && Number.isFinite(offer.offerPrice) && offer.offerPrice > 0) {
    return offer.offerPrice
  }
  return productPrice
}
