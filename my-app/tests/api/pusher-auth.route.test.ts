import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'

/**
 * `POST /api/pusher/auth` — autorisation d'abonnement aux canaux privés.
 *
 * Régression couverte : la chaîne d'autorisation ne traitait pas `private-admin`
 * et ne se terminait pas par un refus. Tout canal ne correspondant à aucun
 * préfixe connu tombait directement sur `authorizeChannel`, si bien qu'un
 * utilisateur simplement authentifié pouvait s'abonner au canal
 * d'administration et recevoir les événements `order-disputed` et
 * `chargeback-created` (orderId, buyerId, sellerId, paymentIntentId).
 *
 * Prisma, Pusher, la session NextAuth et les cookies sont simulés :
 * aucun accès base ni réseau.
 */

const prismaMock = {
  user: { findUnique: vi.fn() },
  conversation: { findFirst: vi.fn() },
}
const pusherMock = { authorizeChannel: vi.fn(() => ({ auth: 'signature-simulee' })) }
const getSessionMock = vi.fn()
const cookiesMock = vi.fn()

vi.mock('@/lib/db', () => ({ default: prismaMock }))
vi.mock('@/lib/pusher-server', () => ({ default: pusherMock }))
vi.mock('@/lib/getSession', () => ({ getSession: getSessionMock }))
vi.mock('next/headers', () => ({ cookies: cookiesMock }))

type RouteModule = typeof import('@/app/api/pusher/auth/route')
let POST: RouteModule['POST']

beforeAll(async () => {
  ;({ POST } = await import('@/app/api/pusher/auth/route'))
})

const MEMBER_ID = 14
const ADMIN_TOKEN = 'jeton-admin-de-test'
const ORIGINAL_TOKEN = process.env.ADMIN_TOKEN

/** Construit la requête telle que Pusher l'envoie : form-urlencoded. */
function request(channelName: string, socketId = '123.456') {
  const body = new URLSearchParams({ socket_id: socketId, channel_name: channelName })
  return new Request('http://localhost/api/pusher/auth', {
    method: 'POST',
    body: body.toString(),
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
  })
}

