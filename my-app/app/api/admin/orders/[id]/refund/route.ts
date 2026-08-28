import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import stripe from '@/lib/stripe'
import pusherServer from '@/lib/pusher-server'
import { logAdmin } from '@/lib/adminLog'
import { isAdminRequest } from '@/lib/adminAuth'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    if (!isAdminRequest()) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const order = await prisma.order.findUnique({ where: { id: Number(params.id) } })
    if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
    if (order.status === 'refunded') {
      return NextResponse.json({ error: 'Déjà remboursée' }, { status: 400 })
    }

    // Déclenche le remboursement Stripe
    const refund = await stripe.refunds.create({
      payment_intent: order.paymentIntentId,
    })

    await Promise.all([
      prisma.order.update({ where: { id: order.id }, data: { status: 'refunded' } }),
      prisma.product.update({ where: { id: order.productId }, data: { status: 'available' } }),
    ])

    // Notifie acheteur et vendeur
    await Promise.all([
      pusherServer.trigger(`private-user-${order.buyerId}`, 'order-refunded', { orderId: order.id }),
      pusherServer.trigger(`private-user-${order.sellerId}`, 'order-refunded', { orderId: order.id }),
      logAdmin('dispute_refunded', `order:${order.id}`, `refund:${refund.id}`),
    ])

    return NextResponse.json({ refundId: refund.id, status: 'refunded' })
  } catch (err: any) {
    console.error('[admin/refund]', err)
    return NextResponse.json({ error: err.message ?? 'Erreur Stripe' }, { status: 500 })
  }
}
