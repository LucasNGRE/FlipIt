import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { cookies } from 'next/headers'
import pusherServer from '@/lib/pusher-server'
import { logAdmin } from '@/lib/adminLog'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (cookies().get('admin_token')?.value !== process.env.ADMIN_TOKEN)
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { subject, body } = await req.json()
  if (!subject || !body) return NextResponse.json({ error: 'Sujet et message requis' }, { status: 400 })

  const msg = await prisma.adminMessage.create({
    data: { userId: Number(params.id), subject, body },
  })

  await pusherServer.trigger(`private-user-${params.id}`, 'admin-message', { subject, body })
  await logAdmin('message_sent', `user:${params.id}`, subject)

  return NextResponse.json(msg)
}
