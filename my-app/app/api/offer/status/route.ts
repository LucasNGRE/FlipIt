// app/api/offer/status/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { id, accepted } = await request.json();

    // Logique pour traiter l'offre ici, par exemple mettre à jour une base de données
    console.log(`ID de l'offre : ${id}, Acceptée : ${accepted}`);

    return NextResponse.json({ message: 'État de l\'offre mis à jour avec succès' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Erreur lors du traitement de la requête' }, { status: 500 });
  }
}
