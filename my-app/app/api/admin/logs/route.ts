import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import prisma from '@/lib/db'
import { isAdminRequest } from '@/lib/adminAuth'

export async function GET() {
  if (!isAdminRequest())
    return NextResponse.json({ error: 'AccÃ¨s refusÃ©' }, { status: 403 })

  const logs = await prisma.adminLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return NextResponse.json(logs)
}

