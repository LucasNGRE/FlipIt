import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/getSession'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const conversationId = parseInt(params.id)

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      participants: { some: { id: user.id } },
    },
    include: {
      participants: {
        select: { id: true, firstName: true, lastName: true, image: true },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, image: true } },
          product: { select: { id: true, title: true, images: { take: 1 } } },
        },
      },
    },
  })

  if (!conversation) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(conversation)
}
