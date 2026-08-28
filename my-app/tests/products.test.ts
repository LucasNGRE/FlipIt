import { describe, it, expect } from 'vitest'
import {
  validateProductInput,
  canModifyProduct,
  isCondition,
  isCategory,
  CONDITIONS,
  CATEGORIES,
  MAX_TITLE_LENGTH,
} from '@/lib/domain/products'

describe('validateProductInput — cas nominal', () => {
  it('accepte une annonce complète et valide', () => {
    const result = validateProductInput({
      title: 'Deck Element 8.25',
      price: 45,
      condition: 'Bon_etat',
      category: 'Deck',
      description: 'Peu utilisé',
      brand: 'Element',
      size: '8.25',
    })
    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.value?.title).toBe('Deck Element 8.25')
    expect(result.value?.price).toBe(45)
  })

  it('accepte une annonce sans catégorie (champ optionnel côté schéma Prisma)', () => {
    const result = validateProductInput({ title: 'Roues', price: 20, condition: 'Neuf' })
    expect(result.ok).toBe(true)
    expect(result.value?.category).toBeNull()
  })

  it('normalise les espaces superflus du titre', () => {
    const result = validateProductInput({ title: '  Deck  ', price: 10, condition: 'Neuf' })
    expect(result.value?.title).toBe('Deck')
  })

  it('convertit un prix transmis sous forme de chaîne', () => {
    const result = validateProductInput({ title: 'Deck', price: '45.50', condition: 'Neuf' })
    expect(result.ok).toBe(true)
    expect(result.value?.price).toBe(45.5)
  })

  it('ramène les champs optionnels vides à null', () => {
    const result = validateProductInput({ title: 'Deck', price: 10, condition: 'Neuf', brand: '   ' })
    expect(result.value?.brand).toBeNull()
  })
})

describe('validateProductInput — titre', () => {
  it('refuse un titre manquant', () => {
    const result = validateProductInput({ price: 10, condition: 'Neuf' })
    expect(result.ok).toBe(false)
    expect(result.errors).toContain('Le titre est requis')
  })

  it('refuse un titre vide ou composé d\'espaces', () => {
    expect(validateProductInput({ title: '', price: 10, condition: 'Neuf' }).ok).toBe(false)
    expect(validateProductInput({ title: '     ', price: 10, condition: 'Neuf' }).ok).toBe(false)
  })

  it('accepte un titre à la longueur maximale (limite)', () => {
    const title = 'a'.repeat(MAX_TITLE_LENGTH)
    expect(validateProductInput({ title, price: 10, condition: 'Neuf' }).ok).toBe(true)
  })

  it('refuse un titre dépassant la longueur maximale', () => {
    const title = 'a'.repeat(MAX_TITLE_LENGTH + 1)
    const result = validateProductInput({ title, price: 10, condition: 'Neuf' })
    expect(result.ok).toBe(false)
    expect(result.errors.some(e => e.includes('titre'))).toBe(true)
  })
})

describe('validateProductInput — prix', () => {
  it('refuse un prix manquant', () => {
    const result = validateProductInput({ title: 'Deck', condition: 'Neuf' })
    expect(result.ok).toBe(false)
    expect(result.errors).toContain('Le prix est requis')
  })

  it('refuse un prix négatif', () => {
    const result = validateProductInput({ title: 'Deck', price: -5, condition: 'Neuf' })
    expect(result.ok).toBe(false)
    expect(result.errors).toContain('Le prix doit être strictement positif')
  })

  it('refuse un prix nul', () => {
    expect(validateProductInput({ title: 'Deck', price: 0, condition: 'Neuf' }).ok).toBe(false)
  })

  it('refuse un prix non numérique', () => {
    const result = validateProductInput({ title: 'Deck', price: 'gratuit', condition: 'Neuf' })
    expect(result.ok).toBe(false)
    expect(result.errors).toContain('Le prix doit être un nombre')
  })

  it('accepte le plus petit prix significatif (limite basse)', () => {
    expect(validateProductInput({ title: 'Deck', price: 0.01, condition: 'Neuf' }).ok).toBe(true)
  })

  it('refuse un prix hors plage haute', () => {
    expect(validateProductInput({ title: 'Deck', price: 1_000_000, condition: 'Neuf' }).ok).toBe(false)
  })
})

describe('validateProductInput — énumérations', () => {
  it('accepte toutes les valeurs d\'état du schéma Prisma', () => {
    for (const condition of CONDITIONS) {
      expect(validateProductInput({ title: 'Deck', price: 10, condition }).ok).toBe(true)
    }
  })

  it('accepte toutes les catégories du schéma Prisma', () => {
    for (const category of CATEGORIES) {
      expect(validateProductInput({ title: 'Deck', price: 10, condition: 'Neuf', category }).ok).toBe(true)
    }
  })

  it('refuse un état hors énumération', () => {
    const result = validateProductInput({ title: 'Deck', price: 10, condition: 'Excellent' })
    expect(result.ok).toBe(false)
    expect(result.errors).toContain('État invalide')
  })

  it('refuse un état manquant', () => {
    expect(validateProductInput({ title: 'Deck', price: 10 }).ok).toBe(false)
  })

  it('refuse une catégorie hors énumération', () => {
    const result = validateProductInput({ title: 'Deck', price: 10, condition: 'Neuf', category: 'Skateboard' })
    expect(result.ok).toBe(false)
    expect(result.errors).toContain('Catégorie invalide')
  })

  it('refuse une tentative d\'injection dans un champ énuméré', () => {
    const result = validateProductInput({
      title: 'Deck',
      price: 10,
      condition: "Neuf'; DROP TABLE \"Product\"; --",
    })
    expect(result.ok).toBe(false)
  })

  it('cumule les erreurs de plusieurs champs invalides', () => {
    const result = validateProductInput({ title: '', price: -1, condition: 'X', category: 'Y' })
    expect(result.ok).toBe(false)
    expect(result.errors.length).toBe(4)
  })
})

describe('isCondition / isCategory — gardes de type', () => {
  it('reconnaît les valeurs valides', () => {
    expect(isCondition('Comme_neuf')).toBe(true)
    expect(isCategory('Truck')).toBe(true)
  })

  it('rejette les valeurs invalides et les types non chaîne', () => {
    expect(isCondition('comme_neuf')).toBe(false)
    expect(isCondition(42)).toBe(false)
    expect(isCategory(null)).toBe(false)
    expect(isCategory(undefined)).toBe(false)
  })
})

describe('canModifyProduct — contrôle de propriété d\'une annonce', () => {
  const product = { userId: 14 }

  it('autorise le propriétaire (cas nominal)', () => {
    expect(canModifyProduct(product, 14).allowed).toBe(true)
  })

  it('refuse un utilisateur non propriétaire avec un 403', () => {
    const result = canModifyProduct(product, 15)
    expect(result.allowed).toBe(false)
    expect(result.status).toBe(403)
  })

  it('refuse un visiteur non authentifié avec un 401', () => {
    const result = canModifyProduct(product, null)
    expect(result.allowed).toBe(false)
    expect(result.status).toBe(401)
  })

  it('refuse un identifiant de session non numérique (cas OAuth Google)', () => {
    const result = canModifyProduct(product, Number('sub-google-abc'))
    expect(result.allowed).toBe(false)
    expect(result.status).toBe(401)
  })

  it('renvoie 404 pour une annonce inexistante', () => {
    expect(canModifyProduct(null, 14).status).toBe(404)
  })
})
