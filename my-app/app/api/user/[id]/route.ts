import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Fetch user by ID
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  try {
    // Fetch user data from the database using the provided ID
    const user = await prisma.user.findUnique({
      where: { id: Number(id) },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        image: true, // Add any other fields you want to retrieve
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Error fetching user data' }, { status: 500 });
  }
}
