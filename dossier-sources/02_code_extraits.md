# 02 — Extraits de code source

> Code intégral, non tronqué, des fichiers représentatifs du projet.
> Chaque extrait est précédé de son chemin dans le dépôt.
> Aucune valeur secrète n'apparaît : seules des lectures `process.env.NOM` sont visibles.

## Sommaire

1. [Offres de prix](#1-offres-de-prix)
2. [Commandes et litiges](#2-commandes-et-litiges)
3. [Paiement Stripe](#3-paiement-stripe)
4. [Authentification et sécurité](#4-authentification-et-sécurité)
5. [Accès aux données](#5-accès-aux-données)
6. [Temps réel (Pusher)](#6-temps-réel-pusher-)
7. [Interface utilisateur](#7-interface-utilisateur)
8. [Logique métier extraite (refactoring) et tests associés](#8-logique-métier-extraite-refactoring-et-tests-associés)

---

## 1. Offres de prix

### Création d'une offre — POST

**Chemin :** `my-app/app/api/offer/route.ts` — 79 lignes

```ts
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/getSession";
import pusherServer from "@/lib/pusher-server";
import { validateOfferInput } from "@/lib/domain/offers";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(); // Récupère la session utilisateur

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();

    const validation = validateOfferInput(body);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { offerPrice, productId } = validation.value!;

    // Récupérer le produit pour vérifier que l'utilisateur ne fait pas une offre sur son propre produit
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { userId: true } // On a juste besoin de l'ID du vendeur
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Trouver la conversation entre cet acheteur et ce vendeur pour ce produit
    const conversation = await prisma.conversation.findFirst({
      where: {
        productId: productId,
        participants: { some: { id: Number(session.user.id) } },
      },
      include: { participants: { select: { id: true } } },
    });

    // Annuler toutes les offres précédentes (pending + accepted) entre ces deux participants
    // Nouvelle offre = on repart à zéro, comme sur Vinted/LBC
    if (conversation) {
      const participantIds = conversation.participants.map((p) => p.id);
      await prisma.offer.updateMany({
        where: {
          productId: productId,
          buyerId: { in: participantIds },
          status: { in: ["pending", "accepted"] },
        },
        data: { status: "rejected" },
      });

      // Notifier tous les participants que les offres ont été réinitialisées
      await pusherServer.trigger(
        `private-conversation-${conversation.id}`,
        "offers-reset",
        {}
      );
    }

    // Enregistrement de l'offre dans la base de données
    const offer = await prisma.offer.create({
      data: {
        offerPrice,
        productId: productId,
        buyerId: Number(session.user.id), // Associe l'offre à l'utilisateur connecté
      },
    });

    return NextResponse.json(offer, { status: 201 });
  } catch (error) {
    console.error("Error creating offer:", error);
    return NextResponse.json({ error: "Failed to create offer" }, { status: 500 });
  }
}
```

### Consultation et auto-expiration — GET

**Chemin :** `my-app/app/api/offer/[id]/route.ts` — 24 lignes

```ts
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { isOfferExpired } from '@/lib/domain/offers'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const offer = await prisma.offer.findUnique({
    where: { id: parseInt(params.id) },
    select: { id: true, offerPrice: true, status: true, buyerId: true, productId: true, expiresAt: true },
  })
  if (!offer) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Auto-expire si la fenêtre de 24h est dépassée
  if (isOfferExpired(offer, new Date())) {
    await prisma.offer.update({
      where: { id: offer.id },
      data: { status: 'rejected' },
    })
    return NextResponse.json({ ...offer, status: 'rejected', expired: true })
  }

  return NextResponse.json(offer)
}
```

### Acceptation / refus — POST

**Chemin :** `my-app/app/api/offer/status/route.ts` — 81 lignes

```ts
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import pusherServer from '@/lib/pusher-server'
import { getSession } from '@/lib/getSession'
import { canRespondToOffer, resolveOfferDecision } from '@/lib/domain/offers'

export async function POST(req: Request) {
  // 1. Auth
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }
  const currentUserId = Number(session.user.id)

  const { id, accepted } = await req.json()
  if (!id || typeof accepted !== 'boolean') {
    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
  }

  const offer = await prisma.offer.findUnique({
    where: { id: Number(id) },
    include: { product: { select: { userId: true } } },
  })
  if (!offer) return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 })

  // 2 à 4. Règles métier centralisées : offre en attente, émetteur exclu,
  //         utilisateur participant de la conversation liée au produit
  const conversation = await prisma.conversation.findFirst({
    where: {
      productId: offer.productId,
      participants: { some: { id: currentUserId } },
    },
  })

  const authorization = canRespondToOffer({
    offer,
    currentUserId,
    isConversationParticipant: Boolean(conversation),
  })
  if (!authorization.allowed || !conversation) {
    return NextResponse.json({ error: authorization.error }, { status: authorization.status })
  }

  // 5. Mettre à jour l'offre (fenêtre de paiement 24h si acceptée)
  const { expiresAt } = resolveOfferDecision(accepted, new Date())
  const updatedOffer = await prisma.offer.update({
    where: { id: Number(id) },
    data: {
      status: accepted ? 'accepted' : 'rejected',
      ...(accepted && { expiresAt }),
    },
  })

  // 6. Si acceptée → invalider toutes les autres offres (pending ET accepted) pour ce produit
  //    Cela annule automatiquement tout bouton "Payer" lié à une ancienne offre acceptée
  if (accepted) {
    await prisma.offer.updateMany({
      where: {
        productId: offer.productId,
        status: { in: ['pending', 'accepted'] },
        id: { not: offer.id },
      },
      data: { status: 'rejected' },
    })
  }

  // 8. Pusher : notifier tous les participants de la conversation
  await pusherServer.trigger(
    `private-conversation-${conversation.id}`,
    'offer-updated',
    {
      offerId: offer.id,
      status: updatedOffer.status,
      expiresAt: updatedOffer.expiresAt?.toISOString() ?? null,
    }
  )

  return NextResponse.json(updatedOffer)
}
```

---

## 2. Commandes et litiges

### Marquer expédié — POST

**Chemin :** `my-app/app/api/orders/[id]/ship/route.ts` — 49 lignes

```ts
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
```

### Confirmer réception et libérer les fonds — POST

**Chemin :** `my-app/app/api/orders/[id]/confirm/route.ts` — 64 lignes

```ts
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
```

### Ouvrir un litige — POST

**Chemin :** `my-app/app/api/orders/[id]/dispute/route.ts` — 50 lignes

```ts
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/getSession'
import pusherServer from '@/lib/pusher-server'
import { canDisputeOrder } from '@/lib/domain/orders'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const currentUserId = Number(session.user.id)

    const order = await prisma.order.findUnique({ where: { id: Number(params.id) } })
    if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
    const authorization = canDisputeOrder(order, currentUserId)
    if (!authorization.allowed) {
      return NextResponse.json({ error: authorization.error }, { status: authorization.status })
    }

    const { reason, details, images } = await req.json().catch(() => ({ reason: '', details: '', images: [] }))

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'disputed',
        disputeReason: reason ?? null,
        disputeDetails: details ?? null,
        disputeImages: images?.length
          ? { createMany: { data: (images as string[]).slice(0, 3).map((url: string) => ({ url })) } }
          : undefined,
      },
    })

    await pusherServer.trigger('private-admin', 'order-disputed', {
      orderId: order.id,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      paymentIntentId: order.paymentIntentId,
    })

    return NextResponse.json(updated)
  } catch (err: any) {
    console.error('[orders/dispute]', err)
    return NextResponse.json({ error: err.message ?? 'Erreur' }, { status: 500 })
  }
}
```

### Confirmation automatique (cron Vercel) — POST

**Chemin :** `my-app/app/api/cron/auto-confirm/route.ts` — 74 lignes

```ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import stripe from '@/lib/stripe'
import pusherServer from '@/lib/pusher-server'
import { computeTransferAmountCents } from '@/lib/domain/pricing'
import { isCronAuthorized } from '@/lib/domain/access'

export async function POST(req: Request) {
  // Vérifie le secret cron pour éviter les appels non autorisés
  const auth = req.headers.get('authorization')
  if (!isCronAuthorized(auth, process.env.CRON_SECRET)) {
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
        const transferAmount = computeTransferAmountCents(Number(order.finalPrice))

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
```

### Liste des commandes de l'utilisateur — GET

**Chemin :** `my-app/app/api/orders/route.ts` — 32 lignes

```ts
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/getSession'

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const userId = Number(session.user.id)

    const orders = await prisma.order.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      include: {
        product: { select: { id: true, title: true, images: { select: { url: true }, take: 1 } } },
        seller: { select: { id: true, firstName: true, lastName: true, image: true } },
        buyer:  { select: { id: true, firstName: true, lastName: true, image: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(orders)
  } catch (err: any) {
    console.error('[orders GET]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
```

---

## 3. Paiement Stripe

### Création du PaymentIntent — POST

**Chemin :** `my-app/app/api/stripe/payment-intent/route.ts` — 77 lignes

```ts
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import stripe from '@/lib/stripe'
import { getSession } from '@/lib/getSession'
import { computeOrderAmounts, resolveFinalPrice, DEFAULT_DELIVERY_COST } from '@/lib/domain/pricing'

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
      finalPrice = resolveFinalPrice(
        finalPrice,
        offer ? { offerPrice: Number(offer.offerPrice), status: offer.status } : null
      )
    }

    const { amountCents } = computeOrderAmounts(
      finalPrice,
      Number(deliveryCost ?? DEFAULT_DELIVERY_COST)
    )

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
```

### Webhook Stripe (signature vérifiée) — POST

**Chemin :** `my-app/app/api/stripe/webhook/route.ts` — 105 lignes

```ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import stripe from '@/lib/stripe'
import pusherServer from '@/lib/pusher-server'

export const dynamic = 'force-dynamic'

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
        const { productId, buyerId, sellerId, offerId, finalPrice } = pi.metadata

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
```

### Client Stripe

**Chemin :** `my-app/lib/stripe.ts` — 8 lignes

```ts
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia' as any,
})

export default stripe
```

### Onboarding Stripe Connect

**Chemin :** `my-app/app/api/stripe/onboarding/route.ts` — 83 lignes

```ts
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import stripe from '@/lib/stripe'
import { getSession } from '@/lib/getSession'

export async function POST() {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const userId = Number(session.user.id)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, stripeAccountId: true, stripeOnboarded: true },
    })
    if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

    // Réutilise le compte existant si déjà créé
    let accountId = user.stripeAccountId
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        capabilities: { transfers: { requested: true } },
      })
      accountId = account.id
      await prisma.user.update({
        where: { id: userId },
        data: { stripeAccountId: accountId },
      })
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXTAUTH_URL}/profile/seller-onboarding?refresh=1`,
      return_url: `${process.env.NEXTAUTH_URL}/profile/seller-onboarding?success=1`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (err: any) {
    console.error('[stripe/onboarding]', err)
    return NextResponse.json({ error: err.message ?? 'Erreur Stripe' }, { status: 500 })
  }
}

// Appelé depuis le return_url pour finaliser l'onboarding
export async function GET() {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const userId = Number(session.user.id)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeAccountId: true },
    })
    if (!user?.stripeAccountId) {
      return NextResponse.json({ onboarded: false })
    }

    const account = await stripe.accounts.retrieve(user.stripeAccountId)
    const onboarded = account.details_submitted && account.charges_enabled

    if (onboarded) {
      await prisma.user.update({
        where: { id: userId },
        data: { stripeOnboarded: true },
      })
    }

    return NextResponse.json({ onboarded })
  } catch (err: any) {
    console.error('[stripe/onboarding GET]', err)
    return NextResponse.json({ error: err.message ?? 'Erreur Stripe' }, { status: 500 })
  }
}
```

---

## 4. Authentification et sécurité

### Configuration NextAuth v5

**Chemin :** `my-app/lib/auth.ts` — 143 lignes

```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import prisma from "@/lib/db"; // Assurez-vous d'importer correctement votre client Prisma
import { compare } from "bcryptjs"; // Si vous utilisez bcrypt pour hacher les mots de passe

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),

    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        try {
          const user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              password: true,
              suspended: true,
            },
          });

          if (!user) {
            console.error("[auth] User not found:", email);
            return null;
          }
          if (user.suspended) {
            console.error("[auth] User is suspended:", email);
            return null;
          }
          if (!user.password) {
            console.error("[auth] User has no password (OAuth account):", email);
            return null;
          }

          const isMatched = await compare(password, user.password);
          if (!isMatched) {
            console.error("[auth] Wrong password for:", email);
            return null;
          }

          return {
            id: user.id.toString(),
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          };
        } catch (err) {
          console.error("[auth] authorize error:", err);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const { email, name, image, id } = user;

          if (!email) {
            console.error("Email is required");
            return false; // Échec de la connexion
          }

          const existingUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true, suspended: true },
          });

          if (existingUser?.suspended) return false;

          if (!existingUser) {
            // Créez un nouvel utilisateur sans mot de passe
            await prisma.user.create({
              data: {
                email,
                firstName: name?.split(" ")[0] || "",
                lastName: name?.split(" ")[1] || "",
                image: image || "",
                authProviderId: id,
              },
            });
          }

          return true; // Connexion réussie
        } catch (error) {
          console.error("Error while creating user:", error);
          return false; // Connexion échouée
        }
      }

      if (account?.provider === "credentials") {
        return true; // Connexion réussie pour les credentials (géré ailleurs dans authorize)
      }

      return false; // Connexion échouée pour les autres fournisseurs
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub; // Ajoute l'ID utilisateur dans la session
      }
      return session;
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: {
    strategy: "jwt",
  },

  debug: process.env.NODE_ENV === "development",
});
```

### Récupération de session

**Chemin :** `my-app/lib/getSession.ts` — 21 lignes

```ts
import { auth } from '@/lib/auth';

export const getSession = async () => {
  try {
    console.log('Tentative de récupération de la session...');
    const session = await auth(); // Appelle la fonction d'auth pour obtenir la session
    
    // Vérifie si la session existe après l'appel
    if (!session) {
      console.log('Aucune session trouvée');
    } else {
      console.log('Session trouvée:', session); // Log de la session pour voir l'ID utilisateur
    }

    return session;
  } catch (error) {
    console.error('Erreur lors de la récupération de la session:', error);
    return null;
  }
};
```

### Middleware de protection des pages /admin

**Chemin :** `my-app/middleware.ts` — 20 lignes

```ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const token = request.cookies.get('admin_token')?.value
    if (!token || token !== process.env.ADMIN_TOKEN) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
```

### Connexion administrateur (pose du cookie)

**Chemin :** `my-app/app/api/admin/auth/route.ts` — 41 lignes

```ts
import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { rateLimit } from '@/lib/rateLimit'

export async function POST(req: Request) {
  const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const key = `admin-login:${ip}`

  // 5 tentatives par 15 min, lockout 30 min après dépassement
  const limit = rateLimit(key, { limit: 5, windowMs: 15 * 60 * 1000, lockoutMs: 30 * 60 * 1000 })
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Trop de tentatives. Réessayez dans ${Math.ceil((limit.retryAfter ?? 0) / 60)} min.` },
      { status: 429 }
    )
  }

  const { password } = await req.json().catch(() => ({ password: '' }))

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    // Délai artificiel pour ralentir le brute force (500ms)
    await new Promise(r => setTimeout(r, 500))
    return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })
  }

  cookies().set('admin_token', process.env.ADMIN_TOKEN!, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  cookies().delete('admin_token')
  return NextResponse.json({ ok: true })
}
```

### Vérification de session administrateur (extrait)

**Chemin :** `my-app/lib/adminAuth.ts` — 17 lignes

```ts
import { cookies } from 'next/headers'
import { isValidAdminToken } from '@/lib/domain/access'

/**
 * Vérifie la session administrateur à partir du cookie httpOnly `admin_token`.
 *
 * Remplace la comparaison directe `cookies().get('admin_token')?.value !== process.env.ADMIN_TOKEN`
 * utilisée auparavant dans chaque route : celle-ci accordait l'accès lorsque
 * `ADMIN_TOKEN` était absent de l'environnement, `undefined !== undefined`
 * valant `false`. Le middleware ne protégeant que les PAGES `/admin/*`
 * (matcher `/admin/:path*`), les routes `/api/admin/*` étaient alors
 * entièrement exposées.
 */
export function isAdminRequest(): boolean {
  return isValidAdminToken(cookies().get('admin_token')?.value, process.env.ADMIN_TOKEN)
}
```

### Limitation de débit en mémoire

**Chemin :** `my-app/lib/rateLimit.ts` — 36 lignes

```ts
interface Entry {
  count: number
  resetAt: number
  lockedUntil?: number
}

const store = new Map<string, Entry>()

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number; lockoutMs?: number }
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const { limit, windowMs, lockoutMs } = opts

  let entry = store.get(key)

  if (entry?.lockedUntil && now < entry.lockedUntil) {
    return { allowed: false, retryAfter: Math.ceil((entry.lockedUntil - now) / 1000) }
  }

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }

  entry.count++

  if (entry.count > limit) {
    if (lockoutMs) entry.lockedUntil = now + lockoutMs
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }

  return { allowed: true }
}
```

### Journalisation des actions admin

**Chemin :** `my-app/lib/adminLog.ts` — 10 lignes

```ts
import prisma from '@/lib/db'

