import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import stripe from '@/lib/stripe'
import pusherServer from '@/lib/pusher-server'

export async function POST(req: Request) {
  // Vérifie le secret cron pour éviter les appels non autorisés
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const now = new Date()

    // Cherche toutes les commandes expédiées dont le délai de 48h est dépassé
    const expiredOrders = await prisma.order.findMany({
      where: {
        status: 'shipped',
        confirmDeadline: { lte: now },
      },
      include: { seller: { select: { stripeAccountId: true } } },
    })

    const results = []

    for (const order of expiredOrders) {
      try {
        if (!order.seller.stripeAccountId) continue

        // Le vendeur reçoit le prix produit en entier — commission payée par l'acheteur en sus
        const transferAmount = Math.round(Number(order.finalPrice) * 100)

        const pi = await stripe.paymentIntents.retrieve(order.paymentIntentId)
        const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id

        await stripe.transfers.create({
          amount: transferAmount,
          currency: 'eur',
          destination: order.seller.stripeAccountId,
          transfer_group: order.transferGroup,
          ...(chargeId ? { source_transaction: chargeId } : {}),
          metadata: { orderId: String(order.id), autoConfirmed: 'true' },
        })

        await Promise.all([
          prisma.order.update({ where: { id: order.id }, data: { status: 'confirmed' } }),
          prisma.product.update({ where: { id: order.productId }, data: { status: 'sold' } }),
        ])

        // Notifie le vendeur et l'acheteur
        await pusherServer.trigger(`private-user-${order.sellerId}`, 'order-confirmed', {
          orderId: order.id, autoConfirmed: true,
        })
        await pusherServer.trigger(`private-user-${order.buyerId}`, 'order-auto-confirmed', {
          orderId: order.id,
        })

        results.push({ orderId: order.id, status: 'confirmed' })
      } catch (err: any) {
        console.error(`[cron/auto-confirm] Order ${order.id}:`, err)
        results.push({ orderId: order.id, status: 'error', error: err.message })
      }
    }

    return NextResponse.json({ processed: results.length, results })
  } catch (err: any) {
    console.error('[cron/auto-confirm]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
