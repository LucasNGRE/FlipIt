import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import prisma from '@/lib/db'
import { cookies } from 'next/headers'
import { logAdmin } from '@/lib/adminLog'

export async function GET(req: Request) {
  if (cookies().get('admin_token')?.value !== process.env.ADMIN_TOKEN)
    return NextResponse.json({ error: 'AccÃ¨s refusÃ©' }, { status: 403 })

  const status = new URL(req.url).searchParams.get('status') ?? 'pending'

  const reports = await prisma.report.findMany({
    where: { status: status as any },
    include: {
      reporter: { select: { id: true, firstName: true, lastName: true, email: true } },
      product:  { select: { id: true, title: true, images: { select: { url: true }, take: 1 } } },
      reportedUser: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(reports)
}

export async function PATCH(req: Request) {
  if (cookies().get('admin_token')?.value !== process.env.ADMIN_TOKEN)
    return NextResponse.json({ error: 'AccÃ¨s refusÃ©' }, { status: 403 })

  const { id, status } = await req.json()
  const report = await prisma.report.update({ where: { id: Number(id) }, data: { status } })
  await logAdmin('report_updated', `report:${id}`, status)
  return NextResponse.json(report)
}

