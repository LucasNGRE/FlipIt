import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/getSession'

export async function GET() {
  const session = await getSession()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const conversations = await prisma.conversation.findMany({
    where: {
      participants: { some: { id: user.id } },
      OR: [
        { productId: { not: null } },
        { messages: { some: {} } },
      ],
    },
    include: {
      participants: {
        where: { id: { not: user.id } },
        select: { id: true, firstName: true, lastName: true, image: true },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { product: { select: { id: true, title: true } } },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const convIds = conversations.map(c => c.id)

  const reads = await (prisma as any).conversationRead.findMany({
    where: { userId: user.id, conversationId: { in: convIds } },
  }) as { conversationId: number; lastReadAt: Date }[]
  const readMap = new Map<number, Date>(reads.map(r => [r.conversationId, r.lastReadAt]))

  const unreadCounts = await prisma.$transaction(
    conversations.map(c => {
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

  const result = conversations.map((c, i) => ({
    ...c,
    unreadCount: unreadCounts[i],
  }))

  return NextResponse.json(result)
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { productId, sellerId } = await req.json()

  const buyer = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!buyer) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (buyer.id === sellerId) {
    return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 })
  }

  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { id: buyer.id } } },
        { participants: { some: { id: sellerId } } },
        {
          OR: [
            { productId },
            { messages: { some: { productId } } },
          ],
        },
      ],
    },
  })

  if (existing) return NextResponse.json(existing)

  const conversation = await prisma.conversation.create({
    data: {
      productId,
      participants: {
        connect: [{ id: buyer.id }, { id: sellerId }],
      },
    },
  })

  return NextResponse.json(conversation)
}
