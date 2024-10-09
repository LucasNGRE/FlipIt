import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db'; // Import de votre instance Prisma
import { getSession } from '@/lib/getSession'; // Suppose que vous avez une fonction pour obtenir la session

export async function POST(req: NextRequest) {
  try {
    // Récupérer la session utilisateur
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { title, brand, price, size, condition, photos, description } = await req.json();

    // Creating the product
    const product = await prisma.product.create({
      data: {
        title,
        brand,
        price: parseFloat(price),
        size,
        condition: condition,
        description,
        userId: Number(session.user.id),
        images: {
          create: photos.map((url: string) => ({
            url, // Storing the URL of each image
          })),
        },
      },
    });


    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) { // Fonction pour mettre à jour un produit
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id, title, description, price, status } = await req.json();

    const updatedProduct = await prisma.product.update({
      where: { id: Number(id), userId: Number(session.user.id) },
      data: { title, description, price },
    });

    return NextResponse.json(updatedProduct, { status: 200 });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) { // Fonction pour supprimer un produit
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await req.json();

    await prisma.product.delete({
      where: { id: Number(id), userId: Number(session.user.id) },
    });

    return NextResponse.json({ message: 'Product deleted' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}

