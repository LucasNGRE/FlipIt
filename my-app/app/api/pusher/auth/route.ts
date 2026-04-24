import { NextResponse } from 'next/server'
import pusherServer from '@/lib/pusher-server'
import { getSession } from '@/lib/getSession'
import prisma from '@/lib/db'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const body = await req.text()
  const params = new URLSearchParams(body)
  const socketId = params.get('socket_id')!
  const channelName = params.get('channel_name')!

  if (channelName.startsWith('private-conversation-')) {
    const conversationId = parseInt(channelName.replace('private-conversation-', ''))
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, participants: { some: { id: user.id } } },
    })
    if (!conversation) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } else if (channelName.startsWith('private-user-')) {
    const channelUserId = parseInt(channelName.replace('private-user-', ''))
    if (channelUserId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const authResponse = pusherServer.authorizeChannel(socketId, channelName)
  return NextResponse.json(authResponse)
}
