import prisma from "@/lib/db"; // Assurez-vous d'importer correctement votre client Prisma
import { getSession } from "@/lib/getSession"; // Assurez-vous d'importer correctement la fonction de récupération de session
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const res = NextResponse.json({}); // Créez une réponse vide pour utiliser plus tard
  const session = await getSession(); // Passez req pour obtenir la session

  // if (!session) {
  //   return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  // }

  const { title, description, price, status } = await req.json(); // Obtenir le corps de la requête

  console.log('Session:', session); // Afficher la session pour vérification
  console.log('Received Data:', { title, description, price, status }); // Afficher les données reçues

  try {
    const product = await prisma.product.create({
      data: {
        title,
        description,
        price,
        status,
        user: {
          // connect: { email: session.user?.email! }, // Connexion de l'utilisateur par email
        },
      },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error); // Afficher l'erreur pour débogage
    return NextResponse.json({ message: "Error creating product", error }, { status: 500 });
  }
}
