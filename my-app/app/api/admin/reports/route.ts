import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import prisma from '@/lib/db'
import { cookies } from 'next/headers'
import { logAdmin } from '@/lib/adminLog'

export async function GET(req: Request) {
  if (cookies().get('admin_token')?.value !== process.env.ADMIN_TOKEN)
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const status = new URL(req.url).searchParams.get('status') ?? 'pending'

  const reports = await prisma.report.findMany({
    where: { status: status as any },
    include: {
      reporter: { select: { id: true, firstName: true, lastName: true, email: true } },
      product:  { select: { id: true, title: true, suspended: true, images: { select: { url: true }, take: 1 } } },
      reportedUser: { select: { id: true, firstName: true, lastName: true, email: true, suspended: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(reports)
}

export async function PATCH(req: Request) {
  if (cookies().get('admin_token')?.value !== process.env.ADMIN_TOKEN)
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id, ids, status } = await req.json()

  if (ids && Array.isArray(ids)) {
    await prisma.report.updateMany({ where: { id: { in: ids.map(Number) } }, data: { status } })
    await logAdmin('reports_batch_updated', `${ids.length} reports`, status)
    return NextResponse.json({ ok: true })
  }

  const report = await prisma.report.update({ where: { id: Number(id) }, data: { status } })
  await logAdmin('report_updated', `report:${id}`, status)
  return NextResponse.json(report)
}