export async function logAdmin(action: string, target?: string, details?: string) {
  try {
    await prisma.adminLog.create({ data: { action, target, details } })
  } catch {
    // non-blocking
  }
}
```

---

## 5. Accès aux données

### Client Prisma (singleton)

**Chemin :** `my-app/lib/db.ts` — 24 lignes

```ts
import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma

export const getProductById = async (id: number) => {
  // Remplacez ceci par votre logique réelle pour interroger la base de données
  // Par exemple, si vous utilisez Prisma, vous pourriez avoir quelque chose comme :
  const product = await prisma.product.findUnique({
    where: { id: Number(id) },
  });
  return product;
};
```

### Liste publique des annonces — GET

**Chemin :** `my-app/app/api/products/route.ts` — 37 lignes

```ts
import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic'
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const cat = searchParams.get('cat');
    const q = searchParams.get('q');

    const products = await prisma.product.findMany({
      where: {
        status: { not: 'sold' },
        suspended: false,
        ...(cat ? { category: cat as any } : {}),
        ...(q ? {
          OR: [
            { title:       { contains: q, mode: 'insensitive' } },
            { brand:       { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        } : {}),
      },
      include: {
        user: { select: { firstName: true, image: true } },
        images: { select: { url: true, altText: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(products, { status: 200 });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
```

### Création / suppression d'annonce — POST, DELETE

**Chemin :** `my-app/app/api/items/route.ts` — 110 lignes

```ts
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db'; // Import de votre instance Prisma
import { getSession } from '@/lib/getSession'; // Suppose que vous avez une fonction pour obtenir la session
import { validateProductInput, MAX_IMAGES } from '@/lib/domain/products';

export async function POST(req: NextRequest) {
  try {
    // Récupérer la session utilisateur
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const formData = await req.formData();
    const photos = formData.getAll('photos') as File[];

    // Validation serveur des champs de l'annonce (titre, prix, énumérations).
    const validation = validateProductInput({
      title: formData.get('title'),
      price: formData.get('price'),
      condition: formData.get('condition'),
      category: formData.get('category'),
      description: formData.get('description'),
      brand: formData.get('brand'),
      size: formData.get('size'),
    });

    if (!validation.ok) {
      return NextResponse.json({ error: 'Données invalides', details: validation.errors }, { status: 400 });
    }

    const { title, brand, price, size, condition, category, description } = validation.value!;


    // convert photos to base64 (limitées au maximum autorisé côté formulaire)
    const photosBase64 = await Promise.all(photos.slice(0, MAX_IMAGES).map(async (photo) => {
      const buffer = await photo.arrayBuffer();
      return Buffer.from(buffer).toString('base64');
    }));

    // Creating the product
    const product = await prisma.product.create({
      data: {
      title,
      brand,
      price,
      size,
      condition,
      category,
      description,
      userId: Number(session.user.id),
      images: {
        createMany: {
        data: photosBase64.map((photo) => {
          return { url: 'data:image/jpeg;base64,' + photo };
        }),
        },
      },
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}


export async function DELETE(req: NextRequest) { 
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await req.json();

    // Vérifie si le produit existe et appartient à l'utilisateur
    const product = await prisma.product.findUnique({
      where: { id: Number(id) },
      include: {
        images: true, // Inclut les images associées au produit
      },
    });

    if (!product || product.userId !== Number(session.user.id)) {
      return NextResponse.json({ error: 'Produit non trouvé ou non autorisé' }, { status: 404 });
    }

    // Supprime les images associées au produit
    await prisma.productImage.deleteMany({
      where: { productId: Number(id) },
    });

    // Supprime le produit
    await prisma.product.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ message: 'Produit et images supprimés' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Échec de la suppression du produit' }, { status: 500 });
  }
}


```

### Détail / modification / suppression — GET, PUT, DELETE

**Chemin :** `my-app/app/api/items/[id]/route.ts` — 103 lignes

```ts
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/getSession';
import prisma from '@/lib/db';
import { canModifyProduct } from '@/lib/domain/products';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const productId = parseInt(params.id, 10); // Vérifie que l'ID est récupéré correctement

  if (isNaN(productId)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
  }

  try {
    // Contrôle d'accès : seul le propriétaire de l'annonce peut la supprimer.
    const session = await getSession();
    const currentUserId = session?.user?.id ? Number(session.user.id) : null;
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { userId: true },
    });

    const authorization = canModifyProduct(product, currentUserId);
    if (!authorization.allowed) {
      return NextResponse.json({ error: authorization.error }, { status: authorization.status });
    }

    const deletedProduct = await prisma.product.delete({
      where: { id: productId },
    });

    return NextResponse.json({ message: 'Produit supprimé avec succès', product: deletedProduct });
  } catch (error) {
    console.error('Erreur lors de la suppression du produit:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression du produit' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id, title, description, price, images, size } = await req.json();

    console.log('Data received for update:', { id, title, description, price, images });

    // Mettez à jour le produit avec les nouvelles données
    const updatedProduct = await prisma.product.update({
      where: { id: Number(id), userId: Number(session.user.id) },
      data: {
        title,
        description,
        price,
        size, // Ensure 'size' is included in the destructured object from req.json()
        images: {
          deleteMany: {}, // Supprimez les images existantes si nécessaire
          create: images.map((image: string) => ({ url: image })),
        },
      },
    });

    console.log('Updated Product:', updatedProduct);
    return NextResponse.json(updatedProduct, { status: 200 });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Récupérer la session utilisateur
    const session = await getSession();
    const productId = Number(params.id);

    // Récupérer le produit en fonction de l'ID
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        images: true, // Inclure les images associées au produit
        // Tu peux ajouter d'autres relations si nécessaire
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Produit non trouvé' }, { status: 404 });
    }

    // Vérifier si l'utilisateur est connecté et si le produit lui appartient
    if (session?.user?.id && product.userId !== Number(session.user.id)) {
      return NextResponse.json({ error: 'Produit non autorisé' }, { status: 403 });
    }

    return NextResponse.json(product, { status: 200 });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Échec de la récupération du produit' }, { status: 500 });
  }
}
```

### Signalements — POST

**Chemin :** `my-app/app/api/reports/route.ts` — 40 lignes

```ts
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/getSession'
import { rateLimit } from '@/lib/rateLimit'

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session?.user?.id) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // 5 signalements par heure par utilisateur
    const limit = rateLimit(`reports:user:${session.user.id}`, { limit: 5, windowMs: 60 * 60 * 1000 })
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `Limite atteinte. Vous pouvez signaler à nouveau dans ${Math.ceil((limit.retryAfter ?? 0) / 60)} min.` },
        { status: 429 }
      )
    }

    const { reason, details, productId, reportedUserId } = await req.json()
    if (!reason) return NextResponse.json({ error: 'Raison requise' }, { status: 400 })
    if (!productId && !reportedUserId) return NextResponse.json({ error: 'Cible manquante' }, { status: 400 })

    const report = await prisma.report.create({
      data: {
        reporterId: Number(session.user.id),
        reason,
        details: details ?? null,
        productId: productId ? Number(productId) : null,
        reportedUserId: reportedUserId ? Number(reportedUserId) : null,
      },
    })

    return NextResponse.json(report)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
```

---

## 6. Temps réel (Pusher)

### Configuration serveur

**Chemin :** `my-app/lib/pusher-server.ts` — 12 lignes

```ts
import Pusher from 'pusher'

const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
})

export default pusherServer
```

### Configuration client

**Chemin :** `my-app/lib/pusher-client.ts` — 16 lignes

```ts
import PusherJs from 'pusher-js'

let pusherClient: PusherJs | null = null

export function getPusherClient(): PusherJs {
  if (!pusherClient && typeof window !== 'undefined') {
    pusherClient = new PusherJs(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: '/api/pusher/auth',
    })
  }
  return pusherClient!
}

export default getPusherClient
```

### Authentification des canaux privés — POST

**Chemin :** `my-app/app/api/pusher/auth/route.ts` — 38 lignes

```ts
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import pusherServer from '@/lib/pusher-server'
import { getSession } from '@/lib/getSession'
import prisma from '@/lib/db'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const body = await req.text()
  const params = new URLSearchParams(body)
  const socketId = params.get('socket_id')!
  const channelName = params.get('channel_name')!

  if (channelName.startsWith('private-conversation-')) {
    const conversationId = parseInt(channelName.replace('private-conversation-', ''))
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, participants: { some: { id: user.id } } },
    })
    if (!conversation) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } else if (channelName.startsWith('private-user-')) {
    const channelUserId = parseInt(channelName.replace('private-user-', ''))
    if (channelUserId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const authResponse = pusherServer.authorizeChannel(socketId, channelName)
  return NextResponse.json(authResponse)
}
```

### Envoi d'un message — POST

**Chemin :** `my-app/app/api/conversations/[id]/messages/route.ts` — 66 lignes

```ts
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/getSession'
import pusherServer from '@/lib/pusher-server'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, firstName: true, lastName: true, image: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const conversationId = parseInt(params.id)
  const { content, productId } = await req.json()

  if (!content?.trim()) return NextResponse.json({ error: 'Empty message' }, { status: 400 })

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      participants: { some: { id: user.id } },
    },
  })
  if (!conversation) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const message = await prisma.message.create({
    data: {
      content: content.trim(),
      userId: user.id,
      conversationId,
      productId,
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, image: true } },
      product: { select: { id: true, title: true } },
    },
  })

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  })

  const fullConv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { participants: { select: { id: true } } },
  })
  const recipientIds = fullConv?.participants.map(p => p.id).filter(id => id !== user.id) ?? []

  await pusherServer.trigger(`private-conversation-${conversationId}`, 'new-message', message)

  if (recipientIds.length > 0) {
    await pusherServer.trigger(
      recipientIds.map(id => `private-user-${id}`),
      'new-conversation-message',
      { conversationId, message }
    )
  }

  return NextResponse.json(message)
}
```

---

## 7. Interface utilisateur

### Formulaire multi-étapes de création d'annonce

**Chemin :** `my-app/components/items/add-item.tsx` — 677 lignes

```tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ImagePlus, X, ArrowLeft, Check, Search, Pencil,
  Layers, Settings, Circle, ShoppingBag, Shirt, Wrench,
  Tag, Shield, Package,
} from "lucide-react";
import Image from "next/image";

// ─── Catégories principales ─────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'Deck',       label: 'Deck',        icon: Layers,      desc: 'Planche complète ou deck nu' },
  { value: 'Truck',      label: 'Truck',        icon: Settings,    desc: 'Trucks (paire ou à l\'unité)' },
  { value: 'Roue',       label: 'Roues',        icon: Circle,      desc: 'Roues de skate' },
  { value: 'Chaussure',  label: 'Chaussures',   icon: ShoppingBag, desc: 'Skate shoes, baskets' },
  { value: 'Vetement',   label: 'Vêtement',     icon: Shirt,       desc: 'T-shirt, hoodie, pantalon…' },
  { value: 'Accessoire', label: 'Accessoire',   icon: Wrench,      desc: 'Grip, roulements, casque…' },
]

// ─── Sous-catégories ────────────────────────────────────────────────────────

const SUBCATEGORIES: Record<string, { value: string; label: string }[]> = {
  Vetement: [
    { value: 'Tshirt',      label: 'T-shirt' },
    { value: 'Hoodie',      label: 'Hoodie / Sweat' },
    { value: 'Pull',        label: 'Pull' },
    { value: 'Veste',       label: 'Veste / Manteau' },
    { value: 'Pantalon',    label: 'Pantalon' },
    { value: 'Short',       label: 'Short' },
    { value: 'Casquette',   label: 'Casquette' },
    { value: 'Bonnet',      label: 'Bonnet' },
    { value: 'Chaussettes', label: 'Chaussettes' },
    { value: 'Autre',       label: 'Autre' },
  ],
  Accessoire: [
    { value: 'Grip',        label: 'Grip tape' },
    { value: 'Roulements',  label: 'Roulements' },
    { value: 'Casque',      label: 'Casque' },
    { value: 'Protection',  label: 'Protections (genoux, coudes…)' },
    { value: 'Outil',       label: 'Outil skate' },
    { value: 'Sac',         label: 'Sac à dos' },
    { value: 'Autre',       label: 'Autre accessoire' },
  ],
}

// ─── Marques par catégorie / sous-catégorie ──────────────────────────────────

const BRANDS: Record<string, string[]> = {
  Deck: [
    'Almost', 'Anti Hero', 'Baker', 'Birdhouse', 'Blind', 'Chocolate',
    'Creature', 'Deathwish', 'Element', 'Enjoi', 'Evisen', 'Flip',
    'Fucking Awesome', 'Girl', 'Globe', 'Isle', 'Jart', 'Krooked',
    'Magenta', 'Plan B', 'Polar Skate Co.', 'Powell Peralta', 'Primitive',
    'Quasi', 'Real', 'Santa Cruz', 'Thank You', 'Toy Machine', 'Voltage',
    'Welcome', 'Zero', 'Autre',
  ],
  Truck: [
    'Ace', 'Caliber', 'Crail', 'Destructo', 'Grind King', 'Independent',
    'Krux', 'Paris', 'Randal', 'Royal', 'Sabre', 'Tensor',
    'Theeve', 'Thunder', 'Venture', 'Autre',
  ],
  Roue: [
    'Autobahn', 'Bones', 'Chocolate', 'Clouds', 'Cult', 'Hawgs',
    'Hyper', 'OJ Wheels', 'Pig', 'Powell', 'Ricta', 'Sector 9',
    'Spitfire', 'Wayward', 'Autre',
  ],
  Chaussure: [
    'Adidas', 'Airwalk', 'Circa', 'Converse', 'DC Shoes', 'Dekline',
    'DVS', 'Emerica', 'Es Footwear', 'Etnies', 'Fallen', 'Globe',
    'Huf', 'Jordan', 'Lakai', 'Macbeth', 'New Balance Numeric',
    'Nike SB', 'Osiris', 'Puma', 'Reebok', 'Supra', 'Vans',
    'Vox', 'Autre',
  ],
  Vetement: [
    'Anti Hero', 'Brixton', 'Bronze 56k', 'Carhartt WIP', 'Chocolate',
    'Creature', 'Dickies', 'Element', 'Emerica', 'Etnies', 'Evisen',
    'Fucking Awesome', 'Gifted Hater', 'Girl', 'HUF', 'Independent',
    'Krooked', 'Magenta', 'Nike SB', 'Palace', 'Polar Skate Co.',
    'Primitive', 'Quasi', 'Rip N Dip', 'Ripndip', 'Santa Cruz',
    'Stüssy', 'Supreme', 'Thrasher', 'Theories', 'Toy Machine',
    'Vans', 'Volcom', 'Welcome', 'Autre',
  ],
  // Accessoires par sous-catégorie
  Grip: [
    'Black Magic', 'Bones', 'Diamond', 'Grizzly', 'Jessup', 'Mob',
    'Shake Junt', 'Venom', 'Autre',
  ],
  Roulements: [
    'Andale', 'Bones', 'Bronson', 'Independent', 'Shake Junt',
    'Spitfire', 'Tensor', 'Zealous', 'Autre',
  ],
  Casque: [
    'Bern', 'Nutcase', 'Pro-Tec', 'Sandbox', 'Smith', 'Triple 8', 'TSG', 'Autre',
  ],
  Protection: [
    'Bern', 'Pro-Tec', 'Triple 8', 'TSG', 'Demon', 'Anon', 'Autre',
  ],
  Outil: [
    'Independent', 'Lucky', 'Skate One', 'Tensor', 'Autre',
  ],
  Sac: [
    'Dakine', 'Element', 'Herschel', 'Jansport', 'Nike', 'Vans', 'Autre',
  ],
  Accessoire: [
    'Bones', 'Diamond', 'Grizzly', 'Independent', 'Mob', 'Shake Junt', 'Spitfire', 'Autre',
  ],
}

// ─── Tailles par catégorie / sous-catégorie ──────────────────────────────────

const SIZES: Record<string, string[]> = {
  Deck:       ['7.25"', '7.5"', '7.75"', '8.0"', '8.125"', '8.25"', '8.375"', '8.5"', '8.75"', '9.0"', '9.5"+'],
  Truck:      ['129 mm', '139 mm', '149 mm', '159 mm', '169 mm', '180 mm'],
  Roue:       ['48 mm', '49 mm', '50 mm', '51 mm', '52 mm', '53 mm', '54 mm', '55 mm', '56 mm', '58 mm', '60 mm+'],
  Chaussure:  ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48'],
  // Vêtements
  Tshirt:     ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
  Hoodie:     ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
  Pull:       ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  Veste:      ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  Pantalon:   ['28', '29', '30', '31', '32', '33', '34', '36', '38'],
  Short:      ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  Casquette:  ['Taille unique', 'S/M', 'L/XL'],
  Bonnet:     ['Taille unique'],
  Chaussettes:['36–39', '40–43', '44–47'],
  Vetement:   ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  // Accessoires
  Grip:       ['9"×33"', '10"×33"', '11"×33"'],
  Roulements: ['Standard (8 pcs)', 'Standard (4 pcs)'],
  Casque:     ['XS', 'S', 'M', 'L', 'XL'],
  Protection: ['XS/S', 'S/M', 'M/L', 'L/XL'],
  Outil:      ['Unique'],
  Sac:        ['Unique'],
  Autre:      ['Unique'],
  Accessoire: ['Unique'],
}

