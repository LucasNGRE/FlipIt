export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/getSession'
import pusherServer from '@/lib/pusher-server'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const currentUserId = Number(session.user.id)

    const order = await prisma.order.findUnique({ where: { id: Number(params.id) } })
    if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
    if (order.buyerId !== currentUserId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }
    if (!['paid', 'shipped'].includes(order.status)) {
      return NextResponse.json({ error: 'Impossible de disputer une commande dans cet état' }, { status: 400 })
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
