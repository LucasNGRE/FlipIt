import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import prisma from '@/lib/db'
import { cookies } from 'next/headers'
import { logAdmin } from '@/lib/adminLog'

export async function GET(req: Request) {
  if (cookies().get('admin_token')?.value !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: 'AccÃ¨s refusÃ©' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const products = await prisma.product.findMany({
    where: status ? { status: status as any } : undefined,
    include: {
      images: { select: { url: true }, take: 1 },
      user: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json(products)
}

export async function PATCH(req: Request) {
  if (cookies().get('admin_token')?.value !== process.env.ADMIN_TOKEN)
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id, suspended } = await req.json()
  const product = await prisma.product.update({
    where: { id: Number(id) },
    data: { suspended: Boolean(suspended) },
    select: { id: true, suspended: true },
  })
  await logAdmin(suspended ? 'product_suspended' : 'product_unsuspended', `product:${id}`)
  return NextResponse.json(product)
}

export async function DELETE(req: Request) {
  if (cookies().get('admin_token')?.value !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: 'AccÃ¨s refusÃ©' }, { status: 403 })
  }

  const { id } = await req.json()
  await prisma.productImage.deleteMany({ where: { productId: Number(id) } })
  await prisma.product.delete({ where: { id: Number(id) } })
  await logAdmin('product_deleted', `product:${id}`)

  return NextResponse.json({ ok: true })
}

