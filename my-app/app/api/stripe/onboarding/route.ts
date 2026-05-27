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
