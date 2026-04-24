import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/getSession'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const conversationId = parseInt(params.id)

  await (prisma as any).conversationRead.upsert({
    where: { userId_conversationId: { userId: user.id, conversationId } },
    update: { lastReadAt: new Date() },
    create: { userId: user.id, conversationId, lastReadAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
