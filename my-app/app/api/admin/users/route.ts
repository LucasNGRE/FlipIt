import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import prisma from '@/lib/db'
import { isAdminRequest } from '@/lib/adminAuth'

export async function GET() {
  if (!isAdminRequest()) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      image: true,
      createdAt: true,
      suspended: true,
      suspendedReason: true,
      stripeAccountId: true,
      _count: { select: { products: true, ordersBuyer: true, ordersSeller: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(users)
}
