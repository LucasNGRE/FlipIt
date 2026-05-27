import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import prisma from '@/lib/db'
import { cookies } from 'next/headers'

export async function GET(req: Request) {
  try {
    if (cookies().get('admin_token')?.value !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const filter = new URL(req.url).searchParams.get('filter') ?? 'active'
    const where = filter === 'resolved'
      ? { disputeReason: { not: null }, status: { in: ['confirmed', 'refunded'] as any[] } }
      : { status: 'disputed' as any }

    const disputes = await prisma.order.findMany({
      where,
      include: {
        product: { select: { id: true, title: true, images: { select: { url: true }, take: 1 } } },
        seller: { select: { id: true, firstName: true, lastName: true, email: true } },
        buyer:  { select: { id: true, firstName: true, lastName: true, email: true } },
        disputeImages: { select: { url: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(disputes)
  } catch (err: any) {
    console.error('[admin/disputes]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
