import { NextResponse } from 'next/server';  // Utilise NextResponse pour la réponse
import prisma from '@/lib/db';  // Assure-toi que le chemin d'importation est correct

// Fonction POST pour envoyer un message
export async function POST(req: Request) {
  const { content, senderId, conversationId, productId } = await req.json(); // Récupère les données du corps de la requête

  try {
    const message = await prisma.message.create({
      data: {
        content,
        user: { connect: { id: senderId } }, // Connexion à l'utilisateur
        conversation: { connect: { id: conversationId } }, // Connexion à la conversation
        product: { connect: { id: productId } }, // Connexion au produit
      },
    });

    return NextResponse.json(message);  // Renvoie la réponse sous forme de JSON
  } catch (error) {
    console.error(error); // Log pour déboguer
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi du message' },
      { status: 500 }
    );
  }
}
