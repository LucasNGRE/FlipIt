import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

/**
 * `DELETE /api/items/[id]` — contrôle de propriété d'une annonce.
 *
 * Cette route sert de témoin pour deux corrections :
 *  1. elle ne vérifiait auparavant NI la session NI la propriété : n'importe
 *     quel visiteur pouvait supprimer l'annonce de n'importe qui ;
 *  2. elle démontre l'effet de la résolution d'identifiant Google : avec un
 *     `sub` OAuth dans la session, la comparaison de propriété échouait.
 *
 * Prisma et la session sont entièrement simulés : aucun accès base ni réseau.
 */

const prismaMock = {
  product: {
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
}
const getSessionMock = vi.fn()

vi.mock('@/lib/db', () => ({ default: prismaMock }))
vi.mock('@/lib/getSession', () => ({ getSession: getSessionMock }))

type RouteModule = typeof import('@/app/api/items/[id]/route')
let DELETE: RouteModule['DELETE']

beforeAll(async () => {
  ;({ DELETE } = await import('@/app/api/items/[id]/route'))
})

const OWNER_ID = 14
const GOOGLE_SUB = '104729318475620183947'

function request() {
  return new Request('http://localhost/api/items/7', { method: 'DELETE' }) as any
}
const params = { params: { id: '7' } }

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.product.findUnique.mockResolvedValue({ userId: OWNER_ID })
  prismaMock.product.delete.mockResolvedValue({ id: 7, title: 'Deck Almost 8.0' })
})

describe('DELETE /api/items/[id] — contrôle de propriété', () => {
  it('autorise le propriétaire (cas nominal)', async () => {
    getSessionMock.mockResolvedValue({ user: { id: String(OWNER_ID) } })
    const res = await DELETE(request(), params)
    expect(res.status).toBe(200)
    expect(prismaMock.product.delete).toHaveBeenCalledWith({ where: { id: 7 } })
  })

  it('refuse un utilisateur non propriétaire avec un 403', async () => {
    getSessionMock.mockResolvedValue({ user: { id: '15' } })
    const res = await DELETE(request(), params)
    expect(res.status).toBe(403)
    expect(prismaMock.product.delete).not.toHaveBeenCalled()
  })

  it('refuse un visiteur non authentifié avec un 401 (régression)', async () => {
    getSessionMock.mockResolvedValue(null)
    const res = await DELETE(request(), params)
    expect(res.status).toBe(401)
    expect(prismaMock.product.delete).not.toHaveBeenCalled()
  })

  it("renvoie 404 pour une annonce inexistante", async () => {
    getSessionMock.mockResolvedValue({ user: { id: String(OWNER_ID) } })
    prismaMock.product.findUnique.mockResolvedValue(null)
    const res = await DELETE(request(), params)
    expect(res.status).toBe(404)
    expect(prismaMock.product.delete).not.toHaveBeenCalled()
  })

  it('refuse un identifiant de produit non numérique', async () => {
    getSessionMock.mockResolvedValue({ user: { id: String(OWNER_ID) } })
    const res = await DELETE(request(), { params: { id: 'abc' } })
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/items/[id] — sessions Google', () => {
  it('fonctionne avec une session Google dont l\'identifiant a été résolu en base', async () => {
    // Après correction : `token.sub` porte l'identifiant en base (14),
    // et non le `sub` OAuth de Google.
    getSessionMock.mockResolvedValue({ user: { id: '14', email: 'lucas@gmail.com' } })
    const res = await DELETE(request(), params)
    expect(res.status).toBe(200)
    expect(prismaMock.product.delete).toHaveBeenCalled()
  })

  it('rejette proprement une session portant encore un sub OAuth brut', async () => {
    // Comportement avant correction : Number(sub) dépassait les entiers sûrs,
    // la comparaison de propriété ne pouvait jamais aboutir. La route doit
    // refuser explicitement plutôt que produire un comportement indéfini.
    getSessionMock.mockResolvedValue({ user: { id: GOOGLE_SUB, email: 'lucas@gmail.com' } })
    const res = await DELETE(request(), params)
    expect(res.status).toBe(403)
    expect(prismaMock.product.delete).not.toHaveBeenCalled()
  })
})
