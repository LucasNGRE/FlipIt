import { NextResponse } from 'next/server';  // Utilise NextResponse pour la réponse
import prisma from '@/lib/db';  // Assure-toi que le chemin d'importation est correct

// Fonction POST pour créer une conversation
export async function POST(req: Request) {
  const { userIds } = await req.json();  // Récupère les données du corps de la requête

  try {
    const conversation = await prisma.conversation.create({
      data: {
        participants: {
          connect: userIds.map((id: number) => ({ id })),
        },
      },
      include: {
        participants: true,
        messages: true,
      },
    });

    return NextResponse.json(conversation);  // Renvoie la réponse sous forme de JSON
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors de la création de la conversation' },
      { status: 500 }
    );
  }
}

// Si tu souhaites autoriser d'autres méthodes comme GET, tu peux les définir ici
// Exemple pour GET :
/* export async function GET() {
  // Logique pour gérer la méthode GET ici
  return NextResponse.json({ message: 'GET request received' });
} */
