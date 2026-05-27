export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/getSession'

export async function GET() {
  const session = await getSession()
  if (!session?.user?.id) return NextResponse.json([], { status: 401 })

  const messages = await prisma.adminMessage.findMany({
    where: { userId: Number(session.user.id) },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  return NextResponse.json(messages)
}

export async function PATCH(req: Request) {
  const session = await getSession()
  if (!session?.user?.id) return NextResponse.json({}, { status: 401 })

  const { id } = await req.json()
  const msg = await prisma.adminMessage.update({
    where: { id: Number(id), userId: Number(session.user.id) },
    data: { read: true },
  })
  return NextResponse.json(msg)
}
