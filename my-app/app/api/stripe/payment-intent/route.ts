export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import stripe from '@/lib/stripe'
import { getSession } from '@/lib/getSession'

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const buyerId = Number(session.user.id)

    const { productId, offerId, deliveryCost } = await req.json()
    if (!productId) {
      return NextResponse.json({ error: 'productId requis' }, { status: 400 })
    }

    // Récupère le produit et le vendeur
    const product = await prisma.product.findUnique({
      where: { id: Number(productId) },
      include: { user: { select: { id: true, stripeAccountId: true, stripeOnboarded: true } } },
    })
    if (!product) return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })
    if (product.userId === buyerId) {
      return NextResponse.json({ error: 'Impossible d\'acheter son propre produit' }, { status: 400 })
    }
    if (!product.user.stripeOnboarded || !product.user.stripeAccountId) {
      return NextResponse.json({ error: 'Le vendeur n\'a pas encore configuré son compte de paiement' }, { status: 400 })
    }

    // Prix final : offre négociée ou prix du produit
    let finalPrice = Number(product.price)
    if (offerId) {
      const offer = await prisma.offer.findUnique({
        where: { id: Number(offerId) },
        select: { offerPrice: true, status: true },
      })
      if (offer?.status === 'accepted') {
        finalPrice = Number(offer.offerPrice)
      }
    }

    const deliveryAmount = Number(deliveryCost ?? 4)
    const commissionAmount = Math.round(finalPrice * 0.10 * 100) / 100
    const totalAmount = finalPrice + deliveryAmount + commissionAmount
    const amountCents = Math.round(totalAmount * 100)

    const transferGroup = `ORDER_${product.id}_${Date.now()}`

    // Crée le PaymentIntent — argent bloqué sur le compte plateforme
    // Pas de transfer_data ni application_fee ici : le transfert au vendeur est différé
    // et la commission 10% est déduite manuellement dans /api/orders/[id]/confirm
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      transfer_group: transferGroup,
      metadata: {
        productId: String(product.id),
        buyerId: String(buyerId),
        sellerId: String(product.userId),
        offerId: offerId ? String(offerId) : '',
        finalPrice: String(finalPrice),
        sellerStripeAccountId: product.user.stripeAccountId,
      },
    })

    return NextResponse.json({ clientSecret: paymentIntent.client_secret, transferGroup })
  } catch (err: any) {
    console.error('[stripe/payment-intent]', err)
    return NextResponse.json({ error: err.message ?? 'Erreur Stripe' }, { status: 500 })
  }
}
