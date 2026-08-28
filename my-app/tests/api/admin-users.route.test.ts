import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'

/**
 * Contrôle d'accès de la route `GET /api/admin/users`.
 * Le middleware `middleware.ts` ne couvre que les PAGES `/admin/*`
 * (matcher `/admin/:path*`) : les routes `/api/admin/*` reposent
 * uniquement sur la vérification du cookie faite dans chaque handler.
 * Ces tests documentent le comportement réel de cette vérification.
 */

const cookiesMock = vi.fn()
const prismaMock = { user: { findMany: vi.fn() } }

vi.mock('next/headers', () => ({ cookies: cookiesMock }))
vi.mock('@/lib/db', () => ({ default: prismaMock }))

type RouteModule = typeof import('@/app/api/admin/users/route')
let GET: RouteModule['GET']

beforeAll(async () => {
  ;({ GET } = await import('@/app/api/admin/users/route'))
})

function withCookie(value: string | undefined) {
  cookiesMock.mockReturnValue({
    get: (name: string) => (name === 'admin_token' && value !== undefined ? { value } : undefined),
  })
}

const ORIGINAL_TOKEN = process.env.ADMIN_TOKEN

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.user.findMany.mockResolvedValue([])
  process.env.ADMIN_TOKEN = 'jeton-admin-de-test'
})

afterEach(() => {
  if (ORIGINAL_TOKEN === undefined) delete process.env.ADMIN_TOKEN
  else process.env.ADMIN_TOKEN = ORIGINAL_TOKEN
})

describe('GET /api/admin/users — accès refusé', () => {
  it('refuse une requête sans cookie admin_token', async () => {
    withCookie(undefined)
    const res = await GET()
    expect(res.status).toBe(403)
    expect(prismaMock.user.findMany).not.toHaveBeenCalled()
  })

  it('refuse un cookie admin_token invalide', async () => {
    withCookie('jeton-forge-par-un-attaquant')
    const res = await GET()
    expect(res.status).toBe(403)
    expect(prismaMock.user.findMany).not.toHaveBeenCalled()
  })

  it('refuse un cookie vide', async () => {
    withCookie('')
    const res = await GET()
    expect(res.status).toBe(403)
  })
})

describe('GET /api/admin/users — accès autorisé', () => {
  it('autorise un cookie admin_token valide et interroge la base', async () => {
    withCookie('jeton-admin-de-test')
    const res = await GET()
    expect(res.status).toBe(200)
    expect(prismaMock.user.findMany).toHaveBeenCalled()
  })
})

describe('GET /api/admin/users — régression de sécurité', () => {
  /**
   * Faille constatée : la comparaison `cookies().get('admin_token')?.value !== process.env.ADMIN_TOKEN`
   * évalue `undefined !== undefined` → `false` lorsque ADMIN_TOKEN n'est pas
   * défini dans l'environnement. Sans cookie, l'accès est alors ACCORDÉ.
   * Ce test verrouille le comportement attendu après correction :
   * l'absence de secret configuré doit refuser l'accès.
   */
  it('refuse l\'accès lorsque ADMIN_TOKEN n\'est pas configuré et qu\'aucun cookie n\'est fourni', async () => {
    delete process.env.ADMIN_TOKEN
    withCookie(undefined)
    const res = await GET()
    expect(res.status).toBe(403)
    expect(prismaMock.user.findMany).not.toHaveBeenCalled()
  })
})