// ─── État ────────────────────────────────────────────────────────────────────

const CONDITIONS = [
  { value: 'Neuf',         label: 'Neuf',         desc: 'Jamais utilisé, emballage d\'origine' },
  { value: 'Comme_neuf',   label: 'Comme neuf',   desc: 'Très peu utilisé, aucun défaut visible' },
  { value: 'Bon_etat',     label: 'Bon état',     desc: 'Quelques traces d\'usure normales' },
  { value: 'Moyen_etat',   label: 'Moyen état',   desc: 'Usure visible mais fonctionnel' },
  { value: 'Mauvais_etat', label: 'Mauvais état', desc: 'Très usé, vendu pour pièces' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getBrands(category: string, subcat: string): string[] {
  if (category === 'Accessoire' && subcat && BRANDS[subcat]) return BRANDS[subcat]
  return BRANDS[category] ?? []
}

function getSizes(category: string, subcat: string): string[] {
  if (subcat && SIZES[subcat]) return SIZES[subcat]
  return SIZES[category] ?? ['Unique']
}

function hasSubcat(category: string) {
  return !!SUBCATEGORIES[category]
}

// ─── Composant ───────────────────────────────────────────────────────────────

type FormData = {
  category: string; subcat: string; brand: string;
  title: string; size: string; condition: string;
  price: string; description: string; photos: File[];
}

// Steps: 0=category 1=subcat 2=brand 3=details 4=condition+price 5=photos 6=review
const STEP_LABELS = ['Catégorie', 'Type', 'Marque', 'Détails', 'État & Prix', 'Photos', 'Récapitulatif']

export default function AddItem() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [brandSearch, setBrandSearch] = useState('')
  const [formData, setFormData] = useState<FormData>({
    category: '', subcat: '', brand: '', title: '',
    size: '', condition: '', price: '', description: '', photos: [],
  })

  const set = (field: keyof FormData, value: string | File[]) =>
    setFormData(prev => ({ ...prev, [field]: value }))

  // Skip step 1 if no subcategory for this category
  const next = () => {
    if (step === 0 && !hasSubcat(formData.category)) { setStep(2); return }
    if (step < 6) setStep(s => s + 1)
  }
  const prev = () => {
    if (step === 2 && !hasSubcat(formData.category)) { setStep(0); return }
    if (step > 0) setStep(s => s - 1)
  }

  const canNext = () => {
    if (step === 0) return !!formData.category
    if (step === 1) return !!formData.subcat
    if (step === 2) return !!formData.brand
    if (step === 3) return !!formData.title && !!formData.size
    if (step === 4) return !!formData.condition && !!formData.price
    if (step === 5) return formData.photos.length > 0
    return true
  }

  const brands = useMemo(() => {
    const all = getBrands(formData.category, formData.subcat)
    const q = brandSearch.trim().toLowerCase()
    return q ? all.filter(b => b.toLowerCase().includes(q)) : all
  }, [formData.category, formData.subcat, brandSearch])

  const sizes = getSizes(formData.category, formData.subcat)

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    set('photos', [...formData.photos, ...Array.from(e.target.files)].slice(0, 5))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('category', formData.category)
      fd.append('brand', formData.brand)
      fd.append('title', formData.title)
      fd.append('size', formData.size)
      fd.append('condition', formData.condition)
      fd.append('price', formData.price)
      fd.append('description', formData.description)
      formData.photos.forEach(p => fd.append('photos', p))
      const res = await fetch('/api/items', { method: 'POST', body: fd })
      if (!res.ok) throw new Error()
      setSuccess(true)
      setTimeout(() => router.push('/'), 2500)
    } catch {
      alert('Une erreur est survenue. Réessaie.')
    } finally {
      setSubmitting(false)
    }
  }

  // Effective steps to show in progress bar (skip step 1 if no subcat)
  const totalSteps = hasSubcat(formData.category) || step <= 0 ? 7 : 6
  const effectiveStep = step === 0 ? 0 : (hasSubcat(formData.category) ? step : step - 1)

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: 'var(--acid)' }}>
          <Check className="h-8 w-8" style={{ color: 'var(--ink)' }} />
        </div>
        <h2 className="font-display text-2xl font-bold">Annonce publiée !</h2>
        <p className="text-muted-foreground text-sm">Redirection vers l'accueil…</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl px-4 sm:px-6 py-12">

      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight mb-1">Publier une annonce</h1>
        <p className="text-sm text-muted-foreground">
          {STEP_LABELS[step]} — étape {effectiveStep + 1}/{totalSteps}
        </p>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1 mb-8">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i <= effectiveStep ? 'bg-foreground' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* ── STEP 0 : Catégorie ── */}
      {step === 0 && (
        <div className="space-y-2.5">
          <p className="font-semibold mb-4">Qu'est-ce que tu vends ?</p>
          {CATEGORIES.map(cat => {
            const Icon = cat.icon
            return (
              <button
                key={cat.value}
                onClick={() => { set('category', cat.value); set('subcat', ''); set('brand', ''); set('size', '') }}
                className={`w-full flex items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-150 cursor-pointer ${
                  formData.category === cat.value
                    ? 'border-foreground bg-foreground/5'
                    : 'border-border hover:border-foreground/30 hover:bg-muted/40'
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0 transition-colors duration-150 ${
                  formData.category === cat.value ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{cat.label}</p>
                  <p className="text-xs text-muted-foreground">{cat.desc}</p>
                </div>
                {formData.category === cat.value && <Check className="h-4 w-4 text-foreground flex-shrink-0" />}
              </button>
            )
          })}
        </div>
      )}

      {/* ── STEP 1 : Sous-catégorie ── */}
      {step === 1 && formData.category && SUBCATEGORIES[formData.category] && (
        <div>
          <p className="font-semibold mb-4">
            Quel type de {CATEGORIES.find(c => c.value === formData.category)?.label.toLowerCase()} ?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {SUBCATEGORIES[formData.category].map(sub => (
              <button
                key={sub.value}
                onClick={() => { set('subcat', sub.value); set('brand', ''); set('size', '') }}
                className={`rounded-2xl border px-4 py-3.5 text-sm font-medium text-left transition-all duration-150 cursor-pointer ${
                  formData.subcat === sub.value
                    ? 'border-foreground bg-foreground/5 text-foreground'
                    : 'border-border hover:border-foreground/30 hover:bg-muted/40'
                }`}
              >
                {sub.label}
                {formData.subcat === sub.value && <Check className="h-3.5 w-3.5 inline ml-2" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 2 : Marque ── */}
      {step === 2 && (
        <div>
          <p className="font-semibold mb-4">Quelle est la marque ?</p>

          {/* Search bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={brandSearch}
              onChange={e => setBrandSearch(e.target.value)}
              placeholder="Rechercher une marque…"
              className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/15 transition-shadow"
            />
            {brandSearch && (
              <button onClick={() => setBrandSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Brand grid - scrollable */}
          <div className="max-h-72 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-2">
              {brands.length === 0 ? (
                <p className="col-span-2 text-center py-6 text-sm text-muted-foreground">Aucun résultat</p>
              ) : brands.map(brand => (
                <button
                  key={brand}
                  onClick={() => set('brand', brand)}
                  className={`rounded-xl border px-4 py-3 text-sm font-medium text-left transition-all duration-150 cursor-pointer ${
                    formData.brand === brand
                      ? 'border-foreground bg-foreground/5 text-foreground'
                      : 'border-border hover:border-foreground/30 hover:bg-muted/40'
                  }`}
                >
                  {brand}
                  {formData.brand === brand && <Check className="h-3.5 w-3.5 inline ml-1.5" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3 : Titre + Taille ── */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="title">Titre de l'annonce</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={e => set('title', e.target.value)}
              placeholder={`Ex. : ${formData.brand} ${SUBCATEGORIES[formData.category]?.find(s => s.value === formData.subcat)?.label ?? CATEGORIES.find(c => c.value === formData.category)?.label ?? ''} — bon état`}
            />
            <p className="text-xs text-muted-foreground">Sois précis : marque, modèle, couleur, état.</p>
          </div>

          <div className="space-y-2">
            <Label>Taille</Label>
            <div className="flex flex-wrap gap-2">
              {sizes.map(size => (
                <button
                  key={size}
                  onClick={() => set('size', size)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all duration-150 cursor-pointer ${
                    formData.size === size
                      ? 'border-foreground bg-foreground/5 text-foreground'
                      : 'border-border hover:border-foreground/30'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4 : État + Prix ── */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>État de l'article</Label>
            {CONDITIONS.map(c => (
              <button
                key={c.value}
                onClick={() => set('condition', c.value)}
                className={`w-full flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-150 cursor-pointer ${
                  formData.condition === c.value
                    ? 'border-foreground bg-foreground/5'
                    : 'border-border hover:border-foreground/30 hover:bg-muted/40'
                }`}
              >
                {formData.condition === c.value
                  ? <Check className="h-4 w-4 text-foreground mt-0.5 flex-shrink-0" />
                  : <div className="h-4 w-4 rounded-full border border-muted-foreground mt-0.5 flex-shrink-0" />
                }
                <div>
                  <p className="text-sm font-semibold">{c.label}</p>
                  <p className="text-xs text-muted-foreground">{c.desc}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="price">Prix</Label>
            <div className="relative max-w-xs">
              <Input
                id="price"
                type="number"
                min="1"
                value={formData.price}
                onChange={e => set('price', e.target.value)}
                placeholder="0"
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">€</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">Description <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
            <textarea
              id="desc"
              value={formData.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Décris l'article : couleur, état détaillé, raison de la vente…"
              rows={3}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/15 resize-none transition-shadow"
            />
          </div>
        </div>
      )}

      {/* ── STEP 5 : Photos ── */}
      {step === 5 && (
        <div className="space-y-4">
          <div>
            <p className="font-semibold">Photos de l'article</p>
            <p className="text-sm text-muted-foreground mt-0.5">Minimum 1, maximum 5. La première sera la photo principale.</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {formData.photos.map((photo, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border">
                <Image src={URL.createObjectURL(photo)} alt="" fill className="object-cover" />
                <button
                  onClick={() => set('photos', formData.photos.filter((_, idx) => idx !== i))}
                  className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white cursor-pointer hover:bg-black/80 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {formData.photos.length < 5 && (
              <label className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-foreground/50 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors duration-150">
                <ImagePlus className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Ajouter</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotos} />
              </label>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 6 : Récapitulatif ── */}
      {step === 6 && (() => {
        const condColor: Record<string, string> = {
          Neuf:         'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          Comme_neuf:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
          Bon_etat:     'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
          Moyen_etat:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
          Mauvais_etat: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        }
        const condLabel = CONDITIONS.find(c => c.value === formData.condition)?.label ?? ''
        const catLabel  = CATEGORIES.find(c => c.value === formData.category)?.label ?? ''
        const subcatLabel = formData.subcat
          ? SUBCATEGORIES[formData.category]?.find(s => s.value === formData.subcat)?.label
          : null
        const mainPhoto = formData.photos[0] ? URL.createObjectURL(formData.photos[0]) : null

        return (
          <div className="space-y-4">
            <div>
              <p className="font-semibold">Aperçu de ton annonce</p>
              <p className="text-xs text-muted-foreground mt-0.5">C'est ainsi qu'elle apparaîtra sur FlipIt.</p>
            </div>

            {/* Card preview */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">

              {/* Photo principale */}
              <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                {mainPhoto ? (
                  <Image src={mainPhoto} alt="" fill className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                    Aucune photo
                  </div>
                )}
                {/* Condition badge */}
                <span className={`absolute top-3 left-3 rounded-full px-2.5 py-0.5 text-xs font-semibold ${condColor[formData.condition] ?? 'bg-muted text-muted-foreground'}`}>
                  {condLabel}
                </span>
                {/* Photos count */}
                {formData.photos.length > 1 && (
                  <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-0.5 text-xs text-white font-medium">
                    {formData.photos.length} photos
                  </span>
                )}
              </div>

              {/* Infos */}
              <div className="divide-y divide-border">

                {/* Catégorie + marque */}
                <div className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-muted border border-border px-2.5 py-0.5 text-xs font-semibold text-foreground">
                      {catLabel}{subcatLabel ? ` · ${subcatLabel}` : ''}
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground border border-border">
                      {formData.brand}
                    </span>
                  </div>
                  <button
                    onClick={() => setStep(hasSubcat(formData.category) ? 1 : 0)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer ml-3 flex-shrink-0"
                  >
                    <Pencil className="h-3 w-3" /> Modifier
                  </button>
                </div>

                {/* Titre + prix */}
                <div className="flex items-start justify-between gap-3 px-5 py-3.5">
                  <div>
                    <p className="font-display text-base font-bold leading-snug">{formData.title || '—'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Taille {formData.size}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <p className="text-xl font-bold tabular-nums">{formData.price} €</p>
                    <button
                      onClick={() => setStep(3)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      <Pencil className="h-3 w-3" /> Modifier
                    </button>
                  </div>
                </div>

                {/* État + description */}
                <div className="flex items-start justify-between gap-3 px-5 py-3.5">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${condColor[formData.condition] ?? 'bg-muted text-muted-foreground'}`}>
                      {condLabel}
                    </span>
                    {formData.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{formData.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setStep(4)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex-shrink-0"
                  >
                    <Pencil className="h-3 w-3" /> Modifier
                  </button>
                </div>

                {/* Photos */}
                <div className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex gap-2 overflow-x-auto">
                    {formData.photos.map((p, i) => (
                      <div key={i} className="flex-shrink-0 h-12 w-12 rounded-lg overflow-hidden border border-border">
                        <Image src={URL.createObjectURL(p)} alt="" width={48} height={48} className="object-cover w-full h-full" />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setStep(5)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer ml-3 flex-shrink-0"
                  >
                    <Pencil className="h-3 w-3" /> Modifier
                  </button>
                </div>

              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Tu pourras modifier ou supprimer cette annonce depuis tes paramètres.
            </p>
          </div>
        )
      })()}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        <button
          onClick={prev}
          disabled={step === 0}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Précédent
        </button>

        {step < 6 ? (
          <Button
            onClick={next}
            disabled={!canNext()}
            className="cursor-pointer min-w-[120px] font-bold" style={{ background: 'var(--acid)', color: 'var(--ink)' }}
          >
            Continuer
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="cursor-pointer min-w-[150px] font-bold" style={{ background: 'var(--acid)', color: 'var(--ink)' }}
          >
            {submitting ? 'Publication…' : 'Publier l\'annonce'}
          </Button>
        )}
      </div>
    </div>
  )
}
```

### Fil de discussion temps réel

**Chemin :** `my-app/components/chat/MessageThread.tsx` — 632 lignes

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Send, ArrowLeft, ExternalLink, Tag, Check, X, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type MsgUser = { id: number; firstName: string; lastName: string; image: string | null }
type MsgProduct = { id: number; title: string; images: { url: string }[]; userId?: number }

type Message = {
  id: number
  content: string
  createdAt: string
  user: MsgUser
  product: MsgProduct | null
}

type Participant = { id: number; firstName: string; lastName: string; image: string | null }

type ConversationDetail = {
  id: number
  productId: number | null
  participants: Participant[]
  messages: Message[]
}

interface Props {
  conversationId: number
  currentUserId: number
  initialProductId?: number
  onBack?: () => void
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDateLabel(date: string) {
  const d = new Date(date)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui"
  if (d.toDateString() === yesterday.toDateString()) return 'Hier'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

function isSameGroup(a: Message, b: Message) {
  if (a.user.id !== b.user.id) return false
  return Math.abs(new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) < 5 * 60 * 1000
}

// ── Offer card ───────────────────────────────────────────────────────────────
function OfferCard({
  offerId, price, isMe, isSeller, fromSeller, productId,
}: {
  offerId: number
  price: number
  isMe: boolean
  isSeller: boolean
  fromSeller: boolean
  productId: number | null
}) {
  const [status, setStatus] = useState<'pending' | 'accepted' | 'rejected' | null>(null)
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState(false)
  const [respondError, setRespondError] = useState('')
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [timeLeft, setTimeLeft] = useState<string | null>(null)

  // Qui voit les boutons Accept/Décline ? L'autre partie (pas l'émetteur)
  const canRespond = fromSeller ? !isSeller : isSeller
  // Le bouton payer s'affiche à l'acheteur quand l'offre est acceptée et non expirée
  const isBuyer = !isSeller
  const canPay = isBuyer && status === 'accepted'

  const refetch = () => {
    fetch(`/api/offer/${offerId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setStatus(d.status)
          setExpiresAt(d.expiresAt ? new Date(d.expiresAt) : null)
        }
      })
  }

  useEffect(() => {
    fetch(`/api/offer/${offerId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setStatus(d.status)
          setExpiresAt(d.expiresAt ? new Date(d.expiresAt) : null)
        }
      })
      .finally(() => setLoading(false))

    const handler = (e: Event) => {
      const { offerId: id, status: s, expiresAt: exp } = (e as CustomEvent).detail
      if (id === offerId) {
        setStatus(s)
        setExpiresAt(exp ? new Date(exp) : null)
      } else if (s === 'accepted') {
        refetch()
      }
    }

    window.addEventListener('offer-status-changed', handler)
    window.addEventListener('offers-reset', refetch)
    return () => {
      window.removeEventListener('offer-status-changed', handler)
      window.removeEventListener('offers-reset', refetch)
    }
  }, [offerId])

  // Countdown ticker
  useEffect(() => {
    if (!expiresAt || status !== 'accepted') { setTimeLeft(null); return }
    const tick = () => {
      const diff = expiresAt.getTime() - Date.now()
      if (diff <= 0) { setStatus('rejected'); setTimeLeft(null); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setTimeLeft(h > 0 ? `${h}h ${m}min` : `${m}min`)
    }
    tick()
    const id = setInterval(tick, 60000)
    return () => clearInterval(id)
  }, [expiresAt, status])

  const respond = async (accepted: boolean) => {
    setResponding(true)
    setRespondError('')
    const res = await fetch('/api/offer/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: offerId, accepted }),
    })
    if (res.ok) {
      setStatus(accepted ? 'accepted' : 'rejected')
    } else {
      const data = await res.json().catch(() => ({}))
      setRespondError(data.error ?? 'Erreur')
    }
    setResponding(false)
  }

  const statusConfig = {
    pending:  { label: 'En attente',  bg: 'var(--paper-2)', border: 'var(--concrete-2)', dot: '#f59e0b' },
    accepted: { label: 'Acceptée',    bg: '#f0fdf4',        border: '#86efac',           dot: '#22c55e' },
    rejected: { label: 'Déclinée',    bg: '#fef2f2',        border: '#fca5a5',           dot: '#ef4444' },
  }
  const cfg = status ? statusConfig[status] : null

  const headerLabel = fromSeller
    ? (isMe ? 'Contre-offre envoyée' : 'Contre-offre reçue')
    : (isMe ? 'Offre envoyée' : 'Offre reçue')

  return (
    <div
      className="rounded-2xl overflow-hidden w-64"
      style={{ border: `1.5px solid ${cfg?.border ?? 'var(--concrete-2)'}` }}
    >
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-2" style={{ background: 'var(--ink)' }}>
        <Tag className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--acid)' }} />
        <span className="font-mono text-[10px] uppercase tracking-[.12em]" style={{ color: 'var(--acid)' }}>
          {headerLabel}
        </span>
      </div>

      {/* Price */}
      <div className="px-4 py-3" style={{ background: cfg?.bg ?? 'var(--paper-2)' }}>
        <div className="font-display font-extrabold" style={{ fontSize: 28, letterSpacing: '-.02em', color: 'var(--ink)' }}>
          {Number(price).toFixed(0)} €
        </div>
        {loading ? (
          <div className="h-3 w-20 bg-muted rounded animate-pulse mt-1" />
        ) : (
          <div className="flex flex-col gap-0.5 mt-1">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: cfg?.dot }} />
              <span className="font-mono text-[10px]" style={{ color: 'var(--concrete-4)' }}>
                {cfg?.label}
              </span>
            </div>
            {status === 'accepted' && timeLeft && (
              <span className="font-mono text-[10px]" style={{ color: '#f59e0b' }}>
                Expire dans {timeLeft}
              </span>
            )}
          </div>
        )}

        {/* Accept / Decline — only for the receiving party, only when pending */}
        {canRespond && status === 'pending' && !loading && (
          <>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => respond(true)}
                disabled={responding}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ background: 'var(--acid)', color: 'var(--ink)' }}
              >
                <Check className="h-3.5 w-3.5" /> Accepter
              </button>
              <button
                onClick={() => respond(false)}
                disabled={responding}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold cursor-pointer border hover:bg-muted transition-colors disabled:opacity-50"
                style={{ borderColor: 'var(--concrete-2)', color: 'var(--concrete-4)' }}
              >
                <X className="h-3.5 w-3.5" /> Décliner
              </button>
            </div>
            {respondError && (
              <p className="text-[10px] text-red-500 mt-1.5 font-mono">{respondError}</p>
            )}
          </>
        )}

        {/* Pay button — only for the buyer when offer is accepted */}
        {canPay && productId && !loading && (
          <Link
            href={`/payment?productId=${productId}&offerId=${offerId}`}
            className="mt-3 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold hover:opacity-90 transition-opacity"
            style={{ background: 'var(--ink)', color: 'var(--acid)' }}
          >
            <ShoppingBag className="h-3.5 w-3.5" /> Procéder au paiement
          </Link>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MessageThread({ conversationId, currentUserId, initialProductId, onBack }: Props) {
  const [conversation, setConversation] = useState<ConversationDetail | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [offerOpen, setOfferOpen] = useState(false)
  const [offerPrice, setOfferPrice] = useState('')
  const [offerSending, setOfferSending] = useState(false)
  const [offerError, setOfferError] = useState('')
  const [productOwnerId, setProductOwnerId] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const offerRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    setLoading(true)
    fetch(`/api/conversations/${conversationId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) { setConversation(data); setMessages(data.messages) }
      })
      .finally(() => setLoading(false))

    fetch(`/api/conversations/${conversationId}/read`, { method: 'POST' })
      .then(() => window.dispatchEvent(new CustomEvent('conversation-read')))
  }, [conversationId])

  useEffect(() => {
    let pusher: any, channel: any
    import('pusher-js').then(({ default: Pusher }) => {
      pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        authEndpoint: '/api/pusher/auth',
      })
      channel = pusher.subscribe(`private-conversation-${conversationId}`)
      channel.bind('new-message', (msg: Message) => {
        setMessages(prev => [...prev, msg])
        fetch(`/api/conversations/${conversationId}/read`, { method: 'POST' })
          .then(() => window.dispatchEvent(new CustomEvent('conversation-read')))
      })
      channel.bind('offer-updated', (data: { offerId: number; status: string }) => {
        window.dispatchEvent(new CustomEvent('offer-status-changed', { detail: data }))
      })
      channel.bind('offers-reset', () => {
        window.dispatchEvent(new CustomEvent('offers-reset'))
      })
    })
    return () => {
      try { channel?.unsubscribe() } catch (_) {}
      try { pusher?.disconnect() } catch (_) {}
    }
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: messages.length > 3 ? 'smooth' : 'instant' })
  }, [messages])

  useEffect(() => {
    if (offerOpen) setTimeout(() => offerRef.current?.focus(), 50)
  }, [offerOpen])

  const productId = messages[0]?.product?.id ?? conversation?.productId ?? initialProductId ?? null
  const other = conversation?.participants.find(p => p.id !== currentUserId)
  const product = messages.find(m => m.product)?.product ?? null

  // Fetch product owner reliably
  useEffect(() => {
    if (!productId) return
    fetch(`/api/article/${productId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.userId) setProductOwnerId(d.userId) })
  }, [productId])

  const isSeller = productOwnerId !== null && productOwnerId === currentUserId
  const isBuyer = productOwnerId !== null && productOwnerId !== currentUserId

  const handleSend = async () => {
    if (!input.trim() || !productId || sending) return
    setSending(true)
    const content = input.trim()
    setInput('')
    try {
      await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, productId }),
      })
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleSendOffer = async () => {
    const price = parseFloat(offerPrice)
    if (!price || price <= 0) { setOfferError('Prix invalide'); return }
    if (!productId) return
    setOfferSending(true)
    setOfferError('')
    try {
      // 1. Create the offer
      const offerRes = await fetch('/api/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerPrice: price, productId }),
      })
      if (!offerRes.ok) {
        const err = await offerRes.json()
        setOfferError(err.error ?? 'Erreur')
        return
      }
      const offer = await offerRes.json()

      // 2. Send as a special message so it appears in the thread
      await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `__OFFER__:${JSON.stringify({ offerId: offer.id, price, fromSeller: isSeller })}`,
          productId,
        }),
      })
      setOfferPrice('')
      setOfferOpen(false)
    } finally {
      setOfferSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
          <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            <div className="h-3 w-24 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="flex-1 px-6 py-4 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : ''}`}>
              <div className="h-10 w-48 rounded-3xl bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--paper)' }}>

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0" style={{ background: 'var(--paper)' }}>
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden p-1.5 -ml-1 rounded-full hover:bg-muted transition-colors cursor-pointer text-muted-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <button onClick={() => other && router.push(`/profile/${other.id}`)} className="cursor-pointer flex-shrink-0">
          <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm hover:opacity-80 transition-opacity">
            <AvatarImage src={other?.image ?? undefined} />
            <AvatarFallback className="bg-muted text-foreground font-bold text-sm">
              {other?.firstName?.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </button>
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <button
            onClick={() => other && router.push(`/profile/${other.id}`)}
            className="font-semibold text-sm leading-tight hover:opacity-70 transition-opacity cursor-pointer text-left w-fit"
          >
            {other ? `${other.firstName} ${other.lastName}` : '—'}
          </button>
          {product && (
            <Link
              href={`/article/${product.id}`}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="truncate max-w-[180px]">{product.title}</span>
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
            </Link>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          {other && (
            <Link
              href={`/profile/${other.id}`}
              className="text-xs font-medium px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors cursor-pointer"
            >
              Voir le profil
            </Link>
          )}
          {product && (
            <Link
              href={`/article/${product.id}`}
              className="text-xs font-medium px-3 py-1.5 rounded-full bg-muted border border-border hover:bg-muted/70 transition-colors cursor-pointer"
            >
              Voir l'annonce
            </Link>
          )}
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-12">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-1">
              <Send className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="font-semibold text-sm">Démarre la conversation</p>
            <p className="text-xs text-muted-foreground">Envoie ton premier message</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe = msg.user.id === currentUserId
          const prev = messages[i - 1] ?? null
          const next = messages[i + 1] ?? null
          const showDateSep = !prev || !isSameDay(prev.createdAt, msg.createdAt)

          // Parse offer messages
          const isOffer = msg.content.startsWith('__OFFER__:')
          let offerData: { offerId: number; price: number; fromSeller?: boolean } | null = null
          if (isOffer) {
            try { offerData = JSON.parse(msg.content.slice(10)) } catch (_) {}
          }

          const isGroupStart = !prev || !isSameGroup(prev, msg) || (messages[i - 1] && messages[i - 1].content.startsWith('__OFFER__:'))
          const isGroupEnd = !next || !isSameGroup(msg, next) || (messages[i + 1] && messages[i + 1].content.startsWith('__OFFER__:'))

          return (
            <div key={msg.id}>
              {showDateSep && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground font-medium px-2">
                    {formatDateLabel(msg.createdAt)}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}

              <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'} ${isGroupStart ? 'mt-3' : 'mt-0.5'}`}>
                {!isMe && (
                  <div className="w-7 flex-shrink-0">
                    {isGroupEnd ? (
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={msg.user.image ?? undefined} />
                        <AvatarFallback className="text-xs bg-muted font-medium">
                          {msg.user.firstName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    ) : null}
                  </div>
                )}

                <div className={`flex flex-col gap-0.5 max-w-[68%] ${isMe ? 'items-end' : 'items-start'}`}>
                  {isOffer && offerData ? (
                    <OfferCard
                      offerId={offerData.offerId}
                      price={offerData.price}
                      isMe={isMe}
                      isSeller={isSeller}
                      fromSeller={offerData.fromSeller ?? false}
                      productId={productId}
                    />
                  ) : (
                    <div
                      className={`px-4 py-2.5 text-sm leading-relaxed break-words ${
                        isMe
                          ? `bg-foreground text-background shadow-sm ${
                              isGroupStart && isGroupEnd ? 'rounded-3xl' :
                              isGroupStart ? 'rounded-3xl rounded-br-lg' :
                              isGroupEnd ? 'rounded-3xl rounded-tr-lg' :
                              'rounded-3xl rounded-r-lg'
                            }`
                          : `bg-muted text-foreground ${
                              isGroupStart && isGroupEnd ? 'rounded-3xl' :
                              isGroupStart ? 'rounded-3xl rounded-bl-lg' :
                              isGroupEnd ? 'rounded-3xl rounded-tl-lg' :
                              'rounded-3xl rounded-l-lg'
                            }`
                      }`}
                    >
                      {msg.content}
                    </div>
                  )}
                  {isGroupEnd && (
                    <span className="text-[11px] text-muted-foreground/70 px-1">
                      {formatTime(msg.createdAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Offer panel (slides up) ── */}
      {offerOpen && (
        <div
          className="flex-shrink-0 px-4 py-3 border-t"
          style={{ background: 'var(--paper-2)', borderColor: 'var(--concrete-2)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] uppercase tracking-[.12em]" style={{ color: 'var(--concrete-4)' }}>
              Proposer un prix
            </span>
            <button onClick={() => { setOfferOpen(false); setOfferError('') }} className="cursor-pointer" style={{ color: 'var(--concrete-3)' }}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm" style={{ color: 'var(--concrete-3)' }}>€</span>
              <input
                ref={offerRef}
                type="number"
                min="1"
                placeholder="0"
                value={offerPrice}
                onChange={e => { setOfferPrice(e.target.value); setOfferError('') }}
                onKeyDown={e => e.key === 'Enter' && handleSendOffer()}
                className="w-full rounded-xl border pl-8 pr-4 py-2.5 text-sm font-mono outline-none focus:border-foreground transition-colors"
                style={{ border: `1px solid ${offerError ? '#f87171' : 'var(--concrete-2)'}`, background: 'white' }}
              />
            </div>
            <button
              onClick={handleSendOffer}
              disabled={offerSending}
              className="rounded-xl px-5 py-2.5 text-sm font-bold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ background: 'var(--ink)', color: 'var(--acid)' }}
            >
              {offerSending ? '...' : 'Envoyer'}
            </button>
          </div>
          {offerError && <p className="text-red-500 text-xs mt-1.5">{offerError}</p>}
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-border flex-shrink-0" style={{ background: 'var(--paper)' }}>
        {/* Offer button — buyer or seller */}
        {(isBuyer || isSeller) && (
          <button
            onClick={() => setOfferOpen(v => !v)}
            title="Faire une offre"
            className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-all cursor-pointer flex-shrink-0 ${
              offerOpen ? 'border-foreground bg-foreground text-background' : 'border-border hover:bg-muted'
            }`}
          >
            <Tag className="h-4 w-4" />
          </button>
        )}
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Écris un message…"
            className="w-full rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-foreground/15 focus:border-foreground/20 transition-all placeholder:text-muted-foreground/60"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="flex h-11 w-11 items-center justify-center rounded-2xl active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex-shrink-0"
          style={{ background: 'var(--acid)', color: 'var(--ink)' }}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
```

### Grille d'annonces avec filtres

**Chemin :** `my-app/components/Articles/ArticleGrid.tsx` — 192 lignes

```tsx
'use client'

import React, { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import SkateArticleCard from './ArticleCard'

const CONDITIONS = [
  { value: 'all',          label: 'Tous' },
  { value: 'Neuf',         label: 'Neuf' },
  { value: 'Comme_neuf',   label: 'Comme neuf' },
  { value: 'Bon_etat',     label: 'Bon état' },
  { value: 'Moyen_etat',   label: 'Moyen état' },
  { value: 'Mauvais_etat', label: 'Mauvais état' },
]

function ArticleGridInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const urlCat = searchParams.get('cat') ?? ''
  const urlQ   = searchParams.get('q')   ?? ''

  const [articles, setArticles]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState(urlQ)
  const [condition, setCondition] = useState('all')
  const [shouldScroll, setShouldScroll] = useState(!!(urlCat || urlQ))

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (urlCat) params.set('cat', urlCat)
    fetch(`/api/products?${params}`)
      .then(r => r.ok ? r.json() : [])
      .then(setArticles)
      .catch(() => setArticles([]))
      .finally(() => setLoading(false))
  }, [urlCat])

  useEffect(() => {
    if (loading || !shouldScroll) return
    setShouldScroll(false)
    const el = document.getElementById('articles')
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - 80
    window.scrollTo({ top, behavior: 'smooth' })
  }, [loading, shouldScroll])

  useEffect(() => {
    if (urlCat || urlQ) setShouldScroll(true)
  }, [urlCat, urlQ])

  useEffect(() => {
    setSearch(urlQ)
  }, [urlQ])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return articles.filter(a => {
      const matchSearch    = !q || a.title?.toLowerCase().includes(q) || a.brand?.toLowerCase().includes(q)
      const matchCondition = condition === 'all' || a.condition === condition
      return matchSearch && matchCondition
    })
  }, [articles, search, condition])

  const updateSearch = (value: string) => {
    setSearch(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value.trim()) params.set('q', value.trim())
    else params.delete('q')
    router.replace(`/?${params}`, { scroll: false })
  }

  const reset = () => {
    setSearch('')
    setCondition('all')
    router.replace('/', { scroll: false })
  }

  const categoryLabel = urlCat
    ? { Deck: 'Decks', Truck: 'Trucks', Roue: 'Roues', Chaussure: 'Chaussures', Vetement: 'Vêtements', Accessoire: 'Accessoires' }[urlCat] ?? urlCat
    : null

  return (
    <section id="articles" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">

      {/* Header */}
      <div className="flex items-baseline justify-between mb-8">
        <div>
          <div
            className="font-mono text-[11px] uppercase tracking-[.14em] mb-2"
            style={{ color: 'var(--concrete-4)' }}
          >
            ↳ {categoryLabel ? categoryLabel.toUpperCase() : 'TOUT FRAIS'}
          </div>
          <h2
            className="font-display font-extrabold"
            style={{ fontSize: 40, letterSpacing: '-.025em', lineHeight: 1 }}
          >
            {categoryLabel ?? 'Drops du jour.'}
          </h2>
        </div>
        {!loading && (
          <span className="font-mono text-[11px]" style={{ color: 'var(--concrete-4)' }}>
            {filtered.length} article{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => updateSearch(e.target.value)}
            placeholder="Rechercher un article, une marque…"
            className="w-full rounded-lg border border-border bg-card pl-9 pr-9 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/15 transition-shadow placeholder:text-muted-foreground"
          />
          {search && (
            <button
              onClick={() => updateSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 flex-shrink-0">
          {CONDITIONS.map(c => (
            <button
              key={c.value}
              onClick={() => setCondition(c.value)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer border ${
                condition !== c.value ? 'border-border bg-card text-foreground/70 hover:text-foreground hover:border-foreground/30' : ''
              }`}
              style={
                condition === c.value
                  ? { background: 'var(--ink)', color: 'var(--paper)', borderColor: 'var(--ink)' }
                  : {}
              }
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-lg bg-muted animate-pulse aspect-[4/6]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-muted-foreground text-sm">Aucun article ne correspond à ta recherche.</p>
          <button onClick={reset} className="mt-3 text-sm font-semibold text-foreground underline underline-offset-2 hover:opacity-70 cursor-pointer">
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(product => (
            <SkateArticleCard key={product.id} {...product} user={product.user} />
          ))}
        </div>
      )}
    </section>
  )
}

export default function SkateArticleGrid() {
  return (
    <Suspense fallback={
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-lg bg-muted animate-pulse aspect-[4/6]" />
          ))}
        </div>
      </section>
    }>
      <ArticleGridInner />
    </Suspense>
  )
}
```

### Bouton de signalement

**Chemin :** `my-app/components/ReportButton.tsx` — 142 lignes

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Flag, X, RefreshCw, CheckCircle } from 'lucide-react'

const REASONS = [
  { value: 'fake',          label: 'Fausse description / arnaque' },
  { value: 'inappropriate', label: 'Contenu inapproprié' },
  { value: 'spam',          label: 'Spam / doublon' },
  { value: 'abusive_price', label: 'Prix abusif' },
  { value: 'fraud',         label: 'Utilisateur frauduleux' },
  { value: 'other',         label: 'Autre' },
]

interface Props {
  productId?: number
  reportedUserId?: number
  label?: string
}

function storageKey(productId?: number, reportedUserId?: number) {
  if (productId)       return `flipit_reported_product_${productId}`
  if (reportedUserId)  return `flipit_reported_user_${reportedUserId}`
  return null
}

export default function ReportButton({ productId, reportedUserId, label = 'Signaler' }: Props) {
  const router = useRouter()
  const [open, setOpen]       = useState(false)
  const [reason, setReason]   = useState('')
  const [details, setDetails] = useState('')
  const [loading, setLoading] = useState(false)
  const [alreadyReported, setAlreadyReported] = useState(false)

  useEffect(() => {
    const key = storageKey(productId, reportedUserId)
    if (key && localStorage.getItem(key)) setAlreadyReported(true)
  }, [productId, reportedUserId])

  const markReported = () => {
    const key = storageKey(productId, reportedUserId)
    if (key) localStorage.setItem(key, '1')
    setAlreadyReported(true)
    setOpen(false)
  }

  const submit = async () => {
    if (!reason) return
    setLoading(true)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, details, productId, reportedUserId }),
      })
      if (res.status === 401) {
        setOpen(false)
        router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`)
        return
      }
      markReported()
    } finally {
      setLoading(false)
    }
  }

  if (alreadyReported) {
    return (
      <div
        className="flex items-center gap-1.5 text-xs font-semibold"
        style={{ color: 'var(--concrete-3)' }}
      >
        <CheckCircle className="h-3.5 w-3.5" style={{ color: '#065f46' }} />
        Signalement envoyé
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer hover:opacity-70 transition-opacity"
        style={{ color: 'var(--concrete-3)' }}
      >
        <Flag className="h-3.5 w-3.5" />
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 px-4"
          style={{ background: 'rgba(10,10,10,.55)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ background: 'var(--snow)' }}>
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg" style={{ color: 'var(--ink)' }}>Signaler</h2>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 cursor-pointer hover:bg-black/5">
                <X className="h-4 w-4" style={{ color: 'var(--concrete-3)' }} />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--concrete-4)' }}>Raison</label>
              <select value={reason} onChange={e => setReason(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2"
                style={{ borderColor: 'rgba(0,0,0,.12)', background: 'var(--paper)', color: 'var(--ink)' }}>
                <option value="">Sélectionner…</option>
                {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--concrete-4)' }}>Détails (optionnel)</label>
              <textarea value={details} onChange={e => setDetails(e.target.value)} rows={3}
                placeholder="Décrivez le problème…"
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 resize-none"
                style={{ borderColor: 'rgba(0,0,0,.12)', background: 'var(--paper)', color: 'var(--ink)' }} />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setOpen(false)}
                className="flex-1 rounded-xl py-3 text-sm font-semibold border cursor-pointer hover:bg-black/5 transition-colors"
                style={{ borderColor: 'rgba(0,0,0,.12)', color: 'var(--concrete-4)' }}>
                Annuler
              </button>
              <button onClick={submit} disabled={!reason || loading}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40"
                style={{ background: '#ef4444', color: '#fff' }}>
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
                Signaler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

### Formulaire de paiement Stripe Elements

**Chemin :** `my-app/components/payment/StripePaymentForm.tsx` — 74 lignes

```tsx
'use client'

import { useState } from 'react'
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Lock } from 'lucide-react'

interface Props {
  onSuccess: () => void
}

export default function StripePaymentForm({ onSuccess }: Props) {
  const stripe = useStripe()
  const elements = useElements()
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setPaying(true)
    setError(null)

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/thank-you`,
      },
      redirect: 'if_required',
    })

    if (stripeError) {
      setError(stripeError.message ?? 'Erreur de paiement')
      setPaying(false)
      return
    }

    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement options={{ layout: 'tabs' }} />

      {error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2.5">{error}</p>
      )}

      <button
        type="submit"
        disabled={!stripe || paying}
        className="w-full rounded-xl py-4 text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer"
        style={{ background: 'var(--acid)', color: 'var(--ink)' }}
      >
        {paying ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            Traitement…
          </span>
        ) : (
          <>
            <Lock className="h-4 w-4" />
            Payer maintenant
          </>
        )}
      </button>

      <p className="text-center text-xs text-muted-foreground">
        Paiement sécurisé par Stripe · Vos données bancaires ne nous sont jamais transmises
      </p>
    </form>
  )
}
```

---

## 8. Logique métier extraite (refactoring) et tests associés

### Offres — logique pure

**Chemin :** `my-app/lib/domain/offers.ts` — 117 lignes

```ts
/**
 * Logique métier des offres de prix, extraite des routes API
 * (`/api/offer`, `/api/offer/[id]`, `/api/offer/status`) afin d'être
 * testable unitairement sans base de données ni réseau.
 */

