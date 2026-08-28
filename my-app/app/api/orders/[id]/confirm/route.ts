export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import stripe from '@/lib/stripe'
import { getSession } from '@/lib/getSession'
import pusherServer from '@/lib/pusher-server'
import { computeTransferAmountCents } from '@/lib/domain/pricing'
import { canConfirmOrder } from '@/lib/domain/orders'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const currentUserId = Number(session.user.id)

    const order = await prisma.order.findUnique({
      where: { id: Number(params.id) },
      include: { seller: { select: { stripeAccountId: true } } },
    })
    if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
    const authorization = canConfirmOrder(order, currentUserId)
    if (!authorization.allowed) {
      return NextResponse.json({ error: authorization.error }, { status: authorization.status })
    }
    if (!order.seller.stripeAccountId) {
      return NextResponse.json({ error: 'Compte vendeur manquant' }, { status: 400 })
    }

    // Le vendeur reçoit le prix produit en entier — la commission est payée par l'acheteur en sus
    const transferAmount = computeTransferAmountCents(Number(order.finalPrice))

    // Récupère le charge ID lié au PaymentIntent pour source_transaction
    // (évite le problème de solde insuffisant en test mode)
    const pi = await stripe.paymentIntents.retrieve(order.paymentIntentId)
    const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id

    await stripe.transfers.create({
      amount: transferAmount,
      currency: 'eur',
      destination: order.seller.stripeAccountId,
      transfer_group: order.transferGroup,
      ...(chargeId ? { source_transaction: chargeId } : {}),
      metadata: { orderId: String(order.id) },
    })

    const [confirmed] = await Promise.all([
      prisma.order.update({ where: { id: order.id }, data: { status: 'confirmed' } }),
      prisma.product.update({ where: { id: order.productId }, data: { status: 'sold' } }),
    ])

    // Notifie le vendeur
    await pusherServer.trigger(`private-user-${order.sellerId}`, 'order-confirmed', {
      orderId: order.id,
    })

    return NextResponse.json(confirmed)
  } catch (err: any) {
    console.error('[orders/confirm]', err)
    return NextResponse.json({ error: err.message ?? 'Erreur' }, { status: 500 })
  }
}