function withAdminCookie(value: string | undefined) {
  cookiesMock.mockReturnValue({
    get: (name: string) => (name === 'admin_token' && value !== undefined ? { value } : undefined),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ADMIN_TOKEN = ADMIN_TOKEN
  withAdminCookie(undefined)
  getSessionMock.mockResolvedValue({ user: { email: 'lucas@flipit.com' } })
  prismaMock.user.findUnique.mockResolvedValue({ id: MEMBER_ID })
  prismaMock.conversation.findFirst.mockResolvedValue({ id: 3 })
  pusherMock.authorizeChannel.mockReturnValue({ auth: 'signature-simulee' })
})

afterEach(() => {
  if (ORIGINAL_TOKEN === undefined) delete process.env.ADMIN_TOKEN
  else process.env.ADMIN_TOKEN = ORIGINAL_TOKEN
})

describe('POST /api/pusher/auth — canal private-admin', () => {
  it("refuse un membre authentifié sans cookie admin (régression F9)", async () => {
    const res = await POST(request('private-admin'))
    expect(res.status).toBe(403)
    expect(pusherMock.authorizeChannel).not.toHaveBeenCalled()
  })

  it('refuse un cookie admin forgé', async () => {
    withAdminCookie('jeton-invente-par-un-attaquant')
    const res = await POST(request('private-admin'))
    expect(res.status).toBe(403)
    expect(pusherMock.authorizeChannel).not.toHaveBeenCalled()
  })

  it('autorise un administrateur porteur du cookie valide', async () => {
    withAdminCookie(ADMIN_TOKEN)
    const res = await POST(request('private-admin'))
    expect(res.status).toBe(200)
    expect(pusherMock.authorizeChannel).toHaveBeenCalledWith('123.456', 'private-admin')
  })

  it("autorise l'administrateur même sans session NextAuth (sessions indépendantes)", async () => {
    withAdminCookie(ADMIN_TOKEN)
    getSessionMock.mockResolvedValue(null)
    const res = await POST(request('private-admin'))
    expect(res.status).toBe(200)
    expect(getSessionMock).not.toHaveBeenCalled()
  })

  it("refuse lorsque ADMIN_TOKEN n'est pas configuré", async () => {
    delete process.env.ADMIN_TOKEN
    withAdminCookie(undefined)
    const res = await POST(request('private-admin'))
    expect(res.status).toBe(403)
  })
})

describe('POST /api/pusher/auth — refus par défaut', () => {
  it('refuse un canal totalement inconnu', async () => {
    const res = await POST(request('private-quelque-chose'))
    expect(res.status).toBe(403)
    expect(pusherMock.authorizeChannel).not.toHaveBeenCalled()
  })

  it('refuse un canal public non déclaré', async () => {
    const res = await POST(request('canal-libre'))
    expect(res.status).toBe(403)
    expect(pusherMock.authorizeChannel).not.toHaveBeenCalled()
  })

  it('refuse un préfixe approchant mais non reconnu', async () => {
    for (const canal of ['private-adminx', 'private-admin-2', 'private-conversation', 'private-users-14']) {
      vi.clearAllMocks()
      prismaMock.user.findUnique.mockResolvedValue({ id: MEMBER_ID })
      const res = await POST(request(canal))
      expect(res.status, canal).toBe(403)
      expect(pusherMock.authorizeChannel).not.toHaveBeenCalled()
    }
  })

  it('refuse une requête sans paramètres Pusher', async () => {
    const res = await POST(
      new Request('http://localhost/api/pusher/auth', { method: 'POST', body: '' })
    )
    expect(res.status).toBe(400)
  })
})

describe('POST /api/pusher/auth — canaux de conversation (non-régression)', () => {
  it('autorise un participant de la conversation', async () => {
    const res = await POST(request('private-conversation-3'))
    expect(res.status).toBe(200)
    expect(pusherMock.authorizeChannel).toHaveBeenCalledWith('123.456', 'private-conversation-3')
  })

  it("refuse un utilisateur étranger à la conversation", async () => {
    prismaMock.conversation.findFirst.mockResolvedValue(null)
    const res = await POST(request('private-conversation-3'))
    expect(res.status).toBe(403)
    expect(pusherMock.authorizeChannel).not.toHaveBeenCalled()
  })

  it("refuse un identifiant de conversation non numérique", async () => {
    const res = await POST(request('private-conversation-abc'))
    expect(res.status).toBe(403)
    expect(pusherMock.authorizeChannel).not.toHaveBeenCalled()
  })

  it('exige une session NextAuth', async () => {
    getSessionMock.mockResolvedValue(null)
    const res = await POST(request('private-conversation-3'))
    expect(res.status).toBe(401)
  })
})

describe('POST /api/pusher/auth — canaux utilisateur (non-régression)', () => {
  it('autorise un utilisateur sur son propre canal', async () => {
    const res = await POST(request(`private-user-${MEMBER_ID}`))
    expect(res.status).toBe(200)
    expect(pusherMock.authorizeChannel).toHaveBeenCalledWith('123.456', 'private-user-14')
  })

  it("refuse l'abonnement au canal d'un autre utilisateur", async () => {
    const res = await POST(request('private-user-99'))
    expect(res.status).toBe(403)
    expect(pusherMock.authorizeChannel).not.toHaveBeenCalled()
  })

  it("refuse un identifiant d'utilisateur non numérique", async () => {
    const res = await POST(request('private-user-abc'))
    expect(res.status).toBe(403)
  })

  it("renvoie 404 si le compte n'existe plus en base", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    const res = await POST(request(`private-user-${MEMBER_ID}`))
    expect(res.status).toBe(404)
  })

  it("résout l'utilisateur par e-mail, ce qui couvre les comptes Google", async () => {
    getSessionMock.mockResolvedValue({ user: { email: 'lucas@gmail.com', id: '104729318475620183947' } })
    const res = await POST(request(`private-user-${MEMBER_ID}`))
    expect(res.status).toBe(200)
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'lucas@gmail.com' } })
    )
  })
})