export type OfferStatus = 'pending' | 'accepted' | 'rejected'

/** Fenêtre de paiement ouverte à l'acheteur après acceptation d'une offre. */
export const OFFER_PAYMENT_WINDOW_MS = 24 * 60 * 60 * 1000

export interface OfferInput {
  offerPrice: unknown
  productId: unknown
}

export interface ValidationResult<T> {
  ok: boolean
  error?: string
  value?: T
}

/**
 * Valide les données d'une demande de création d'offre.
 * Le prix doit être un nombre fini strictement positif, l'identifiant
 * produit un entier positif.
 */
export function validateOfferInput(input: OfferInput): ValidationResult<{
  offerPrice: number
  productId: number
}> {
  const { offerPrice, productId } = input

  if (offerPrice === null || offerPrice === undefined || offerPrice === '') {
    return { ok: false, error: 'Le montant de l\'offre est requis' }
  }
  if (productId === null || productId === undefined || productId === '') {
    return { ok: false, error: 'L\'identifiant du produit est requis' }
  }

  const price = typeof offerPrice === 'number' ? offerPrice : parseFloat(String(offerPrice))
  if (!Number.isFinite(price)) {
    return { ok: false, error: 'Le montant de l\'offre doit être un nombre' }
  }
  if (price <= 0) {
    return { ok: false, error: 'Le montant de l\'offre doit être strictement positif' }
  }

  const id = typeof productId === 'number' ? productId : parseInt(String(productId), 10)
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, error: 'Identifiant de produit invalide' }
  }

  return { ok: true, value: { offerPrice: price, productId: id } }
}

