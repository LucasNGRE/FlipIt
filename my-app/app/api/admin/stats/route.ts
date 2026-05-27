import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { cookies } from 'next/headers'

export async function GET() {
  if (cookies().get('admin_token')?.value !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    revenueData,
    refundData,
    totalOrders,
    ordersThisMonth,
    activeDisputes,
    resolvedDisputes,
    totalUsers,
    newUsersThisMonth,
    totalProducts,
    availableProducts,
  ] = await Promise.all([
    prisma.order.aggregate({ where: { status: 'confirmed' }, _sum: { finalPrice: true } }),
    prisma.order.aggregate({ where: { status: 'refunded' }, _sum: { finalPrice: true } }),
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.order.count({ where: { status: 'disputed' } }),
    prisma.order.count({ where: { disputeReason: { not: null }, status: { in: ['confirmed', 'refunded'] } } }),
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.product.count(),
    prisma.product.count({ where: { status: 'available' } }),
  ])

  const revenue = Number(revenueData._sum.finalPrice ?? 0)
  const refunds = Number(refundData._sum.finalPrice ?? 0)
  const commission = revenue * 0.10

  return NextResponse.json({
    revenue,
    commission,
    refunds,
    totalOrders,
    ordersThisMonth,
    activeDisputes,
    resolvedDisputes,
    totalUsers,
    newUsersThisMonth,
    totalProducts,
    availableProducts,
  })
}
