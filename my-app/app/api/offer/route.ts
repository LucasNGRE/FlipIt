import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db"; // Votre instance Prisma
import { getSession } from "@/lib/getSession"; // Suppose que vous avez une fonction pour obtenir la session

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(); // Récupère la session utilisateur

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { offerPrice, productId } = await req.json();

    if (!offerPrice || !productId) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // Récupérer le produit pour vérifier que l'utilisateur ne fait pas une offre sur son propre produit
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { userId: true } // On a juste besoin de l'ID du vendeur
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Vérifier si l'utilisateur connecté est le propriétaire du produit
    if (product.userId === Number(session.user.id)) {
      return NextResponse.json({ error: "You cannot make an offer on your own product" }, { status: 403 });
    }

    // Enregistrement de l'offre dans la base de données
    const offer = await prisma.offer.create({
      data: {
        offerPrice: parseFloat(offerPrice),
        productId: productId,
        buyerId: Number(session.user.id), // Associe l'offre à l'utilisateur connecté
      },
    });

    return NextResponse.json(offer, { status: 201 });
  } catch (error) {
    console.error("Error creating offer:", error);
    return NextResponse.json({ error: "Failed to create offer" }, { status: 500 });
  }
}