/** Date d'expiration de la fenêtre de paiement, à partir de l'instant d'acceptation. */
export function computeOfferExpiry(acceptedAt: Date): Date {
  return new Date(acceptedAt.getTime() + OFFER_PAYMENT_WINDOW_MS)
}

export interface ExpirableOffer {
  status: OfferStatus
  expiresAt: Date | null
}

/**
 * Une offre est expirée si elle a été acceptée, qu'une date d'expiration
 * existe et que celle-ci est strictement dépassée.
 */
export function isOfferExpired(offer: ExpirableOffer, now: Date): boolean {
  if (offer.status !== 'accepted') return false
  if (!offer.expiresAt) return false
  return offer.expiresAt < now
}

export interface RespondToOfferContext {
  offer: { id: number; status: OfferStatus; buyerId: number; productId: number }
  currentUserId: number
  isConversationParticipant: boolean
}

export interface AuthorizationResult {
  allowed: boolean
  status: number
  error?: string
}

/**
 * Détermine si l'utilisateur courant peut accepter ou refuser une offre.
 * Reproduit les garde-fous de `POST /api/offer/status`.
 */
export function canRespondToOffer(ctx: RespondToOfferContext): AuthorizationResult {
  const { offer, currentUserId, isConversationParticipant } = ctx

  if (offer.status !== 'pending') {
    return { allowed: false, status: 400, error: 'Cette offre a déjà été traitée' }
  }
  if (currentUserId === offer.buyerId) {
    return { allowed: false, status: 403, error: 'Impossible de répondre à sa propre offre' }
  }
  if (!isConversationParticipant) {
    return { allowed: false, status: 403, error: 'Non autorisé' }
  }
  return { allowed: true, status: 200 }
}

/** Statut résultant d'une réponse à une offre. */
export function resolveOfferDecision(accepted: boolean, now: Date): {
  status: OfferStatus
  expiresAt: Date | null
} {
  return accepted
    ? { status: 'accepted', expiresAt: computeOfferExpiry(now) }
    : { status: 'rejected', expiresAt: null }
}
```

### Commandes — machine à états

**Chemin :** `my-app/lib/domain/orders.ts` — 109 lignes

```ts
/**
 * Cycle de vie d'une commande, extrait des routes
 * `/api/orders/[id]/ship`, `/confirm`, `/dispute` et du cron
 * `/api/cron/auto-confirm`, afin d'être testable sans base ni Stripe.
 */

export type OrderStatus = 'paid' | 'shipped' | 'confirmed' | 'disputed' | 'refunded'

/** Délai laissé à l'acheteur pour confirmer la réception après expédition. */
export const ORDER_CONFIRM_WINDOW_MS = 48 * 60 * 60 * 1000

/**
 * Transitions autorisées de la machine à états d'une commande.
 * `confirmed` et `refunded` sont des états terminaux.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  paid: ['shipped', 'disputed', 'refunded'],
  shipped: ['confirmed', 'disputed'],
  disputed: ['refunded', 'confirmed'],
  confirmed: [],
  refunded: [],
}

/** Vrai si le passage de `from` vers `to` est permis. */
export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false
}

/** Échéance de confirmation automatique, calculée à l'expédition. */
export function computeConfirmDeadline(shippedAt: Date): Date {
  return new Date(shippedAt.getTime() + ORDER_CONFIRM_WINDOW_MS)
}

export interface OrderActor {
  buyerId: number
  sellerId: number
  status: OrderStatus
}

export interface AuthorizationResult {
  allowed: boolean
  status: number
  error?: string
}

/** Seul le vendeur peut marquer une commande `paid` comme expédiée. */
export function canShipOrder(order: OrderActor, currentUserId: number): AuthorizationResult {
  if (order.sellerId !== currentUserId) {
    return { allowed: false, status: 403, error: 'Non autorisé' }
  }
  if (order.status !== 'paid') {
    return { allowed: false, status: 400, error: "La commande n'est pas en attente d'expédition" }
  }
  return { allowed: true, status: 200 }
}

/** Seul l'acheteur peut confirmer la réception d'une commande `shipped`. */
export function canConfirmOrder(order: OrderActor, currentUserId: number): AuthorizationResult {
  if (order.buyerId !== currentUserId) {
    return { allowed: false, status: 403, error: 'Non autorisé' }
  }
  if (order.status !== 'shipped') {
    return { allowed: false, status: 400, error: 'La commande doit être expédiée avant confirmation' }
  }
  return { allowed: true, status: 200 }
}

/** Seul l'acheteur peut ouvrir un litige, sur une commande `paid` ou `shipped`. */
export function canDisputeOrder(order: OrderActor, currentUserId: number): AuthorizationResult {
  if (order.buyerId !== currentUserId) {
    return { allowed: false, status: 403, error: 'Non autorisé' }
  }
  if (!['paid', 'shipped'].includes(order.status)) {
    return { allowed: false, status: 400, error: 'Impossible de disputer une commande dans cet état' }
  }
  return { allowed: true, status: 200 }
}

export interface AutoConfirmableOrder {
  id: number
  status: OrderStatus
  confirmDeadline: Date | null
  seller: { stripeAccountId: string | null }
}

/**
 * Une commande est auto-confirmable si elle est expédiée, que son échéance
 * est atteinte et que le vendeur dispose d'un compte Stripe destinataire.
 */
export function isAutoConfirmable(order: AutoConfirmableOrder, now: Date): boolean {
  if (order.status !== 'shipped') return false
  if (!order.confirmDeadline) return false
  if (order.confirmDeadline > now) return false
  return Boolean(order.seller.stripeAccountId)
}

/** Sous-ensemble des commandes que le cron doit confirmer automatiquement. */
export function selectAutoConfirmable<T extends AutoConfirmableOrder>(orders: T[], now: Date): T[] {
  return orders.filter(order => isAutoConfirmable(order, now))
}

/** Numéro de suivi déterministe hors partie aléatoire (testable). */
export function formatTrackingNumber(orderId: number, shippedAt: Date, suffix: string): string {
  const y = shippedAt.getFullYear()
  const m = String(shippedAt.getMonth() + 1).padStart(2, '0')
  const d = String(shippedAt.getDate()).padStart(2, '0')
  return `FLT-${y}${m}${d}-${orderId.toString().padStart(5, '0')}-${suffix}`
}
```

### Annonces — validation et propriété

**Chemin :** `my-app/lib/domain/products.ts` — 137 lignes

```ts
/**
 * Validation des annonces et contrôle de propriété.
 * Les valeurs d'énumération reflètent `prisma/schema.prisma`
 * (enums `Condition` et `Category`).
 */

export const CONDITIONS = [
  'Neuf',
  'Comme_neuf',
  'Bon_etat',
  'Moyen_etat',
  'Mauvais_etat',
] as const

export const CATEGORIES = [
  'Deck',
  'Truck',
  'Roue',
  'Chaussure',
  'Vetement',
  'Accessoire',
] as const

export type Condition = (typeof CONDITIONS)[number]
export type Category = (typeof CATEGORIES)[number]

export const MAX_TITLE_LENGTH = 120
export const MAX_PRICE = 99_999.99
export const MAX_IMAGES = 5

export interface ProductInput {
  title?: unknown
  price?: unknown
  condition?: unknown
  category?: unknown
  description?: unknown
  brand?: unknown
  size?: unknown
}

export interface ProductValidationResult {
  ok: boolean
  errors: string[]
  value?: {
    title: string
    price: number
    condition: Condition
    category: Category | null
    description: string | null
    brand: string | null
    size: string | null
  }
}

