import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { cookies } from 'next/headers'

export async function GET() {
  if (cookies().get('admin_token')?.value !== process.env.ADMIN_TOKEN)
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const orders = await prisma.order.findMany({
    where: { status: { in: ['confirmed', 'refunded'] } },
    include: {
      product: { select: { title: true, category: true } },
      buyer:   { select: { firstName: true, lastName: true, email: true } },
      seller:  { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const header = ['ID', 'Date', 'Statut', 'Article', 'Categorie', 'Acheteur', 'Email acheteur', 'Vendeur', 'Email vendeur', 'Montant vendeur (EUR)', 'Commission FlipIt (EUR)']
  const rows = orders.map(o => [
    o.id,
    new Date(o.updatedAt).toLocaleDateString('fr-FR'),
    o.status,
    `"${o.product.title.replace(/"/g, '""')}"`,
    o.product.category ?? '',
    `${o.buyer.firstName} ${o.buyer.lastName}`,
    o.buyer.email,
    `${o.seller.firstName} ${o.seller.lastName}`,
    o.seller.email,
    Number(o.finalPrice).toFixed(2),
    (Number(o.finalPrice) * 0.10).toFixed(2),
  ])

  const csv = [header, ...rows].map(r => r.join(';')).join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="flipit-finances-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
