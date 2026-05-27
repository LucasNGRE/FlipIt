import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { cookies } from 'next/headers'
import { logAdmin } from '@/lib/adminLog'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (cookies().get('admin_token')?.value !== process.env.ADMIN_TOKEN)
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { suspend, reason } = await req.json()
  const user = await prisma.user.update({
    where: { id: Number(params.id) },
    data: { suspended: suspend, suspendedReason: suspend ? (reason ?? null) : null },
    select: { id: true, suspended: true, suspendedReason: true },
  })

  await logAdmin(suspend ? 'user_suspended' : 'user_unsuspended', `user:${params.id}`, reason)
  return NextResponse.json(user)
}
