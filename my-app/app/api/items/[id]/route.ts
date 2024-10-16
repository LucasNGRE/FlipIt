import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db'; // Vérifie que tu as le bon chemin d'importation

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
