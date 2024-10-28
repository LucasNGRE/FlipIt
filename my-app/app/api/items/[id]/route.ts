import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/getSession';
import prisma from '@/lib/db';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const productId = parseInt(params.id, 10); // Vérifie que l'ID est récupéré correctement

  if (isNaN(productId)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
  }

  try {
    const deletedProduct = await prisma.product.delete({
      where: { id: productId },
    });

    return NextResponse.json({ message: 'Produit supprimé avec succès', product: deletedProduct });
  } catch (error) {
    console.error('Erreur lors de la suppression du produit:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression du produit' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id, title, description, price, images, size } = await req.json();

    console.log('Data received for update:', { id, title, description, price, images });

    // Mettez à jour le produit avec les nouvelles données
    const updatedProduct = await prisma.product.update({
      where: { id: Number(id), userId: Number(session.user.id) },
      data: {
        title,
        description,
        price,
        size, // Ensure 'size' is included in the destructured object from req.json()
        images: {
          deleteMany: {}, // Supprimez les images existantes si nécessaire
          create: images.map((image: string) => ({ url: image })),
        },
      },
    });

    console.log('Updated Product:', updatedProduct);
    return NextResponse.json(updatedProduct, { status: 200 });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Récupérer la session utilisateur
    const session = await getSession();
    const productId = Number(params.id);

    // Récupérer le produit en fonction de l'ID
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        images: true, // Inclure les images associées au produit
        // Tu peux ajouter d'autres relations si nécessaire
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Produit non trouvé' }, { status: 404 });
    }

    // Vérifier si l'utilisateur est connecté et si le produit lui appartient
    if (session?.user?.id && product.userId !== Number(session.user.id)) {
      return NextResponse.json({ error: 'Produit non autorisé' }, { status: 403 });
    }

    return NextResponse.json(product, { status: 200 });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Échec de la récupération du produit' }, { status: 500 });
  }
}
