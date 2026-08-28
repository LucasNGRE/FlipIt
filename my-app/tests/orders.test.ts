import { describe, it, expect } from 'vitest'
import {
  canTransitionOrder,
  computeConfirmDeadline,
  canShipOrder,
  canConfirmOrder,
  canDisputeOrder,
  isAutoConfirmable,
  selectAutoConfirmable,
  formatTrackingNumber,
  ORDER_CONFIRM_WINDOW_MS,
  type OrderStatus,
} from '@/lib/domain/orders'

describe('canTransitionOrder — machine à états de la commande', () => {
  it('autorise le parcours nominal paid → shipped → confirmed', () => {
    expect(canTransitionOrder('paid', 'shipped')).toBe(true)
    expect(canTransitionOrder('shipped', 'confirmed')).toBe(true)
  })

  it('autorise l\'ouverture d\'un litige depuis paid et shipped', () => {
    expect(canTransitionOrder('paid', 'disputed')).toBe(true)
    expect(canTransitionOrder('shipped', 'disputed')).toBe(true)
  })

  it('interdit de confirmer une commande non expédiée (paid → confirmed)', () => {
    expect(canTransitionOrder('paid', 'confirmed')).toBe(false)
  })

  it('interdit de revenir en arrière (confirmed → shipped)', () => {
    expect(canTransitionOrder('confirmed', 'shipped')).toBe(false)
  })

  it('interdit toute sortie d\'un état terminal', () => {
    const terminaux: OrderStatus[] = ['confirmed', 'refunded']
    const cibles: OrderStatus[] = ['paid', 'shipped', 'confirmed', 'disputed', 'refunded']
    for (const from of terminaux) {
      for (const to of cibles) {
        expect(canTransitionOrder(from, to)).toBe(false)
      }
    }
  })

  it('interdit d\'expédier une commande en litige', () => {
    expect(canTransitionOrder('disputed', 'shipped')).toBe(false)
  })

  it('autorise le remboursement d\'une commande en litige', () => {
    expect(canTransitionOrder('disputed', 'refunded')).toBe(true)
  })
})

describe('computeConfirmDeadline — délai de 48 h', () => {
  it('place l\'échéance exactement 48 h après l\'expédition', () => {
    const shippedAt = new Date('2026-03-01T08:00:00.000Z')
    expect(computeConfirmDeadline(shippedAt).toISOString()).toBe('2026-03-03T08:00:00.000Z')
  })

  it('utilise bien une constante de 48 heures', () => {
    expect(ORDER_CONFIRM_WINDOW_MS).toBe(172_800_000)
  })
})

describe('canShipOrder — expédition réservée au vendeur', () => {
  const order = { buyerId: 1, sellerId: 2, status: 'paid' as OrderStatus }

  it('autorise le vendeur sur une commande payée (cas nominal)', () => {
    expect(canShipOrder(order, 2).allowed).toBe(true)
  })

  it('refuse l\'acheteur', () => {
    const result = canShipOrder(order, 1)
    expect(result.allowed).toBe(false)
    expect(result.status).toBe(403)
  })

  it('refuse un tiers', () => {
    expect(canShipOrder(order, 99).status).toBe(403)
  })

  it('refuse d\'expédier deux fois', () => {
    const result = canShipOrder({ ...order, status: 'shipped' }, 2)
    expect(result.allowed).toBe(false)
    expect(result.status).toBe(400)
  })

  it('refuse d\'expédier une commande en litige', () => {
    expect(canShipOrder({ ...order, status: 'disputed' }, 2).allowed).toBe(false)
  })
})

describe('canConfirmOrder — confirmation réservée à l\'acheteur', () => {
  const order = { buyerId: 1, sellerId: 2, status: 'shipped' as OrderStatus }

  it('autorise l\'acheteur sur une commande expédiée (cas nominal)', () => {
    expect(canConfirmOrder(order, 1).allowed).toBe(true)
  })

  it('refuse le vendeur (il ne peut pas se libérer les fonds lui-même)', () => {
    const result = canConfirmOrder(order, 2)
    expect(result.allowed).toBe(false)
    expect(result.status).toBe(403)
  })

  it('refuse de confirmer une commande simplement payée', () => {
    const result = canConfirmOrder({ ...order, status: 'paid' }, 1)
    expect(result.allowed).toBe(false)
    expect(result.status).toBe(400)
  })

  it('refuse de confirmer deux fois', () => {
    expect(canConfirmOrder({ ...order, status: 'confirmed' }, 1).allowed).toBe(false)
  })
})