export function isCondition(value: unknown): value is Condition {
  return typeof value === 'string' && (CONDITIONS as readonly string[]).includes(value)
}

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value)
}

/**
 * Valide les champs d'une annonce avant persistance.
 * `category` est optionnelle côté schéma Prisma : absente, elle est acceptée ;
 * présente mais hors énumération, elle est refusée.
 */
export function validateProductInput(input: ProductInput): ProductValidationResult {
  const errors: string[] = []

  const title = typeof input.title === 'string' ? input.title.trim() : ''
  if (!title) {
    errors.push('Le titre est requis')
  } else if (title.length > MAX_TITLE_LENGTH) {
    errors.push(`Le titre ne peut pas dépasser ${MAX_TITLE_LENGTH} caractères`)
  }

  const rawPrice = input.price
  let price = NaN
  if (rawPrice === null || rawPrice === undefined || rawPrice === '') {
    errors.push('Le prix est requis')
  } else {
    price = typeof rawPrice === 'number' ? rawPrice : parseFloat(String(rawPrice))
    if (!Number.isFinite(price)) {
      errors.push('Le prix doit être un nombre')
    } else if (price <= 0) {
      errors.push('Le prix doit être strictement positif')
    } else if (price > MAX_PRICE) {
      errors.push(`Le prix ne peut pas dépasser ${MAX_PRICE} €`)
    }
  }

  if (!isCondition(input.condition)) {
    errors.push('État invalide')
  }

  const hasCategory = input.category !== undefined && input.category !== null && input.category !== ''
  if (hasCategory && !isCategory(input.category)) {
    errors.push('Catégorie invalide')
  }

  if (errors.length > 0) return { ok: false, errors }

  return {
    ok: true,
    errors: [],
    value: {
      title,
      price,
      condition: input.condition as Condition,
      category: hasCategory ? (input.category as Category) : null,
      description: typeof input.description === 'string' && input.description.trim()
        ? input.description.trim()
        : null,
      brand: typeof input.brand === 'string' && input.brand.trim() ? input.brand.trim() : null,
      size: typeof input.size === 'string' && input.size.trim() ? input.size.trim() : null,
    },
  }
}

/** Seul le propriétaire d'une annonce peut la modifier ou la supprimer. */
export function canModifyProduct(
  product: { userId: number } | null,
  currentUserId: number | null
): { allowed: boolean; status: number; error?: string } {
  if (currentUserId === null || Number.isNaN(currentUserId)) {
    return { allowed: false, status: 401, error: 'Non authentifié' }
  }
  if (!product) {
    return { allowed: false, status: 404, error: 'Produit non trouvé' }
  }
  if (product.userId !== currentUserId) {
    return { allowed: false, status: 403, error: 'Non autorisé' }
  }
  return { allowed: true, status: 200 }
}
```

### Montants — commission et transferts

**Chemin :** `my-app/lib/domain/pricing.ts` — 76 lignes

```ts
/**
 * Calculs monétaires du tunnel de paiement, extraits de
 * `/api/stripe/payment-intent` et `/api/orders/[id]/confirm`.
 *
 * Convention : la commission plateforme est payée par l'acheteur EN SUS
 * du prix produit. Le vendeur perçoit le prix produit en entier.
 */

/** Taux de commission plateforme appliqué au prix produit. */
export const COMMISSION_RATE = 0.1

/** Frais de livraison appliqués par défaut si le client n'en fournit pas. */
export const DEFAULT_DELIVERY_COST = 4

export interface OrderAmounts {
  finalPrice: number
  deliveryCost: number
  commission: number
  total: number
  amountCents: number
}

/** Arrondi monétaire au centime. */
function roundCents(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Détaille le montant débité à l'acheteur.
 * @throws si le prix final n'est pas un nombre fini positif.
 */
export function computeOrderAmounts(
  finalPrice: number,
  deliveryCost: number = DEFAULT_DELIVERY_COST
): OrderAmounts {
  if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
    throw new Error('Prix final invalide')
  }
  const delivery = Number.isFinite(deliveryCost) && deliveryCost >= 0
    ? deliveryCost
    : DEFAULT_DELIVERY_COST

  const commission = roundCents(finalPrice * COMMISSION_RATE)
  const total = roundCents(finalPrice + delivery + commission)

  return {
    finalPrice,
    deliveryCost: delivery,
    commission,
    total,
    amountCents: Math.round(total * 100),
  }
}

/** Montant transféré au vendeur, en centimes : le prix produit entier. */
export function computeTransferAmountCents(finalPrice: number): number {
  if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
    throw new Error('Prix final invalide')
  }
  return Math.round(finalPrice * 100)
}

/**
 * Prix retenu pour la commande : le montant de l'offre si elle a bien été
 * acceptée, sinon le prix affiché du produit.
 */
export function resolveFinalPrice(
  productPrice: number,
  offer?: { offerPrice: number; status: string } | null
): number {
  if (offer && offer.status === 'accepted' && Number.isFinite(offer.offerPrice) && offer.offerPrice > 0) {
    return offer.offerPrice
  }
  return productPrice
}
```

### Contrôles d'accès admin et cron

**Chemin :** `my-app/lib/domain/access.ts` — 35 lignes

```ts
/**
 * Contrôles d'accès transverses : session admin et authentification du cron.
 *
 * Ces fonctions durcissent volontairement la comparaison naïve utilisée
 * dans les routes (`cookies().get('admin_token')?.value !== process.env.ADMIN_TOKEN`),
 * qui accorde l'accès lorsque le secret attendu est absent de
 * l'environnement : `undefined !== undefined` vaut `false`.
 */

/**
 * Vrai uniquement si un jeton attendu non vide est configuré ET que le jeton
 * présenté lui est identique.
 */
export function isValidAdminToken(
  presented: string | undefined | null,
  expected: string | undefined | null
): boolean {
  if (!expected) return false
  if (!presented) return false
  return presented === expected
}

/**
 * Vrai uniquement si l'en-tête `Authorization` porte exactement
 * `Bearer <CRON_SECRET>` et qu'un secret non vide est configuré.
 */
export function isCronAuthorized(
  authorizationHeader: string | undefined | null,
  secret: string | undefined | null
): boolean {
  if (!secret) return false
  if (!authorizationHeader) return false
  return authorizationHeader === `Bearer ${secret}`
}
```

### Tests — offres

**Chemin :** `my-app/tests/offers.test.ts` — 163 lignes

```ts
import { describe, it, expect } from 'vitest'
import {
  validateOfferInput,
  computeOfferExpiry,
  isOfferExpired,
  canRespondToOffer,
  resolveOfferDecision,
  OFFER_PAYMENT_WINDOW_MS,
} from '@/lib/domain/offers'

describe('validateOfferInput — création d\'une offre', () => {
  it('accepte un montant et un produit valides (cas nominal)', () => {
    const result = validateOfferInput({ offerPrice: 45.5, productId: 12 })
    expect(result.ok).toBe(true)
    expect(result.value).toEqual({ offerPrice: 45.5, productId: 12 })
  })

  it('accepte un montant transmis sous forme de chaîne', () => {
    const result = validateOfferInput({ offerPrice: '45.50', productId: '12' })
    expect(result.ok).toBe(true)
    expect(result.value?.offerPrice).toBe(45.5)
    expect(result.value?.productId).toBe(12)
  })

  it('accepte le plus petit montant significatif (limite basse)', () => {
    expect(validateOfferInput({ offerPrice: 0.01, productId: 1 }).ok).toBe(true)
  })

  it('refuse un montant négatif', () => {
    const result = validateOfferInput({ offerPrice: -10, productId: 12 })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/positif/)
  })

  it('refuse un montant nul', () => {
    const result = validateOfferInput({ offerPrice: 0, productId: 12 })
    expect(result.ok).toBe(false)
  })

  it('refuse un montant non numérique', () => {
    const result = validateOfferInput({ offerPrice: 'gratuit', productId: 12 })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/nombre/)
  })

  it('refuse un montant manquant', () => {
    expect(validateOfferInput({ offerPrice: undefined, productId: 12 }).ok).toBe(false)
    expect(validateOfferInput({ offerPrice: null, productId: 12 }).ok).toBe(false)
  })

  it('refuse un identifiant de produit manquant ou invalide', () => {
    expect(validateOfferInput({ offerPrice: 10, productId: undefined }).ok).toBe(false)
    expect(validateOfferInput({ offerPrice: 10, productId: 'abc' }).ok).toBe(false)
    expect(validateOfferInput({ offerPrice: 10, productId: -3 }).ok).toBe(false)
  })

  it('refuse Infinity et NaN', () => {
    expect(validateOfferInput({ offerPrice: Infinity, productId: 1 }).ok).toBe(false)
    expect(validateOfferInput({ offerPrice: NaN, productId: 1 }).ok).toBe(false)
  })
})

describe('computeOfferExpiry — fenêtre de paiement de 24 h', () => {
  it('place l\'échéance exactement 24 h après l\'acceptation', () => {
    const acceptedAt = new Date('2026-01-10T12:00:00.000Z')
    expect(computeOfferExpiry(acceptedAt).toISOString()).toBe('2026-01-11T12:00:00.000Z')
  })

  it('utilise bien une constante de 24 heures', () => {
    expect(OFFER_PAYMENT_WINDOW_MS).toBe(86_400_000)
  })
})

describe('isOfferExpired — expiration de la fenêtre de 24 h', () => {
  const acceptedAt = new Date('2026-01-10T12:00:00.000Z')
  const expiresAt = computeOfferExpiry(acceptedAt)

  it('reste valide à 23 h 59 après acceptation', () => {
    const now = new Date(acceptedAt.getTime() + 23 * 60 * 60 * 1000 + 59 * 60 * 1000)
    expect(isOfferExpired({ status: 'accepted', expiresAt }, now)).toBe(false)
  })

  it('reste valide une seconde avant l\'échéance (limite)', () => {
    const now = new Date(expiresAt.getTime() - 1000)
    expect(isOfferExpired({ status: 'accepted', expiresAt }, now)).toBe(false)
  })

  it('n\'est pas expirée pile à l\'échéance (comparaison stricte)', () => {
    expect(isOfferExpired({ status: 'accepted', expiresAt }, new Date(expiresAt))).toBe(false)
  })

  it('est expirée à 24 h 01 après acceptation', () => {
    const now = new Date(acceptedAt.getTime() + 24 * 60 * 60 * 1000 + 60 * 1000)
    expect(isOfferExpired({ status: 'accepted', expiresAt }, now)).toBe(true)
  })

  it('ne considère jamais une offre pending comme expirée', () => {
    const now = new Date(acceptedAt.getTime() + 72 * 60 * 60 * 1000)
    expect(isOfferExpired({ status: 'pending', expiresAt }, now)).toBe(false)
  })

  it('ne considère jamais une offre rejected comme expirée', () => {
    const now = new Date(acceptedAt.getTime() + 72 * 60 * 60 * 1000)
    expect(isOfferExpired({ status: 'rejected', expiresAt }, now)).toBe(false)
  })

  it('ne plante pas si aucune date d\'expiration n\'est enregistrée', () => {
    expect(isOfferExpired({ status: 'accepted', expiresAt: null }, new Date())).toBe(false)
  })
})

describe('canRespondToOffer — droit de répondre à une offre', () => {
  const offer = { id: 1, status: 'pending' as const, buyerId: 7, productId: 3 }

  it('autorise le vendeur participant à la conversation (cas nominal)', () => {
    const result = canRespondToOffer({ offer, currentUserId: 42, isConversationParticipant: true })
    expect(result.allowed).toBe(true)
  })

  it('refuse à l\'émetteur de répondre à sa propre offre', () => {
    const result = canRespondToOffer({ offer, currentUserId: 7, isConversationParticipant: true })
    expect(result.allowed).toBe(false)
    expect(result.status).toBe(403)
  })

  it('refuse un utilisateur étranger à la conversation', () => {
    const result = canRespondToOffer({ offer, currentUserId: 99, isConversationParticipant: false })
    expect(result.allowed).toBe(false)
    expect(result.status).toBe(403)
  })

  it('refuse de traiter une offre déjà rejetée', () => {
    const rejected = { ...offer, status: 'rejected' as const }
    const result = canRespondToOffer({ offer: rejected, currentUserId: 42, isConversationParticipant: true })
    expect(result.allowed).toBe(false)
    expect(result.status).toBe(400)
    expect(result.error).toMatch(/déjà été traitée/)
  })

  it('refuse de traiter une offre déjà acceptée (donc potentiellement expirée)', () => {
    const accepted = { ...offer, status: 'accepted' as const }
    const result = canRespondToOffer({ offer: accepted, currentUserId: 42, isConversationParticipant: true })
    expect(result.allowed).toBe(false)
    expect(result.status).toBe(400)
  })
})

describe('resolveOfferDecision — effet d\'une acceptation ou d\'un refus', () => {
  const now = new Date('2026-02-01T09:00:00.000Z')

  it('accepter ouvre une fenêtre de paiement de 24 h', () => {
    const decision = resolveOfferDecision(true, now)
    expect(decision.status).toBe('accepted')
    expect(decision.expiresAt?.toISOString()).toBe('2026-02-02T09:00:00.000Z')
  })

  it('refuser ne pose aucune échéance', () => {
    const decision = resolveOfferDecision(false, now)
    expect(decision.status).toBe('rejected')
    expect(decision.expiresAt).toBeNull()
  })
})
```

### Tests — commandes

**Chemin :** `my-app/tests/orders.test.ts` — 217 lignes

```ts
import { describe, it, expect } from 'vitest'
import {
  canTransitionOrder,
  computeConfirmDeadline,
  canShipOrder,
  canConfirmOrder,
  canDisputeOrder,
  isAutoConfirmable,
  selectAutoConfirmable,
  formatTrackingNumber,
  ORDER_CONFIRM_WINDOW_MS,
  type OrderStatus,
} from '@/lib/domain/orders'

describe('canTransitionOrder — machine à états de la commande', () => {
  it('autorise le parcours nominal paid → shipped → confirmed', () => {
    expect(canTransitionOrder('paid', 'shipped')).toBe(true)
    expect(canTransitionOrder('shipped', 'confirmed')).toBe(true)
  })

  it('autorise l\'ouverture d\'un litige depuis paid et shipped', () => {
    expect(canTransitionOrder('paid', 'disputed')).toBe(true)
    expect(canTransitionOrder('shipped', 'disputed')).toBe(true)
  })

  it('interdit de confirmer une commande non expédiée (paid → confirmed)', () => {
    expect(canTransitionOrder('paid', 'confirmed')).toBe(false)
  })

  it('interdit de revenir en arrière (confirmed → shipped)', () => {
    expect(canTransitionOrder('confirmed', 'shipped')).toBe(false)
  })

  it('interdit toute sortie d\'un état terminal', () => {
    const terminaux: OrderStatus[] = ['confirmed', 'refunded']
    const cibles: OrderStatus[] = ['paid', 'shipped', 'confirmed', 'disputed', 'refunded']
    for (const from of terminaux) {
      for (const to of cibles) {
        expect(canTransitionOrder(from, to)).toBe(false)
      }
    }
  })

  it('interdit d\'expédier une commande en litige', () => {
    expect(canTransitionOrder('disputed', 'shipped')).toBe(false)
  })

  it('autorise le remboursement d\'une commande en litige', () => {
    expect(canTransitionOrder('disputed', 'refunded')).toBe(true)
  })
})

describe('computeConfirmDeadline — délai de 48 h', () => {
  it('place l\'échéance exactement 48 h après l\'expédition', () => {
    const shippedAt = new Date('2026-03-01T08:00:00.000Z')
    expect(computeConfirmDeadline(shippedAt).toISOString()).toBe('2026-03-03T08:00:00.000Z')
  })

  it('utilise bien une constante de 48 heures', () => {
    expect(ORDER_CONFIRM_WINDOW_MS).toBe(172_800_000)
  })
})

describe('canShipOrder — expédition réservée au vendeur', () => {
  const order = { buyerId: 1, sellerId: 2, status: 'paid' as OrderStatus }

  it('autorise le vendeur sur une commande payée (cas nominal)', () => {
    expect(canShipOrder(order, 2).allowed).toBe(true)
  })

  it('refuse l\'acheteur', () => {
    const result = canShipOrder(order, 1)
    expect(result.allowed).toBe(false)
    expect(result.status).toBe(403)
  })

  it('refuse un tiers', () => {
    expect(canShipOrder(order, 99).status).toBe(403)
  })

  it('refuse d\'expédier deux fois', () => {
    const result = canShipOrder({ ...order, status: 'shipped' }, 2)
    expect(result.allowed).toBe(false)
    expect(result.status).toBe(400)
  })

  it('refuse d\'expédier une commande en litige', () => {
    expect(canShipOrder({ ...order, status: 'disputed' }, 2).allowed).toBe(false)
  })
})

