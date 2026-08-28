import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'

/**
 * Test de la route `POST /api/offer/status` avec la couche Prisma,
 * Pusher et la session entièrement simulées : aucun accès réseau
 * ni base de données n'est effectué.
 */

const prismaMock = {
  offer: {
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  conversation: {
    findFirst: vi.fn(),
  },
}
const pusherMock = { trigger: vi.fn().mockResolvedValue(undefined) }
const getSessionMock = vi.fn()

vi.mock('@/lib/db', () => ({ default: prismaMock }))
vi.mock('@/lib/pusher-server', () => ({ default: pusherMock }))
vi.mock('@/lib/getSession', () => ({ getSession: getSessionMock }))

type RouteModule = typeof import('@/app/api/offer/status/route')
let POST: RouteModule['POST']

beforeAll(async () => {
  ;({ POST } = await import('@/app/api/offer/status/route'))
})

function request(body: unknown) {
  return new Request('http://localhost/api/offer/status', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

const OFFER = {
  id: 1,
  status: 'pending',
  buyerId: 7,
  productId: 3,
  product: { userId: 42 },
}

beforeEach(() => {
  vi.clearAllMocks()
  getSessionMock.mockResolvedValue({ user: { id: '42' } })
  prismaMock.offer.findUnique.mockResolvedValue(OFFER)
  prismaMock.conversation.findFirst.mockResolvedValue({ id: 99 })
  prismaMock.offer.update.mockImplementation(async ({ data }: any) => ({
    id: 1,
    status: data.status,
    expiresAt: data.expiresAt ?? null,
  }))
  prismaMock.offer.updateMany.mockResolvedValue({ count: 0 })
})

describe('POST /api/offer/status — authentification', () => {
  it('refuse un visiteur non authentifié avec un 401', async () => {
    getSessionMock.mockResolvedValue(null)
    const res = await POST(request({ id: 1, accepted: true }))
    expect(res.status).toBe(401)
    expect(prismaMock.offer.update).not.toHaveBeenCalled()
  })
})

describe('POST /api/offer/status — validation des paramètres', () => {
  it('refuse un identifiant manquant', async () => {
    const res = await POST(request({ accepted: true }))
    expect(res.status).toBe(400)
  })

  it('refuse un booléen `accepted` mal typé', async () => {
    const res = await POST(request({ id: 1, accepted: 'oui' }))
    expect(res.status).toBe(400)
  })
})

describe('POST /api/offer/status — règles métier', () => {
  it('renvoie 404 si l\'offre n\'existe pas', async () => {
    prismaMock.offer.findUnique.mockResolvedValue(null)
    const res = await POST(request({ id: 1, accepted: true }))
    expect(res.status).toBe(404)
  })

  it('refuse de traiter une offre déjà traitée', async () => {
    prismaMock.offer.findUnique.mockResolvedValue({ ...OFFER, status: 'rejected' })
    const res = await POST(request({ id: 1, accepted: true }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: expect.stringMatching(/déjà été traitée/) })
  })

  it('interdit à l\'émetteur de répondre à sa propre offre', async () => {
    getSessionMock.mockResolvedValue({ user: { id: '7' } })
    const res = await POST(request({ id: 1, accepted: true }))
    expect(res.status).toBe(403)
  })

  it('interdit à un utilisateur hors conversation de répondre', async () => {
    prismaMock.conversation.findFirst.mockResolvedValue(null)
    const res = await POST(request({ id: 1, accepted: true }))
    expect(res.status).toBe(403)
  })
})

describe('POST /api/offer/status — acceptation (cas nominal)', () => {
  it('accepte l\'offre et ouvre une fenêtre de paiement de 24 h', async () => {
    const avant = Date.now()
    const res = await POST(request({ id: 1, accepted: true }))
    expect(res.status).toBe(200)

    const data = prismaMock.offer.update.mock.calls[0][0].data
    expect(data.status).toBe('accepted')
    const delta = new Date(data.expiresAt).getTime() - avant
    expect(delta).toBeGreaterThan(23.9 * 60 * 60 * 1000)
    expect(delta).toBeLessThanOrEqual(24 * 60 * 60 * 1000 + 5000)
  })

  it('invalide les autres offres du même produit', async () => {
    await POST(request({ id: 1, accepted: true }))
    expect(prismaMock.offer.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          productId: 3,
          id: { not: 1 },
        }),
        data: { status: 'rejected' },
      })
    )
  })

  it('notifie les participants via Pusher', async () => {
    await POST(request({ id: 1, accepted: true }))
    expect(pusherMock.trigger).toHaveBeenCalledWith(
      'private-conversation-99',
      'offer-updated',
      expect.objectContaining({ offerId: 1, status: 'accepted' })
    )
  })
})

describe('POST /api/offer/status — refus', () => {
  it('rejette l\'offre sans poser d\'échéance', async () => {
    const res = await POST(request({ id: 1, accepted: false }))
    expect(res.status).toBe(200)
    const data = prismaMock.offer.update.mock.calls[0][0].data
    expect(data.status).toBe('rejected')
    expect(data.expiresAt).toBeUndefined()
  })

  it('n\'invalide pas les autres offres lors d\'un refus', async () => {
    await POST(request({ id: 1, accepted: false }))
    expect(prismaMock.offer.updateMany).not.toHaveBeenCalled()
  })
})
