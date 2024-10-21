import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/getSession';

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