describe('canConfirmOrder — confirmation réservée à l\'acheteur', () => {
  const order = { buyerId: 1, sellerId: 2, status: 'shipped' as OrderStatus }

  it('autorise l\'acheteur sur une commande expédiée (cas nominal)', () => {
    expect(canConfirmOrder(order, 1).allowed).toBe(true)
  })

  it('refuse le vendeur (il ne peut pas se libérer les fonds lui-même)', () => {
    const result = canConfirmOrder(order, 2)
    expect(result.allowed).toBe(false)
    expect(result.status).toBe(403)
  })

  it('refuse de confirmer une commande simplement payée', () => {
    const result = canConfirmOrder({ ...order, status: 'paid' }, 1)
    expect(result.allowed).toBe(false)
    expect(result.status).toBe(400)
  })

  it('refuse de confirmer deux fois', () => {
    expect(canConfirmOrder({ ...order, status: 'confirmed' }, 1).allowed).toBe(false)
  })
})

describe('canDisputeOrder — litige réservé à l\'acheteur', () => {
  const order = { buyerId: 1, sellerId: 2, status: 'shipped' as OrderStatus }

  it('autorise l\'acheteur sur une commande expédiée', () => {
    expect(canDisputeOrder(order, 1).allowed).toBe(true)
  })

  it('autorise l\'acheteur sur une commande payée non expédiée', () => {
    expect(canDisputeOrder({ ...order, status: 'paid' }, 1).allowed).toBe(true)
  })

  it('refuse le vendeur', () => {
    expect(canDisputeOrder(order, 2).status).toBe(403)
  })

  it('refuse un litige sur une commande déjà confirmée', () => {
    const result = canDisputeOrder({ ...order, status: 'confirmed' }, 1)
    expect(result.allowed).toBe(false)
    expect(result.status).toBe(400)
  })

  it('refuse un second litige sur une commande déjà disputée', () => {
    expect(canDisputeOrder({ ...order, status: 'disputed' }, 1).allowed).toBe(false)
  })
})

describe('isAutoConfirmable — logique du cron auto-confirm', () => {
  const deadline = new Date('2026-03-03T08:00:00.000Z')
  const base = {
    id: 1,
    status: 'shipped' as OrderStatus,
    confirmDeadline: deadline,
    seller: { stripeAccountId: 'acct_123' },
  }

  it('confirme une commande expédiée dont l\'échéance est dépassée (cas nominal)', () => {
    const now = new Date(deadline.getTime() + 60 * 1000)
    expect(isAutoConfirmable(base, now)).toBe(true)
  })

  it('confirme pile à l\'échéance (le cron utilise lte)', () => {
    expect(isAutoConfirmable(base, new Date(deadline))).toBe(true)
  })

  it('laisse intacte une commande dont l\'échéance n\'est pas atteinte', () => {
    const now = new Date(deadline.getTime() - 60 * 1000)
    expect(isAutoConfirmable(base, now)).toBe(false)
  })

  it('ignore une commande non expédiée', () => {
    const now = new Date(deadline.getTime() + 60 * 1000)
    expect(isAutoConfirmable({ ...base, status: 'paid' }, now)).toBe(false)
    expect(isAutoConfirmable({ ...base, status: 'disputed' }, now)).toBe(false)
    expect(isAutoConfirmable({ ...base, status: 'confirmed' }, now)).toBe(false)
  })

  it('ignore une commande sans échéance enregistrée', () => {
    const now = new Date(deadline.getTime() + 60 * 1000)
    expect(isAutoConfirmable({ ...base, confirmDeadline: null }, now)).toBe(false)
  })

  it('ignore un vendeur sans compte Stripe (aucun transfert possible)', () => {
    const now = new Date(deadline.getTime() + 60 * 1000)
    expect(isAutoConfirmable({ ...base, seller: { stripeAccountId: null } }, now)).toBe(false)
  })
})

describe('selectAutoConfirmable — sélection du lot traité par le cron', () => {
  const now = new Date('2026-03-05T08:00:00.000Z')
  const past = new Date('2026-03-03T08:00:00.000Z')
  const future = new Date('2026-03-09T08:00:00.000Z')

  it('ne retient que les commandes réellement éligibles', () => {
    const orders = [
      { id: 1, status: 'shipped' as OrderStatus, confirmDeadline: past, seller: { stripeAccountId: 'acct_1' } },
      { id: 2, status: 'shipped' as OrderStatus, confirmDeadline: future, seller: { stripeAccountId: 'acct_2' } },
      { id: 3, status: 'paid' as OrderStatus, confirmDeadline: past, seller: { stripeAccountId: 'acct_3' } },
      { id: 4, status: 'shipped' as OrderStatus, confirmDeadline: past, seller: { stripeAccountId: null } },
    ]
    expect(selectAutoConfirmable(orders, now).map(o => o.id)).toEqual([1])
  })

  it('renvoie un lot vide quand rien n\'est éligible', () => {
    const orders = [
      { id: 2, status: 'shipped' as OrderStatus, confirmDeadline: future, seller: { stripeAccountId: 'acct_2' } },
    ]
    expect(selectAutoConfirmable(orders, now)).toEqual([])
  })
})

describe('formatTrackingNumber — format du numéro de suivi', () => {
  it('produit le format FLT-AAAAMMJJ-NNNNN-XXXX', () => {
    const shippedAt = new Date(2026, 2, 3, 8, 0, 0) // 3 mars 2026, heure locale
    expect(formatTrackingNumber(42, shippedAt, 'A1B2')).toBe('FLT-20260303-00042-A1B2')
  })

  it('complète le mois et le jour sur deux chiffres', () => {
    const shippedAt = new Date(2026, 0, 5, 8, 0, 0) // 5 janvier 2026
    expect(formatTrackingNumber(1, shippedAt, 'ZZZZ')).toBe('FLT-20260105-00001-ZZZZ')
  })
})
```

### Tests — annonces

**Chemin :** `my-app/tests/products.test.ts` — 197 lignes

```ts
import { describe, it, expect } from 'vitest'
import {
  validateProductInput,
  canModifyProduct,
  isCondition,
  isCategory,
  CONDITIONS,
  CATEGORIES,
  MAX_TITLE_LENGTH,
} from '@/lib/domain/products'

describe('validateProductInput — cas nominal', () => {
  it('accepte une annonce complète et valide', () => {
    const result = validateProductInput({
      title: 'Deck Element 8.25',
      price: 45,
      condition: 'Bon_etat',
      category: 'Deck',
      description: 'Peu utilisé',
      brand: 'Element',
      size: '8.25',
    })
    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.value?.title).toBe('Deck Element 8.25')
    expect(result.value?.price).toBe(45)
  })

  it('accepte une annonce sans catégorie (champ optionnel côté schéma Prisma)', () => {
    const result = validateProductInput({ title: 'Roues', price: 20, condition: 'Neuf' })
    expect(result.ok).toBe(true)
    expect(result.value?.category).toBeNull()
  })

  it('normalise les espaces superflus du titre', () => {
    const result = validateProductInput({ title: '  Deck  ', price: 10, condition: 'Neuf' })
    expect(result.value?.title).toBe('Deck')
  })

  it('convertit un prix transmis sous forme de chaîne', () => {
    const result = validateProductInput({ title: 'Deck', price: '45.50', condition: 'Neuf' })
    expect(result.ok).toBe(true)
    expect(result.value?.price).toBe(45.5)
  })

  it('ramène les champs optionnels vides à null', () => {
    const result = validateProductInput({ title: 'Deck', price: 10, condition: 'Neuf', brand: '   ' })
    expect(result.value?.brand).toBeNull()
  })
})

describe('validateProductInput — titre', () => {
  it('refuse un titre manquant', () => {
    const result = validateProductInput({ price: 10, condition: 'Neuf' })
    expect(result.ok).toBe(false)
    expect(result.errors).toContain('Le titre est requis')
  })

  it('refuse un titre vide ou composé d\'espaces', () => {
    expect(validateProductInput({ title: '', price: 10, condition: 'Neuf' }).ok).toBe(false)
    expect(validateProductInput({ title: '     ', price: 10, condition: 'Neuf' }).ok).toBe(false)
  })

  it('accepte un titre à la longueur maximale (limite)', () => {
    const title = 'a'.repeat(MAX_TITLE_LENGTH)
    expect(validateProductInput({ title, price: 10, condition: 'Neuf' }).ok).toBe(true)
  })

  it('refuse un titre dépassant la longueur maximale', () => {
    const title = 'a'.repeat(MAX_TITLE_LENGTH + 1)
    const result = validateProductInput({ title, price: 10, condition: 'Neuf' })
    expect(result.ok).toBe(false)
    expect(result.errors.some(e => e.includes('titre'))).toBe(true)
  })
})

describe('validateProductInput — prix', () => {
  it('refuse un prix manquant', () => {
    const result = validateProductInput({ title: 'Deck', condition: 'Neuf' })
    expect(result.ok).toBe(false)
    expect(result.errors).toContain('Le prix est requis')
  })

  it('refuse un prix négatif', () => {
    const result = validateProductInput({ title: 'Deck', price: -5, condition: 'Neuf' })
    expect(result.ok).toBe(false)
    expect(result.errors).toContain('Le prix doit être strictement positif')
  })

  it('refuse un prix nul', () => {
    expect(validateProductInput({ title: 'Deck', price: 0, condition: 'Neuf' }).ok).toBe(false)
  })

  it('refuse un prix non numérique', () => {
    const result = validateProductInput({ title: 'Deck', price: 'gratuit', condition: 'Neuf' })
    expect(result.ok).toBe(false)
    expect(result.errors).toContain('Le prix doit être un nombre')
  })

  it('accepte le plus petit prix significatif (limite basse)', () => {
    expect(validateProductInput({ title: 'Deck', price: 0.01, condition: 'Neuf' }).ok).toBe(true)
  })

  it('refuse un prix hors plage haute', () => {
    expect(validateProductInput({ title: 'Deck', price: 1_000_000, condition: 'Neuf' }).ok).toBe(false)
  })
})

describe('validateProductInput — énumérations', () => {
  it('accepte toutes les valeurs d\'état du schéma Prisma', () => {
    for (const condition of CONDITIONS) {
      expect(validateProductInput({ title: 'Deck', price: 10, condition }).ok).toBe(true)
    }
  })

  it('accepte toutes les catégories du schéma Prisma', () => {
    for (const category of CATEGORIES) {
      expect(validateProductInput({ title: 'Deck', price: 10, condition: 'Neuf', category }).ok).toBe(true)
    }
  })

  it('refuse un état hors énumération', () => {
    const result = validateProductInput({ title: 'Deck', price: 10, condition: 'Excellent' })
    expect(result.ok).toBe(false)
    expect(result.errors).toContain('État invalide')
  })

  it('refuse un état manquant', () => {
    expect(validateProductInput({ title: 'Deck', price: 10 }).ok).toBe(false)
  })

  it('refuse une catégorie hors énumération', () => {
    const result = validateProductInput({ title: 'Deck', price: 10, condition: 'Neuf', category: 'Skateboard' })
    expect(result.ok).toBe(false)
    expect(result.errors).toContain('Catégorie invalide')
  })

  it('refuse une tentative d\'injection dans un champ énuméré', () => {
    const result = validateProductInput({
      title: 'Deck',
      price: 10,
      condition: "Neuf'; DROP TABLE \"Product\"; --",
    })
    expect(result.ok).toBe(false)
  })

  it('cumule les erreurs de plusieurs champs invalides', () => {
    const result = validateProductInput({ title: '', price: -1, condition: 'X', category: 'Y' })
    expect(result.ok).toBe(false)
    expect(result.errors.length).toBe(4)
  })
})

describe('isCondition / isCategory — gardes de type', () => {
  it('reconnaît les valeurs valides', () => {
    expect(isCondition('Comme_neuf')).toBe(true)
    expect(isCategory('Truck')).toBe(true)
  })

  it('rejette les valeurs invalides et les types non chaîne', () => {
    expect(isCondition('comme_neuf')).toBe(false)
    expect(isCondition(42)).toBe(false)
    expect(isCategory(null)).toBe(false)
    expect(isCategory(undefined)).toBe(false)
  })
})

describe('canModifyProduct — contrôle de propriété d\'une annonce', () => {
  const product = { userId: 14 }

  it('autorise le propriétaire (cas nominal)', () => {
    expect(canModifyProduct(product, 14).allowed).toBe(true)
  })

  it('refuse un utilisateur non propriétaire avec un 403', () => {
    const result = canModifyProduct(product, 15)
    expect(result.allowed).toBe(false)
    expect(result.status).toBe(403)
  })

  it('refuse un visiteur non authentifié avec un 401', () => {
    const result = canModifyProduct(product, null)
    expect(result.allowed).toBe(false)
    expect(result.status).toBe(401)
  })

  it('refuse un identifiant de session non numérique (cas OAuth Google)', () => {
    const result = canModifyProduct(product, Number('sub-google-abc'))
    expect(result.allowed).toBe(false)
    expect(result.status).toBe(401)
  })

  it('renvoie 404 pour une annonce inexistante', () => {
    expect(canModifyProduct(null, 14).status).toBe(404)
  })
})
```

### Tests — montants

**Chemin :** `my-app/tests/pricing.test.ts` — 103 lignes

```ts
import { describe, it, expect } from 'vitest'
import {
  computeOrderAmounts,
  computeTransferAmountCents,
  resolveFinalPrice,
  COMMISSION_RATE,
  DEFAULT_DELIVERY_COST,
} from '@/lib/domain/pricing'

describe('computeOrderAmounts — montant débité à l\'acheteur', () => {
  it('additionne prix, livraison et commission de 10 % (cas nominal)', () => {
    const amounts = computeOrderAmounts(100, 4)
    expect(amounts.commission).toBe(10)
    expect(amounts.total).toBe(114)
    expect(amounts.amountCents).toBe(11400)
  })

  it('applique les frais de livraison par défaut si non fournis', () => {
    const amounts = computeOrderAmounts(50)
    expect(amounts.deliveryCost).toBe(DEFAULT_DELIVERY_COST)
    expect(amounts.total).toBe(59)
  })

  it('arrondit la commission au centime', () => {
    const amounts = computeOrderAmounts(45.55)
    expect(amounts.commission).toBe(4.56)
    expect(amounts.amountCents).toBe(Math.round(amounts.total * 100))
  })

  it('ne produit jamais de centimes fractionnaires', () => {
    for (const price of [19.99, 33.33, 0.99, 7.77, 123.45]) {
      const amounts = computeOrderAmounts(price)
      expect(Number.isInteger(amounts.amountCents)).toBe(true)
    }
  })

  it('accepte des frais de livraison nuls (remise en main propre)', () => {
    const amounts = computeOrderAmounts(100, 0)
    expect(amounts.total).toBe(110)
  })

  it('retombe sur la livraison par défaut si la valeur est aberrante', () => {
    expect(computeOrderAmounts(100, -5).deliveryCost).toBe(DEFAULT_DELIVERY_COST)
    expect(computeOrderAmounts(100, NaN).deliveryCost).toBe(DEFAULT_DELIVERY_COST)
  })

  it('refuse un prix final invalide', () => {
    expect(() => computeOrderAmounts(0)).toThrow(/invalide/)
    expect(() => computeOrderAmounts(-10)).toThrow(/invalide/)
    expect(() => computeOrderAmounts(NaN)).toThrow(/invalide/)
  })

  it('applique bien le taux de commission documenté', () => {
    expect(COMMISSION_RATE).toBe(0.1)
  })
})

describe('computeTransferAmountCents — montant reversé au vendeur', () => {
  it('reverse le prix produit entier, commission non déduite', () => {
    expect(computeTransferAmountCents(100)).toBe(10000)
  })

  it('convertit correctement les montants à décimales', () => {
    expect(computeTransferAmountCents(45.55)).toBe(4555)
    expect(computeTransferAmountCents(0.99)).toBe(99)
  })

  it('refuse un montant invalide', () => {
    expect(() => computeTransferAmountCents(0)).toThrow()
    expect(() => computeTransferAmountCents(-1)).toThrow()
  })

  it('reste cohérent avec le montant encaissé (le reste couvre livraison + commission)', () => {
    const amounts = computeOrderAmounts(100, 4)
    const transfer = computeTransferAmountCents(100)
    expect(amounts.amountCents - transfer).toBe(1400) // 4 € livraison + 10 € commission
  })
})

describe('resolveFinalPrice — prix retenu pour la commande', () => {
  it('retient le prix produit en l\'absence d\'offre', () => {
    expect(resolveFinalPrice(80, null)).toBe(80)
    expect(resolveFinalPrice(80, undefined)).toBe(80)
  })

  it('retient le montant d\'une offre acceptée', () => {
    expect(resolveFinalPrice(80, { offerPrice: 65, status: 'accepted' })).toBe(65)
  })

  it('ignore une offre encore en attente', () => {
    expect(resolveFinalPrice(80, { offerPrice: 65, status: 'pending' })).toBe(80)
  })

  it('ignore une offre rejetée ou expirée', () => {
    expect(resolveFinalPrice(80, { offerPrice: 65, status: 'rejected' })).toBe(80)
  })

  it('ignore une offre acceptée au montant aberrant', () => {
    expect(resolveFinalPrice(80, { offerPrice: 0, status: 'accepted' })).toBe(80)
    expect(resolveFinalPrice(80, { offerPrice: -20, status: 'accepted' })).toBe(80)
  })
})
```

### Tests — contrôles d'accès

**Chemin :** `my-app/tests/access.test.ts` — 67 lignes

```ts
import { describe, it, expect } from 'vitest'
import { isValidAdminToken, isCronAuthorized } from '@/lib/domain/access'

