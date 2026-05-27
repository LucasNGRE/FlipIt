import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/db'

// GET /api/likes/:productId — vérifie si l'utilisateur a liké ce produit
export async function GET(_req: NextRequest, { params }: { params: { productId: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ liked: false })

  const userId    = parseInt(session.user.id)
  const productId = parseInt(params.productId)

  const like = await prisma.like.findUnique({
    where: { userId_productId: { userId, productId } },
  })

  return NextResponse.json({ liked: !!like })
}
