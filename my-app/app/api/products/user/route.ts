// app/api/products/user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db'; // Votre instance Prisma
import { getSession } from '@/lib/getSession'; // Importez votre fonction de récupération de session

// Cette ligne permet d'éviter la génération statique et de traiter la route dynamiquement
export const dynamic = 'force-dynamic'; // Indique que cette route est dynamique

export async function GET(req: NextRequest) {
  try {
    // Récupérer la session de l'utilisateur connecté
    const session = await getSession();

    // Vérifiez si l'utilisateur est connecté
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Utilisateur non connecté' }, { status: 401 });
    }

    // Récupérer les produits de l'utilisateur connecté
    const products = await prisma.product.findMany({
      where: {
        userId: Number(session.user.id), // Utilisez l'ID de l'utilisateur connecté
      },
      include: {
        user: {
          select: {
            firstName: true,
            image: true,
          },
        },
        images: { // Inclure les images dans la requête
          select: {
            url: true,
            altText: true,
          },
        },
      },
    });

    // Vérifiez si l'utilisateur a des produits
    if (!products.length) {
      return NextResponse.json({ error: 'Aucune annonce trouvée pour cet utilisateur' }, { status: 404 });
    }

    // Retourner les produits de l'utilisateur
    return NextResponse.json(products, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la récupération des produits de l’utilisateur:', error);
    return NextResponse.json({ error: 'Échec de la récupération des produits de l’utilisateur' }, { status: 500 });
  }
}
