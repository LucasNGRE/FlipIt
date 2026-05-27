import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import prisma from '@/lib/db'
import { cookies } from 'next/headers'

export async function GET() {
  if (cookies().get('admin_token')?.value !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: 'AccÃ¨s refusÃ©' }, { status: 403 })
  }

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const [confirmedOrders, refundedOrders] = await Promise.all([
    prisma.order.findMany({
      where: { status: 'confirmed', updatedAt: { gte: sixMonthsAgo } },
      select: { id: true, finalPrice: true, updatedAt: true, product: { select: { title: true } }, buyer: { select: { firstName: true, lastName: true } }, seller: { select: { firstName: true, lastName: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    }),
    prisma.order.findMany({
      where: { status: 'refunded', updatedAt: { gte: sixMonthsAgo } },
      select: { id: true, finalPrice: true, updatedAt: true, product: { select: { title: true } }, buyer: { select: { firstName: true, lastName: true } }, seller: { select: { firstName: true, lastName: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    }),
  ])

  // Monthly breakdown (last 6 months)
  const monthlyMap: Record<string, { revenue: number; commission: number; refunds: number }> = {}
  const addMonth = (date: Date, amount: number, type: 'confirmed' | 'refunded') => {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (!monthlyMap[key]) monthlyMap[key] = { revenue: 0, commission: 0, refunds: 0 }
    if (type === 'confirmed') {
      monthlyMap[key].revenue += amount
      monthlyMap[key].commission += amount * 0.10
    } else {
      monthlyMap[key].refunds += amount
    }
  }

  confirmedOrders.forEach(o => addMonth(new Date(o.updatedAt), Number(o.finalPrice), 'confirmed'))
  refundedOrders.forEach(o => addMonth(new Date(o.updatedAt), Number(o.finalPrice), 'refunded'))

  const monthly = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data }))

  return NextResponse.json({ confirmedOrders, refundedOrders, monthly })
}

