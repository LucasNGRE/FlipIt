import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Cette fonction permet de récupérer un article (ou produit) par son ID
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  // Log pour vérifier l'ID reçu
  console.log(`Received request to fetch product with ID: ${id}`);

  try {
    // Vérifier si l'ID est valide avant de l'utiliser dans la requête
    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: 'Invalid or missing ID' }, { status: 400 });
    }

    // Requête Prisma pour récupérer le produit
    const product = await prisma.product.findUnique({
      where: { id: Number(id) },
      include: { images: true },
    });

    if (!product) {
      console.log(`Product with ID ${id} not found.`);
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    console.log('Product found:', product);
    return NextResponse.json(product);
  } catch (error) {
    console.error(`Error fetching product with ID ${id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
