import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const cat = searchParams.get('cat');
    const q = searchParams.get('q');

    const products = await prisma.product.findMany({
      where: {
        ...(cat ? { category: cat as any } : {}),
        ...(q ? {
          OR: [
            { title:       { contains: q, mode: 'insensitive' } },
            { brand:       { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        } : {}),
      },
      include: {
        user: { select: { firstName: true, image: true } },
        images: { select: { url: true, altText: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(products, { status: 200 });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
