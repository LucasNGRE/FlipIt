export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const offer = await prisma.offer.findUnique({
    where: { id: parseInt(params.id) },
    select: { id: true, offerPrice: true, status: true, buyerId: true, productId: true, expiresAt: true },
  })
  if (!offer) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Auto-expire si la fenêtre de 24h est dépassée
  if (offer.status === 'accepted' && offer.expiresAt && offer.expiresAt < new Date()) {
    await prisma.offer.update({
      where: { id: offer.id },
      data: { status: 'rejected' },
    })
    return NextResponse.json({ ...offer, status: 'rejected', expired: true })
  }

  return NextResponse.json(offer)
}
