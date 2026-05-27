import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/getSession'
import pusherServer from '@/lib/pusher-server'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const currentUserId = Number(session.user.id)

    const order = await prisma.order.findUnique({ where: { id: Number(params.id) } })
    if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
    if (order.sellerId !== currentUserId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }
    if (order.status !== 'paid') {
      return NextResponse.json({ error: 'La commande n\'est pas en attente d\'expédition' }, { status: 400 })
    }

    const shippedAt = new Date()
    const confirmDeadline = new Date(shippedAt.getTime() + 48 * 60 * 60 * 1000)
    const trackingNumber = `FLT-${shippedAt.getFullYear()}${String(shippedAt.getMonth() + 1).padStart(2, '0')}${String(shippedAt.getDate()).padStart(2, '0')}-${order.id.toString().padStart(5, '0')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

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
