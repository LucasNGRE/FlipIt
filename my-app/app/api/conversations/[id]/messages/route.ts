import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/getSession'
import pusherServer from '@/lib/pusher-server'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, firstName: true, lastName: true, image: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const conversationId = parseInt(params.id)
  const { content, productId } = await req.json()

  if (!content?.trim()) return NextResponse.json({ error: 'Empty message' }, { status: 400 })

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      participants: { some: { id: user.id } },
    },
  })
  if (!conversation) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const message = await prisma.message.create({
    data: {
      content: content.trim(),
      userId: user.id,
      conversationId,
      productId,
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, image: true } },
      product: { select: { id: true, title: true } },
    },
  })

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  })

  const fullConv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { participants: { select: { id: true } } },
  })
  const recipientIds = fullConv?.participants.map(p => p.id).filter(id => id !== user.id) ?? []

  await pusherServer.trigger(`private-conversation-${conversationId}`, 'new-message', message)

  if (recipientIds.length > 0) {
    await pusherServer.trigger(
      recipientIds.map(id => `private-user-${id}`),
      'new-conversation-message',
      { conversationId, message }
    )
  }

  return NextResponse.json(message)
}
