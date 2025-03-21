import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/getSession';
import formidable from 'formidable';

// Désactivation du bodyParser pour cette route API, via les configurations de segment
export const runtime = 'edge'; // Définir le runtime pour utiliser la nouvelle configuration

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

    return NextResponse.json([user]);
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

    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 });
    }

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

    await prisma.user.delete({ where: { email: session.user.email } });

    return NextResponse.json({ message: 'User deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Error deleting user' }, { status: 500 });
  }
}
