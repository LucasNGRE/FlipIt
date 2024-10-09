import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db'; // Assure-toi d'avoir un fichier lib/prisma.ts

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { userIds } = req.body;

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

      res.status(200).json(conversation);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de la création de la conversation' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Méthode ${req.method} non autorisée`);
  }
}
