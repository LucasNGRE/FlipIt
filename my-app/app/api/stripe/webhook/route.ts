import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import stripe from '@/lib/stripe'
import pusherServer from '@/lib/pusher-server'

export const config = { api: { bodyParser: false } }

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Signature manquante' }, { status: 400 })
  }

  let event: ReturnType<typeof stripe.webhooks.constructEvent>
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error('[webhook] Signature invalide:', err.message)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as any
        const { productId, buyerId, sellerId, offerId, finalPrice, sellerStripeAccountId } = pi.metadata

        // Crée l'Order + marque le produit comme réservé
        const [order] = await Promise.all([
          prisma.order.create({
            data: {
              productId: Number(productId),
              buyerId: Number(buyerId),
              sellerId: Number(sellerId),
              offerId: offerId ? Number(offerId) : null,
              finalPrice: Number(finalPrice),
              paymentIntentId: pi.id,
              transferGroup: pi.transfer_group,
              status: 'paid',
            },
          }),
          prisma.product.update({
            where: { id: Number(productId) },
            data: { status: 'reserved' },
          }),
        ])

        // Notifie le vendeur via Pusher
        await pusherServer.trigger(
          `private-user-${sellerId}`,
          'new-order',
          { orderId: order.id, productId, finalPrice, buyerId }
        )
        break
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as any
        const pi = await stripe.paymentIntents.retrieve(dispute.payment_intent as string)

        const order = await prisma.order.findUnique({ where: { paymentIntentId: pi.id } })

        await prisma.chargeback.upsert({
          where: { stripeId: dispute.id },
          update: { status: dispute.status, amount: dispute.amount / 100 },
          create: {
            stripeId: dispute.id,
            orderId: order?.id ?? null,
            amount: dispute.amount / 100,
            reason: dispute.reason ?? null,
            status: dispute.status,
          },
        })

        await pusherServer.trigger('private-admin', 'chargeback-created', {
          stripeId: dispute.id,
          amount: dispute.amount,
          orderId: order?.id,
        })
        break
      }

      case 'charge.dispute.updated':
      case 'charge.dispute.closed': {
        const dispute = event.data.object as any
        await prisma.chargeback.updateMany({
          where: { stripeId: dispute.id },
          data: { status: dispute.status },
        })
        break
      }

      default:
        break
    }
  } catch (err: any) {
    console.error('[webhook] Handler error:', err)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
