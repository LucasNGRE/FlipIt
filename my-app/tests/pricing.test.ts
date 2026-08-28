import { describe, it, expect } from 'vitest'
import {
  computeOrderAmounts,
  computeTransferAmountCents,
  resolveFinalPrice,
  COMMISSION_RATE,
  DEFAULT_DELIVERY_COST,
} from '@/lib/domain/pricing'

describe('computeOrderAmounts — montant débité à l\'acheteur', () => {
  it('additionne prix, livraison et commission de 10 % (cas nominal)', () => {
    const amounts = computeOrderAmounts(100, 4)
    expect(amounts.commission).toBe(10)
    expect(amounts.total).toBe(114)
    expect(amounts.amountCents).toBe(11400)
  })

  it('applique les frais de livraison par défaut si non fournis', () => {
    const amounts = computeOrderAmounts(50)
    expect(amounts.deliveryCost).toBe(DEFAULT_DELIVERY_COST)
    expect(amounts.total).toBe(59)
  })

  it('arrondit la commission au centime', () => {
    const amounts = computeOrderAmounts(45.55)
    expect(amounts.commission).toBe(4.56)
    expect(amounts.amountCents).toBe(Math.round(amounts.total * 100))
  })

  it('ne produit jamais de centimes fractionnaires', () => {
    for (const price of [19.99, 33.33, 0.99, 7.77, 123.45]) {
      const amounts = computeOrderAmounts(price)
      expect(Number.isInteger(amounts.amountCents)).toBe(true)
    }
  })

  it('accepte des frais de livraison nuls (remise en main propre)', () => {
    const amounts = computeOrderAmounts(100, 0)
    expect(amounts.total).toBe(110)
  })

  it('retombe sur la livraison par défaut si la valeur est aberrante', () => {
    expect(computeOrderAmounts(100, -5).deliveryCost).toBe(DEFAULT_DELIVERY_COST)
    expect(computeOrderAmounts(100, NaN).deliveryCost).toBe(DEFAULT_DELIVERY_COST)
  })

  it('refuse un prix final invalide', () => {
    expect(() => computeOrderAmounts(0)).toThrow(/invalide/)
    expect(() => computeOrderAmounts(-10)).toThrow(/invalide/)
    expect(() => computeOrderAmounts(NaN)).toThrow(/invalide/)
  })

  it('applique bien le taux de commission documenté', () => {
    expect(COMMISSION_RATE).toBe(0.1)
  })
})

describe('computeTransferAmountCents — montant reversé au vendeur', () => {
  it('reverse le prix produit entier, commission non déduite', () => {
    expect(computeTransferAmountCents(100)).toBe(10000)
  })

  it('convertit correctement les montants à décimales', () => {
    expect(computeTransferAmountCents(45.55)).toBe(4555)
    expect(computeTransferAmountCents(0.99)).toBe(99)
  })

  it('refuse un montant invalide', () => {
    expect(() => computeTransferAmountCents(0)).toThrow()
    expect(() => computeTransferAmountCents(-1)).toThrow()
  })

  it('reste cohérent avec le montant encaissé (le reste couvre livraison + commission)', () => {
    const amounts = computeOrderAmounts(100, 4)
    const transfer = computeTransferAmountCents(100)
    expect(amounts.amountCents - transfer).toBe(1400) // 4 € livraison + 10 € commission
  })
})

describe('resolveFinalPrice — prix retenu pour la commande', () => {
  it('retient le prix produit en l\'absence d\'offre', () => {
    expect(resolveFinalPrice(80, null)).toBe(80)
    expect(resolveFinalPrice(80, undefined)).toBe(80)
  })

  it('retient le montant d\'une offre acceptée', () => {
    expect(resolveFinalPrice(80, { offerPrice: 65, status: 'accepted' })).toBe(65)
  })

  it('ignore une offre encore en attente', () => {
    expect(resolveFinalPrice(80, { offerPrice: 65, status: 'pending' })).toBe(80)
  })

  it('ignore une offre rejetée ou expirée', () => {
    expect(resolveFinalPrice(80, { offerPrice: 65, status: 'rejected' })).toBe(80)
  })

  it('ignore une offre acceptée au montant aberrant', () => {
    expect(resolveFinalPrice(80, { offerPrice: 0, status: 'accepted' })).toBe(80)
    expect(resolveFinalPrice(80, { offerPrice: -20, status: 'accepted' })).toBe(80)
  })
})
