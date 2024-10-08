import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db'; // Ton instance Prisma
import { getSession } from '@/lib/getSession'; // Fonction pour obtenir la session utilisateur

// Route pour récupérer les produits de l'utilisateur connecté
export async function GET(req: NextRequest) {
  try {
    // Récupérer la session pour vérifier si l'utilisateur est connecté
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Récupérer les produits (annonces) de l'utilisateur connecté
    const products = await prisma.product.findMany({
      where: {
        userId: Number(session.user.id), // Associer les produits à l'ID utilisateur
      },
    });

    if (!products) {
      return NextResponse.json({ error: 'No products found' }, { status: 404 });
    }

    // Retourner les produits en réponse
    return NextResponse.json(products, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la récupération des produits:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
