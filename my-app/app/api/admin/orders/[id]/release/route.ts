import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import stripe from '@/lib/stripe'
import { cookies } from 'next/headers'
import pusherServer from '@/lib/pusher-server'
import { logAdmin } from '@/lib/adminLog'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    if (cookies().get('admin_token')?.value !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const order = await prisma.order.findUnique({
      where: { id: Number(params.id) },
      include: { seller: { select: { stripeAccountId: true } } },
    })
    if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
    if (order.status !== 'disputed') {
      return NextResponse.json({ error: 'La commande n\'est pas en litige' }, { status: 400 })
    }
    if (!order.seller.stripeAccountId) {
      return NextResponse.json({ error: 'Compte vendeur manquant' }, { status: 400 })
    }

    const transferAmount = Math.round(Number(order.finalPrice) * 100)

    const pi = await stripe.paymentIntents.retrieve(order.paymentIntentId)
    const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id

    await stripe.transfers.create({
      amount: transferAmount,
      currency: 'eur',
      destination: order.seller.stripeAccountId,
      transfer_group: order.transferGroup,
      ...(chargeId ? { source_transaction: chargeId } : {}),
      metadata: { orderId: String(order.id), resolvedBy: 'admin-release' },
    })

    await Promise.all([
      prisma.order.update({ where: { id: order.id }, data: { status: 'confirmed' } }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prisma.product.update({ where: { id: order.productId }, data: { status: 'sold' as any } }),
    ])

    await Promise.all([
      pusherServer.trigger(`private-user-${order.sellerId}`, 'order-confirmed', { orderId: order.id }),
      pusherServer.trigger(`private-user-${order.buyerId}`, 'dispute-resolved', { orderId: order.id, resolution: 'released' }),
      logAdmin('dispute_released', `order:${order.id}`),
    ])

    return NextResponse.json({ status: 'confirmed' })
  } catch (err: any) {
    console.error('[admin/release]', err)
    return NextResponse.json({ error: err.message ?? 'Erreur' }, { status: 500 })
  }
}
