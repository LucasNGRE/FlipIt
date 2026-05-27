import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import prisma from '@/lib/db'
import stripe from '@/lib/stripe'
import { getSession } from '@/lib/getSession'

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    const userId = Number(session.user.id)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeAccountId: true, stripeOnboarded: true },
    })

    if (!user?.stripeAccountId || !user.stripeOnboarded) {
      return NextResponse.json({ error: 'Compte vendeur non configuré' }, { status: 400 })
    }

    const loginLink = await stripe.accounts.createLoginLink(user.stripeAccountId)
    return NextResponse.json({ url: loginLink.url })
  } catch (err: any) {
    console.error('[stripe/dashboard]', err)
    return NextResponse.json({ error: err.message ?? 'Erreur' }, { status: 500 })
  }
}
