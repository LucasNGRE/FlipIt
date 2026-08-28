import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import prisma from '@/lib/db'
import { isAdminRequest } from '@/lib/adminAuth'

export async function GET(req: Request) {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: 'AccÃ¨s refusÃ©' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const orders = await prisma.order.findMany({
    where: status ? { status: status as any } : undefined,
    include: {
      product: { select: { id: true, title: true, images: { select: { url: true }, take: 1 } } },
      seller: { select: { id: true, firstName: true, lastName: true } },
      buyer:  { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json(orders)
}

