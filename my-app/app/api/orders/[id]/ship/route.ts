export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/getSession'
import pusherServer from '@/lib/pusher-server'
import { canShipOrder, computeConfirmDeadline, formatTrackingNumber } from '@/lib/domain/orders'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const currentUserId = Number(session.user.id)

    const order = await prisma.order.findUnique({ where: { id: Number(params.id) } })
    if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
    const authorization = canShipOrder(order, currentUserId)
    if (!authorization.allowed) {
      return NextResponse.json({ error: authorization.error }, { status: authorization.status })
    }

    const shippedAt = new Date()
    const confirmDeadline = computeConfirmDeadline(shippedAt)
    const trackingNumber = formatTrackingNumber(
      order.id,
      shippedAt,
      Math.random().toString(36).slice(2, 6).toUpperCase()
    )

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'shipped', shippedAt, confirmDeadline, trackingNumber },
    })

    // Notifie l'acheteur
    await pusherServer.trigger(`private-user-${order.buyerId}`, 'order-shipped', {
      orderId: order.id,
      trackingNumber: trackingNumber ?? null,
      confirmDeadline: confirmDeadline.toISOString(),
    })

    return NextResponse.json(updated)
  } catch (err: any) {
    console.error('[orders/ship]', err)
    return NextResponse.json({ error: err.message ?? 'Erreur' }, { status: 500 })
  }
}
