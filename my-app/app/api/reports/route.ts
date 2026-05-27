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
