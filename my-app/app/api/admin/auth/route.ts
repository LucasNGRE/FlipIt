import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { rateLimit } from '@/lib/rateLimit'

export async function POST(req: Request) {
  const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const key = `admin-login:${ip}`

  // 5 tentatives par 15 min, lockout 30 min après dépassement
  const limit = rateLimit(key, { limit: 5, windowMs: 15 * 60 * 1000, lockoutMs: 30 * 60 * 1000 })
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Trop de tentatives. Réessayez dans ${Math.ceil((limit.retryAfter ?? 0) / 60)} min.` },
      { status: 429 }
    )
  }

  const { password } = await req.json().catch(() => ({ password: '' }))

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    // Délai artificiel pour ralentir le brute force (500ms)
    await new Promise(r => setTimeout(r, 500))
    return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })
  }

  cookies().set('admin_token', process.env.ADMIN_TOKEN!, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  cookies().delete('admin_token')
  return NextResponse.json({ ok: true })
}
