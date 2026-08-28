/**
 * Validation des annonces et contrôle de propriété.
 * Les valeurs d'énumération reflètent `prisma/schema.prisma`
 * (enums `Condition` et `Category`).
 */

export const CONDITIONS = [
  'Neuf',
  'Comme_neuf',
  'Bon_etat',
  'Moyen_etat',
  'Mauvais_etat',
] as const

export const CATEGORIES = [
  'Deck',
  'Truck',
  'Roue',
  'Chaussure',
  'Vetement',
  'Accessoire',
] as const

export type Condition = (typeof CONDITIONS)[number]
export type Category = (typeof CATEGORIES)[number]

export const MAX_TITLE_LENGTH = 120
export const MAX_PRICE = 99_999.99
export const MAX_IMAGES = 5

export interface ProductInput {
  title?: unknown
  price?: unknown
  condition?: unknown
  category?: unknown
  description?: unknown
  brand?: unknown
  size?: unknown
}

export interface ProductValidationResult {
  ok: boolean
  errors: string[]
  value?: {
    title: string
    price: number
    condition: Condition
    category: Category | null
    description: string | null
    brand: string | null
    size: string | null
  }
}

export function isCondition(value: unknown): value is Condition {
  return typeof value === 'string' && (CONDITIONS as readonly string[]).includes(value)
}

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value)
}

/**
 * Valide les champs d'une annonce avant persistance.
 * `category` est optionnelle côté schéma Prisma : absente, elle est acceptée ;
 * présente mais hors énumération, elle est refusée.
 */
export function validateProductInput(input: ProductInput): ProductValidationResult {
  const errors: string[] = []

  const title = typeof input.title === 'string' ? input.title.trim() : ''
  if (!title) {
    errors.push('Le titre est requis')
  } else if (title.length > MAX_TITLE_LENGTH) {
    errors.push(`Le titre ne peut pas dépasser ${MAX_TITLE_LENGTH} caractères`)
  }

  const rawPrice = input.price
  let price = NaN
  if (rawPrice === null || rawPrice === undefined || rawPrice === '') {
    errors.push('Le prix est requis')
  } else {
    price = typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice))
    if (!Number.isFinite(price)) {
      errors.push('Le prix doit être un nombre')
    } else if (price <= 0) {
      errors.push('Le prix doit être strictement positif')
    } else if (price > MAX_PRICE) {
      errors.push(`Le prix ne peut pas dépasser ${MAX_PRICE} €`)
    }
  }

  if (!isCondition(input.condition)) {
    errors.push('État invalide')
  }

  const hasCategory = input.category !== undefined && input.category !== null && input.category !== ''
  if (hasCategory && !isCategory(input.category)) {
    errors.push('Catégorie invalide')
  }

  if (errors.length > 0) return { ok: false, errors }

  return {
    ok: true,
    errors: [],
    value: {
      title,
      price,
      condition: input.condition as Condition,
      category: hasCategory ? (input.category as Category) : null,
      description: typeof input.description === 'string' && input.description.trim()
        ? input.description.trim()
        : null,
      brand: typeof input.brand === 'string' && input.brand.trim() ? input.brand.trim() : null,
      size: typeof input.size === 'string' && input.size.trim() ? input.size.trim() : null,
    },
  }
}

/** Seul le propriétaire d'une annonce peut la modifier ou la supprimer. */
export function canModifyProduct(
  product: { userId: number } | null,
  currentUserId: number | null
): { allowed: boolean; status: number; error?: string } {
  if (currentUserId === null || Number.isNaN(currentUserId)) {
    return { allowed: false, status: 401, error: 'Non authentifié' }
  }
  if (!product) {
    return { allowed: false, status: 404, error: 'Produit non trouvé' }
  }
  if (product.userId !== currentUserId) {
    return { allowed: false, status: 403, error: 'Non autorisé' }
  }
  return { allowed: true, status: 200 }
}
