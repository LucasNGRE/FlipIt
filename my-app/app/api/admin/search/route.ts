import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { cookies } from 'next/headers'

export async function GET(req: Request) {
  if (cookies().get('admin_token')?.value !== process.env.ADMIN_TOKEN)
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const q = new URL(req.url).searchParams.get('q') ?? ''
  if (q.length < 2) return NextResponse.json({ users: [], orders: [], products: [] })

  const isId = /^\d+$/.test(q)

  const [users, orders, products] = await Promise.all([
    prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, firstName: true, lastName: true, email: true, image: true, suspended: true },
      take: 5,
    }),
    prisma.order.findMany({
      where: isId
        ? { id: Number(q) }
        : { paymentIntentId: { contains: q, mode: 'insensitive' } },
      include: {
        product: { select: { title: true } },
        buyer:   { select: { firstName: true, lastName: true } },
      },
      take: 5,
    }),
    prisma.product.findMany({
      where: { title: { contains: q, mode: 'insensitive' } },
      include: { images: { select: { url: true }, take: 1 }, user: { select: { firstName: true, lastName: true } } },
      take: 5,
    }),
  ])

  return NextResponse.json({ users, orders, products })
}
