import { NextResponse } from 'next/server';
import prisma from '@/lib/db'; // Votre instance Prisma

export async function POST(request: Request) {
  try {
    const { id, accepted } = await request.json();

    // Vérifier que l'ID de l'offre est valide
    const offer = await prisma.offer.findUnique({
      where: { id: Number(id) },
    });

    if (!offer) {
      return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    }

    // Mettre à jour l'état de l'offre en fonction de la valeur de 'accepted'
    const updatedOffer = await prisma.offer.update({
      where: { id: Number(id) },
      data: {
        status: accepted ? 'accepted' : 'rejected', // Met à jour en fonction de 'accepted'
      },
    });

    return NextResponse.json({ message: "Offer status updated successfully", offer: updatedOffer });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update offer status" }, { status: 500 });
  }
}
