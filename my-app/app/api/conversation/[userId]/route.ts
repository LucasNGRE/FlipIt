import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  const { userId } = params;

  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            id: parseInt(userId), // Conversion de userId en entier
          },
        },
      },
      include: {
        participants: true,
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    return NextResponse.json(conversations);
  } catch (error) {
    return NextResponse.json({ error: 'Erreur lors de la récupération des conversations' }, { status: 500 });
  }
}
