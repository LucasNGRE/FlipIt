/**
 * Cycle de vie d'une commande, extrait des routes
 * `/api/orders/[id]/ship`, `/confirm`, `/dispute` et du cron
 * `/api/cron/auto-confirm`, afin d'être testable sans base ni Stripe.
 */

export type OrderStatus = 'paid' | 'shipped' | 'confirmed' | 'disputed' | 'refunded'

/** Délai laissé à l'acheteur pour confirmer la réception après expédition. */
export const ORDER_CONFIRM_WINDOW_MS = 48 * 60 * 60 * 1000

/**
 * Transitions autorisées de la machine à états d'une commande.
 * `confirmed` et `refunded` sont des états terminaux.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  paid: ['shipped', 'disputed', 'refunded'],
  shipped: ['confirmed', 'disputed'],
  disputed: ['refunded', 'confirmed'],
  confirmed: [],
  refunded: [],
}

/** Vrai si le passage de `from` vers `to` est permis. */
export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false
}

/** Échéance de confirmation automatique, calculée à l'expédition. */
export function computeConfirmDeadline(shippedAt: Date): Date {
  return new Date(shippedAt.getTime() + ORDER_CONFIRM_WINDOW_MS)
}

export interface OrderActor {
  buyerId: number
  sellerId: number
  status: OrderStatus
}

export interface AuthorizationResult {
  allowed: boolean
  status: number
  error?: string
}

/** Seul le vendeur peut marquer une commande `paid` comme expédiée. */
export function canShipOrder(order: OrderActor, currentUserId: number): AuthorizationResult {
  if (order.sellerId !== currentUserId) {
    return { allowed: false, status: 403, error: 'Non autorisé' }
  }
  if (order.status !== 'paid') {
    return { allowed: false, status: 400, error: "La commande n'est pas en attente d'expédition" }
  }
  return { allowed: true, status: 200 }
}

/** Seul l'acheteur peut confirmer la réception d'une commande `shipped`. */
export function canConfirmOrder(order: OrderActor, currentUserId: number): AuthorizationResult {
  if (order.buyerId !== currentUserId) {
    return { allowed: false, status: 403, error: 'Non autorisé' }
  }
  if (order.status !== 'shipped') {
    return { allowed: false, status: 400, error: 'La commande doit être expédiée avant confirmation' }
  }
  return { allowed: true, status: 200 }
}

/** Seul l'acheteur peut ouvrir un litige, sur une commande `paid` ou `shipped`. */
export function canDisputeOrder(order: OrderActor, currentUserId: number): AuthorizationResult {
  if (order.buyerId !== currentUserId) {
    return { allowed: false, status: 403, error: 'Non autorisé' }
  }
  if (!['paid', 'shipped'].includes(order.status)) {
    return { allowed: false, status: 400, error: 'Impossible de disputer une commande dans cet état' }
  }
  return { allowed: true, status: 200 }
}

export interface AutoConfirmableOrder {
  id: number
  status: OrderStatus
  confirmDeadline: Date | null
  seller: { stripeAccountId: string | null }
}

/**
 * Une commande est auto-confirmable si elle est expédiée, que son échéance
 * est atteinte et que le vendeur dispose d'un compte Stripe destinataire.
 */
export function isAutoConfirmable(order: AutoConfirmableOrder, now: Date): boolean {
  if (order.status !== 'shipped') return false
  if (!order.confirmDeadline) return false
  if (order.confirmDeadline > now) return false
  return Boolean(order.seller.stripeAccountId)
}

/** Sous-ensemble des commandes que le cron doit confirmer automatiquement. */
export function selectAutoConfirmable<T extends AutoConfirmableOrder>(orders: T[], now: Date): T[] {
  return orders.filter(order => isAutoConfirmable(order, now))
}

/** Numéro de suivi déterministe hors partie aléatoire (testable). */
export function formatTrackingNumber(orderId: number, shippedAt: Date, suffix: string): string {
  const y = shippedAt.getFullYear()
  const m = String(shippedAt.getMonth() + 1).padStart(2, '0')
  const d = String(shippedAt.getDate()).padStart(2, '0')
  return `FLT-${y}${m}${d}-${orderId.toString().padStart(5, '0')}-${suffix}`
}
