export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/getSession'

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const userId = Number(session.user.id)

    const orders = await prisma.order.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      include: {
        product: { select: { id: true, title: true, images: { select: { url: true }, take: 1 } } },
        seller: { select: { id: true, firstName: true, lastName: true, image: true } },
        buyer:  { select: { id: true, firstName: true, lastName: true, image: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(orders)
  } catch (err: any) {
    console.error('[orders GET]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
