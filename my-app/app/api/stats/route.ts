import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [totalProducts, totalUsers, todayProducts, totalTransactions] = await Promise.all([
    prisma.product.count(),
    prisma.user.count(),
    prisma.product.count({ where: { createdAt: { gte: today } } }),
    prisma.transaction.count(),
  ])

  return NextResponse.json({ totalProducts, totalUsers, todayProducts, totalTransactions })
}
