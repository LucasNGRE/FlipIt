import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import pusherServer from '@/lib/pusher-server'
import { getSession } from '@/lib/getSession'

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

  // 2. L'offre doit être en attente
  if (offer.status !== 'pending') {
    return NextResponse.json({ error: 'Cette offre a déjà été traitée' }, { status: 400 })
  }

  // 3. L'émetteur ne peut pas répondre à sa propre offre
  if (currentUserId === offer.buyerId) {
    return NextResponse.json({ error: 'Impossible de répondre à sa propre offre' }, { status: 403 })
  }

  // 4. L'utilisateur doit être participant de la conversation liée à ce produit
  const conversation = await prisma.conversation.findFirst({
    where: {
      productId: offer.productId,
      participants: { some: { id: currentUserId } },
    },
  })
  if (!conversation) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  // 5. Mettre à jour l'offre (fenêtre de paiement 24h si acceptée)
  const expiresAt = accepted ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null
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
