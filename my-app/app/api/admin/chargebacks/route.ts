import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import prisma from '@/lib/db'
import { isAdminRequest } from '@/lib/adminAuth'

export async function GET() {
  if (!isAdminRequest())
    return NextResponse.json({ error: 'AccÃ¨s refusÃ©' }, { status: 403 })

  const chargebacks = await prisma.chargeback.findMany({
    include: {
      order: {
        select: {
          id: true,
          finalPrice: true,
          product: { select: { title: true } },
          buyer:   { select: { firstName: true, lastName: true, email: true } },
          seller:  { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(chargebacks)
}

