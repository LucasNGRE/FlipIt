import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/getSession';
import formidable from 'formidable';

// Nouvelle méthode pour définir le bodyParser et autres configurations
export function generateConfig() {
  return {
    api: {
      bodyParser: false, // Désactive le bodyParser comme avant
    },
  };
}

// Définir la configuration de l'API dans la route
export const config = generateConfig();

export async function GET() {
  try {
    const session = await getSession();

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Renvoyer un tableau contenant l'utilisateur
    return NextResponse.json([user]); // Modifié pour renvoyer un tableau
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching user data' }, { status: 500 });
  }
}

// Fonction PUT pour mettre à jour les données utilisateur
export async function PUT(request: Request) {
  try {
    const session = await getSession();

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const { firstName, lastName } = await request.json();

    // Validation des données
    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 });
    }

    // Mettre à jour les informations de l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        firstName,
        lastName,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    return NextResponse.json({ error: 'Error updating user data' }, { status: 500 });
  }
}

// Fonction DELETE pour supprimer un utilisateur
export async function DELETE() {
  try {
    const session = await getSession();

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Supprimer l'utilisateur
    await prisma.user.delete({ where: { email: session.user.email } });

    return NextResponse.json({ message: 'User deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Error deleting user' }, { status: 500 });
  }
}
