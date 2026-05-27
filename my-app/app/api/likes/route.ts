import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db'

// GET /api/likes — liste des produits likés par l'utilisateur connecté
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json([], { status: 200 })

  const userId = parseInt(session.user.id)

  const likes = await prisma.like.findMany({
    where: { userId },
    include: {
      product: {
        include: {
          images: { select: { url: true, altText: true } },
          user:   { select: { firstName: true, image: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(likes.map(l => l.product))
}

// POST /api/likes — toggle like sur un produit { productId }
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })

  const { productId } = await req.json()
  if (!productId) return NextResponse.json({ error: 'productId requis' }, { status: 400 })

  const userId = parseInt(session.user.id)

  const existing = await prisma.like.findUnique({
    where: { userId_productId: { userId, productId } },
  })

  if (existing) {
    await prisma.like.delete({ where: { userId_productId: { userId, productId } } })
    return NextResponse.json({ liked: false })
  } else {
    await prisma.like.create({ data: { userId, productId } })
    return NextResponse.json({ liked: true })
  }
}
