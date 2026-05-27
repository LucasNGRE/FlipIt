import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/getSession";
import pusherServer from "@/lib/pusher-server";

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

    // Trouver la conversation entre cet acheteur et ce vendeur pour ce produit
    const conversation = await prisma.conversation.findFirst({
      where: {
        productId: productId,
        participants: { some: { id: Number(session.user.id) } },
      },
      include: { participants: { select: { id: true } } },
    });

    // Annuler toutes les offres précédentes (pending + accepted) entre ces deux participants
    // Nouvelle offre = on repart à zéro, comme sur Vinted/LBC
    if (conversation) {
      const participantIds = conversation.participants.map((p) => p.id);
      await prisma.offer.updateMany({
        where: {
          productId: productId,
          buyerId: { in: participantIds },
          status: { in: ["pending", "accepted"] },
        },
        data: { status: "rejected" },
      });

      // Notifier tous les participants que les offres ont été réinitialisées
      await pusherServer.trigger(
        `private-conversation-${conversation.id}`,
        "offers-reset",
        {}
      );
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
