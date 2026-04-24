import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/getSession'

export async function GET() {
  const session = await getSession()
  if (!session?.user?.email) return NextResponse.json({ count: 0 })

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!user) return NextResponse.json({ count: 0 })

  const convIds = await prisma.conversation.findMany({
    where: { participants: { some: { id: user.id } } },
    select: { id: true },
  })

  const reads = await (prisma as any).conversationRead.findMany({
    where: { userId: user.id },
  }) as { conversationId: number; lastReadAt: Date }[]
  const readMap = new Map<number, Date>(reads.map((r: { conversationId: number; lastReadAt: Date }) => [r.conversationId, r.lastReadAt]))

  const counts = await prisma.$transaction(
    convIds.map(c => {
      const since: Date = readMap.get(c.id) ?? new Date(0)
      return prisma.message.count({
        where: {
          conversationId: c.id,
          userId: { not: user.id },
          createdAt: { gt: since },
        },
      })
    })
  )

  return NextResponse.json({ count: counts.reduce((a, b) => a + b, 0) })
}