describe('isValidAdminToken — session administrateur', () => {
  it('autorise un jeton identique au secret configuré (cas nominal)', () => {
    expect(isValidAdminToken('secret-attendu', 'secret-attendu')).toBe(true)
  })

  it('refuse un jeton différent', () => {
    expect(isValidAdminToken('mauvais-jeton', 'secret-attendu')).toBe(false)
  })

  it('refuse une requête sans cookie', () => {
    expect(isValidAdminToken(undefined, 'secret-attendu')).toBe(false)
    expect(isValidAdminToken(null, 'secret-attendu')).toBe(false)
    expect(isValidAdminToken('', 'secret-attendu')).toBe(false)
  })

  /**
   * Régression : la comparaison naïve `cookie !== process.env.ADMIN_TOKEN`
   * utilisée dans les routes `/api/admin/*` accorde l'accès lorsque la
   * variable d'environnement est absente, car `undefined !== undefined`
   * est faux. Le helper doit refuser ce cas.
   */
  it('refuse l\'accès quand le secret n\'est pas configuré (faille undefined === undefined)', () => {
    expect(isValidAdminToken(undefined, undefined)).toBe(false)
    expect(isValidAdminToken(undefined, '')).toBe(false)
    expect(isValidAdminToken('', '')).toBe(false)
    expect(isValidAdminToken(null, null)).toBe(false)
  })

  it('refuse tout jeton lorsque le secret est absent, même non vide', () => {
    expect(isValidAdminToken('n-importe-quoi', undefined)).toBe(false)
  })

  it('est sensible à la casse et aux espaces', () => {
    expect(isValidAdminToken('Secret', 'secret')).toBe(false)
    expect(isValidAdminToken(' secret', 'secret')).toBe(false)
  })
})

describe('isCronAuthorized — appel du cron Vercel', () => {
  it('autorise un en-tête Bearer exact (cas nominal)', () => {
    expect(isCronAuthorized('Bearer s3cr3t', 's3cr3t')).toBe(true)
  })

  it('refuse un secret erroné', () => {
    expect(isCronAuthorized('Bearer autre', 's3cr3t')).toBe(false)
  })

  it('refuse un en-tête absent', () => {
    expect(isCronAuthorized(undefined, 's3cr3t')).toBe(false)
    expect(isCronAuthorized(null, 's3cr3t')).toBe(false)
  })

  it('refuse un en-tête mal formé (schéma manquant ou incorrect)', () => {
    expect(isCronAuthorized('s3cr3t', 's3cr3t')).toBe(false)
    expect(isCronAuthorized('Basic s3cr3t', 's3cr3t')).toBe(false)
    expect(isCronAuthorized('bearer s3cr3t', 's3cr3t')).toBe(false)
  })

  it('refuse l\'appel quand CRON_SECRET n\'est pas configuré', () => {
    expect(isCronAuthorized('Bearer undefined', undefined)).toBe(false)
    expect(isCronAuthorized(undefined, undefined)).toBe(false)
  })
})
```

### Tests — limitation de débit

**Chemin :** `my-app/tests/rateLimit.test.ts` — 118 lignes

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { rateLimit } from '@/lib/rateLimit'

/**
 * `lib/rateLimit.ts` conserve son état dans une Map de module.
 * Chaque test utilise donc une clé distincte pour rester isolé,
 * et les horloges sont simulées pour tester les fenêtres temporelles.
 */

describe('rateLimit — signalements (5 par heure)', () => {
  const OPTS = { limit: 5, windowMs: 60 * 60 * 1000 }

  it('autorise les requêtes sous la limite', () => {
    const key = 'reports:user:nominal'
    for (let i = 1; i <= 5; i++) {
      expect(rateLimit(key, OPTS).allowed).toBe(true)
    }
  })

  it('bloque la requête qui dépasse la limite', () => {
    const key = 'reports:user:depassement'
    for (let i = 1; i <= 5; i++) rateLimit(key, OPTS)
    const sixieme = rateLimit(key, OPTS)
    expect(sixieme.allowed).toBe(false)
    expect(sixieme.retryAfter).toBeGreaterThan(0)
  })

  it('continue de bloquer les requêtes suivantes', () => {
    const key = 'reports:user:persistant'
    for (let i = 1; i <= 6; i++) rateLimit(key, OPTS)
    expect(rateLimit(key, OPTS).allowed).toBe(false)
  })

  it('isole les compteurs entre utilisateurs distincts', () => {
    const a = 'reports:user:aaa'
    const b = 'reports:user:bbb'
    for (let i = 1; i <= 6; i++) rateLimit(a, OPTS)
    expect(rateLimit(a, OPTS).allowed).toBe(false)
    expect(rateLimit(b, OPTS).allowed).toBe(true)
  })
})

describe('rateLimit — remise à zéro de la fenêtre', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-01T10:00:00.000Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('réautorise après expiration de la fenêtre horaire', () => {
    const key = 'reports:user:fenetre'
    const opts = { limit: 5, windowMs: 60 * 60 * 1000 }

    for (let i = 1; i <= 5; i++) expect(rateLimit(key, opts).allowed).toBe(true)
    expect(rateLimit(key, opts).allowed).toBe(false)

    // 59 minutes plus tard : toujours bloqué
    vi.advanceTimersByTime(59 * 60 * 1000)
    expect(rateLimit(key, opts).allowed).toBe(false)

    // Au-delà de l'heure : compteur réinitialisé
    vi.advanceTimersByTime(2 * 60 * 1000)
    expect(rateLimit(key, opts).allowed).toBe(true)
  })
})

describe('rateLimit — lockout du login admin (5 tentatives / 15 min, blocage 30 min)', () => {
  const OPTS = { limit: 5, windowMs: 15 * 60 * 1000, lockoutMs: 30 * 60 * 1000 }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-01T10:00:00.000Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('autorise 5 tentatives puis verrouille', () => {
    const key = 'admin-login:203.0.113.10'
    for (let i = 1; i <= 5; i++) {
      expect(rateLimit(key, OPTS).allowed).toBe(true)
    }
    expect(rateLimit(key, OPTS).allowed).toBe(false)
  })

  it('maintient le verrou pendant 30 minutes après dépassement', () => {
    const key = 'admin-login:203.0.113.11'
    for (let i = 1; i <= 6; i++) rateLimit(key, OPTS)

    // 29 minutes plus tard : encore verrouillé
    vi.advanceTimersByTime(29 * 60 * 1000)
    const encore = rateLimit(key, OPTS)
    expect(encore.allowed).toBe(false)
    expect(encore.retryAfter).toBeGreaterThan(0)

    // Après 30 minutes : le verrou est levé
    vi.advanceTimersByTime(2 * 60 * 1000)
    expect(rateLimit(key, OPTS).allowed).toBe(true)
  })

  it('isole le verrou par adresse IP', () => {
    const attaquant = 'admin-login:198.51.100.1'
    const legitime = 'admin-login:198.51.100.2'
    for (let i = 1; i <= 6; i++) rateLimit(attaquant, OPTS)
    expect(rateLimit(attaquant, OPTS).allowed).toBe(false)
    expect(rateLimit(legitime, OPTS).allowed).toBe(true)
  })

  it('indique un délai d\'attente exploitable par le client', () => {
    const key = 'admin-login:198.51.100.3'
    for (let i = 1; i <= 6; i++) rateLimit(key, OPTS)
    const bloque = rateLimit(key, OPTS)
    expect(bloque.retryAfter).toBeLessThanOrEqual(30 * 60)
  })
})
```

### Tests de route — acceptation d'offre (Prisma mocké)

**Chemin :** `my-app/tests/api/offer-status.route.test.ts` — 159 lignes

```ts
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'

/**
 * Test de la route `POST /api/offer/status` avec la couche Prisma,
 * Pusher et la session entièrement simulées : aucun accès réseau
 * ni base de données n'est effectué.
 */

const prismaMock = {
  offer: {
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  conversation: {
    findFirst: vi.fn(),
  },
}
const pusherMock = { trigger: vi.fn().mockResolvedValue(undefined) }
const getSessionMock = vi.fn()

vi.mock('@/lib/db', () => ({ default: prismaMock }))
vi.mock('@/lib/pusher-server', () => ({ default: pusherMock }))
vi.mock('@/lib/getSession', () => ({ getSession: getSessionMock }))

type RouteModule = typeof import('@/app/api/offer/status/route')
let POST: RouteModule['POST']

beforeAll(async () => {
  ;({ POST } = await import('@/app/api/offer/status/route'))
})

function request(body: unknown) {
  return new Request('http://localhost/api/offer/status', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

const OFFER = {
  id: 1,
  status: 'pending',
  buyerId: 7,
  productId: 3,
  product: { userId: 42 },
}

beforeEach(() => {
  vi.clearAllMocks()
  getSessionMock.mockResolvedValue({ user: { id: '42' } })
  prismaMock.offer.findUnique.mockResolvedValue(OFFER)
  prismaMock.conversation.findFirst.mockResolvedValue({ id: 99 })
  prismaMock.offer.update.mockImplementation(async ({ data }: any) => ({
    id: 1,
    status: data.status,
    expiresAt: data.expiresAt ?? null,
  }))
  prismaMock.offer.updateMany.mockResolvedValue({ count: 0 })
})

describe('POST /api/offer/status — authentification', () => {
  it('refuse un visiteur non authentifié avec un 401', async () => {
    getSessionMock.mockResolvedValue(null)
    const res = await POST(request({ id: 1, accepted: true }))
    expect(res.status).toBe(401)
    expect(prismaMock.offer.update).not.toHaveBeenCalled()
  })
})

describe('POST /api/offer/status — validation des paramètres', () => {
  it('refuse un identifiant manquant', async () => {
    const res = await POST(request({ accepted: true }))
    expect(res.status).toBe(400)
  })

  it('refuse un booléen `accepted` mal typé', async () => {
    const res = await POST(request({ id: 1, accepted: 'oui' }))
    expect(res.status).toBe(400)
  })
})

describe('POST /api/offer/status — règles métier', () => {
  it('renvoie 404 si l\'offre n\'existe pas', async () => {
    prismaMock.offer.findUnique.mockResolvedValue(null)
    const res = await POST(request({ id: 1, accepted: true }))
    expect(res.status).toBe(404)
  })

  it('refuse de traiter une offre déjà traitée', async () => {
    prismaMock.offer.findUnique.mockResolvedValue({ ...OFFER, status: 'rejected' })
    const res = await POST(request({ id: 1, accepted: true }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: expect.stringMatching(/déjà été traitée/) })
  })

  it('interdit à l\'émetteur de répondre à sa propre offre', async () => {
    getSessionMock.mockResolvedValue({ user: { id: '7' } })
    const res = await POST(request({ id: 1, accepted: true }))
    expect(res.status).toBe(403)
  })

  it('interdit à un utilisateur hors conversation de répondre', async () => {
    prismaMock.conversation.findFirst.mockResolvedValue(null)
    const res = await POST(request({ id: 1, accepted: true }))
    expect(res.status).toBe(403)
  })
})

describe('POST /api/offer/status — acceptation (cas nominal)', () => {
  it('accepte l\'offre et ouvre une fenêtre de paiement de 24 h', async () => {
    const avant = Date.now()
    const res = await POST(request({ id: 1, accepted: true }))
    expect(res.status).toBe(200)

    const data = prismaMock.offer.update.mock.calls[0][0].data
    expect(data.status).toBe('accepted')
    const delta = new Date(data.expiresAt).getTime() - avant
    expect(delta).toBeGreaterThan(23.9 * 60 * 60 * 1000)
    expect(delta).toBeLessThanOrEqual(24 * 60 * 60 * 1000 + 5000)
  })

  it('invalide les autres offres du même produit', async () => {
    await POST(request({ id: 1, accepted: true }))
    expect(prismaMock.offer.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          productId: 3,
          id: { not: 1 },
        }),
        data: { status: 'rejected' },
      })
    )
  })

  it('notifie les participants via Pusher', async () => {
    await POST(request({ id: 1, accepted: true }))
    expect(pusherMock.trigger).toHaveBeenCalledWith(
      'private-conversation-99',
      'offer-updated',
      expect.objectContaining({ offerId: 1, status: 'accepted' })
    )
  })
})

describe('POST /api/offer/status — refus', () => {
  it('rejette l\'offre sans poser d\'échéance', async () => {
    const res = await POST(request({ id: 1, accepted: false }))
    expect(res.status).toBe(200)
    const data = prismaMock.offer.update.mock.calls[0][0].data
    expect(data.status).toBe('rejected')
    expect(data.expiresAt).toBeUndefined()
  })

  it('n\'invalide pas les autres offres lors d\'un refus', async () => {
    await POST(request({ id: 1, accepted: false }))
    expect(prismaMock.offer.updateMany).not.toHaveBeenCalled()
  })
})
```

### Tests de route — accès admin (Prisma mocké)

**Chemin :** `my-app/tests/api/admin-users.route.test.ts` — 90 lignes

```ts
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'

/**
 * Contrôle d'accès de la route `GET /api/admin/users`.
 * Le middleware `middleware.ts` ne couvre que les PAGES `/admin/*`
 * (matcher `/admin/:path*`) : les routes `/api/admin/*` reposent
 * uniquement sur la vérification du cookie faite dans chaque handler.
 * Ces tests documentent le comportement réel de cette vérification.
 */

const cookiesMock = vi.fn()
const prismaMock = { user: { findMany: vi.fn() } }

vi.mock('next/headers', () => ({ cookies: cookiesMock }))
vi.mock('@/lib/db', () => ({ default: prismaMock }))

type RouteModule = typeof import('@/app/api/admin/users/route')
let GET: RouteModule['GET']

beforeAll(async () => {
  ;({ GET } = await import('@/app/api/admin/users/route'))
})

function withCookie(value: string | undefined) {
  cookiesMock.mockReturnValue({
    get: (name: string) => (name === 'admin_token' && value !== undefined ? { value } : undefined),
  })
}

const ORIGINAL_TOKEN = process.env.ADMIN_TOKEN

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.user.findMany.mockResolvedValue([])
  process.env.ADMIN_TOKEN = 'jeton-admin-de-test'
})

afterEach(() => {
  if (ORIGINAL_TOKEN === undefined) delete process.env.ADMIN_TOKEN
  else process.env.ADMIN_TOKEN = ORIGINAL_TOKEN
})

describe('GET /api/admin/users — accès refusé', () => {
  it('refuse une requête sans cookie admin_token', async () => {
    withCookie(undefined)
    const res = await GET()
    expect(res.status).toBe(403)
    expect(prismaMock.user.findMany).not.toHaveBeenCalled()
  })

  it('refuse un cookie admin_token invalide', async () => {
    withCookie('jeton-forge-par-un-attaquant')
    const res = await GET()
    expect(res.status).toBe(403)
    expect(prismaMock.user.findMany).not.toHaveBeenCalled()
  })

  it('refuse un cookie vide', async () => {
    withCookie('')
    const res = await GET()
    expect(res.status).toBe(403)
  })
})

describe('GET /api/admin/users — accès autorisé', () => {
  it('autorise un cookie admin_token valide et interroge la base', async () => {
    withCookie('jeton-admin-de-test')
    const res = await GET()
    expect(res.status).toBe(200)
    expect(prismaMock.user.findMany).toHaveBeenCalled()
  })
})

describe('GET /api/admin/users — régression de sécurité', () => {
  /**
   * Faille constatée : la comparaison `cookies().get('admin_token')?.value !== process.env.ADMIN_TOKEN`
   * évalue `undefined !== undefined` → `false` lorsque ADMIN_TOKEN n'est pas
   * défini dans l'environnement. Sans cookie, l'accès est alors ACCORDÉ.
   * Ce test verrouille le comportement attendu après correction :
   * l'absence de secret configuré doit refuser l'accès.
   */
  it('refuse l\'accès lorsque ADMIN_TOKEN n\'est pas configuré et qu\'aucun cookie n\'est fourni', async () => {
    delete process.env.ADMIN_TOKEN
    withCookie(undefined)
    const res = await GET()
    expect(res.status).toBe(403)
    expect(prismaMock.user.findMany).not.toHaveBeenCalled()
  })
})
```

### Configuration Vitest

**Chemin :** `my-app/vitest.config.ts` — 22 lignes

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    // Reproduit l'alias `@/*` déclaré dans tsconfig.json
    alias: { '@': path.resolve(__dirname) },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Aucun test n'accède au réseau ni à une base de données :
    // la couche Prisma, Pusher et Stripe sont systématiquement mockées.
    globals: false,
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.ts'],
      exclude: ['lib/db.ts', 'lib/pusher-*.ts', 'lib/stripe.ts', 'lib/auth.ts'],
    },
  },
})
```