describe('canDisputeOrder — litige réservé à l\'acheteur', () => {
  const order = { buyerId: 1, sellerId: 2, status: 'shipped' as OrderStatus }

  it('autorise l\'acheteur sur une commande expédiée', () => {
    expect(canDisputeOrder(order, 1).allowed).toBe(true)
  })

  it('autorise l\'acheteur sur une commande payée non expédiée', () => {
    expect(canDisputeOrder({ ...order, status: 'paid' }, 1).allowed).toBe(true)
  })

  it('refuse le vendeur', () => {
    expect(canDisputeOrder(order, 2).status).toBe(403)
  })

  it('refuse un litige sur une commande déjà confirmée', () => {
    const result = canDisputeOrder({ ...order, status: 'confirmed' }, 1)
    expect(result.allowed).toBe(false)
    expect(result.status).toBe(400)
  })

  it('refuse un second litige sur une commande déjà disputée', () => {
    expect(canDisputeOrder({ ...order, status: 'disputed' }, 1).allowed).toBe(false)
  })
})

describe('isAutoConfirmable — logique du cron auto-confirm', () => {
  const deadline = new Date('2026-03-03T08:00:00.000Z')
  const base = {
    id: 1,
    status: 'shipped' as OrderStatus,
    confirmDeadline: deadline,
    seller: { stripeAccountId: 'acct_123' },
  }

  it('confirme une commande expédiée dont l\'échéance est dépassée (cas nominal)', () => {
    const now = new Date(deadline.getTime() + 60 * 1000)
    expect(isAutoConfirmable(base, now)).toBe(true)
  })

  it('confirme pile à l\'échéance (le cron utilise lte)', () => {
    expect(isAutoConfirmable(base, new Date(deadline))).toBe(true)
  })

  it('laisse intacte une commande dont l\'échéance n\'est pas atteinte', () => {
    const now = new Date(deadline.getTime() - 60 * 1000)
    expect(isAutoConfirmable(base, now)).toBe(false)
  })

  it('ignore une commande non expédiée', () => {
    const now = new Date(deadline.getTime() + 60 * 1000)
    expect(isAutoConfirmable({ ...base, status: 'paid' }, now)).toBe(false)
    expect(isAutoConfirmable({ ...base, status: 'disputed' }, now)).toBe(false)
    expect(isAutoConfirmable({ ...base, status: 'confirmed' }, now)).toBe(false)
  })

  it('ignore une commande sans échéance enregistrée', () => {
    const now = new Date(deadline.getTime() + 60 * 1000)
    expect(isAutoConfirmable({ ...base, confirmDeadline: null }, now)).toBe(false)
  })

  it('ignore un vendeur sans compte Stripe (aucun transfert possible)', () => {
    const now = new Date(deadline.getTime() + 60 * 1000)
    expect(isAutoConfirmable({ ...base, seller: { stripeAccountId: null } }, now)).toBe(false)
  })
})

describe('selectAutoConfirmable — sélection du lot traité par le cron', () => {
  const now = new Date('2026-03-05T08:00:00.000Z')
  const past = new Date('2026-03-03T08:00:00.000Z')
  const future = new Date('2026-03-09T08:00:00.000Z')

  it('ne retient que les commandes réellement éligibles', () => {
    const orders = [
      { id: 1, status: 'shipped' as OrderStatus, confirmDeadline: past, seller: { stripeAccountId: 'acct_1' } },
      { id: 2, status: 'shipped' as OrderStatus, confirmDeadline: future, seller: { stripeAccountId: 'acct_2' } },
      { id: 3, status: 'paid' as OrderStatus, confirmDeadline: past, seller: { stripeAccountId: 'acct_3' } },
      { id: 4, status: 'shipped' as OrderStatus, confirmDeadline: past, seller: { stripeAccountId: null } },
    ]
    expect(selectAutoConfirmable(orders, now).map(o => o.id)).toEqual([1])
  })

  it('renvoie un lot vide quand rien n\'est éligible', () => {
    const orders = [
      { id: 2, status: 'shipped' as OrderStatus, confirmDeadline: future, seller: { stripeAccountId: 'acct_2' } },
    ]
    expect(selectAutoConfirmable(orders, now)).toEqual([])
  })
})

describe('formatTrackingNumber — format du numéro de suivi', () => {
  it('produit le format FLT-AAAAMMJJ-NNNNN-XXXX', () => {
    const shippedAt = new Date(2026, 2, 3, 8, 0, 0) // 3 mars 2026, heure locale
    expect(formatTrackingNumber(42, shippedAt, 'A1B2')).toBe('FLT-20260303-00042-A1B2')
  })

  it('complète le mois et le jour sur deux chiffres', () => {
    const shippedAt = new Date(2026, 0, 5, 8, 0, 0) // 5 janvier 2026
    expect(formatTrackingNumber(1, shippedAt, 'ZZZZ')).toBe('FLT-20260105-00001-ZZZZ')
  })
})
