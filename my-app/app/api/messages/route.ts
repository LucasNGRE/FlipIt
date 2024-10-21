import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { content, senderId, conversationId, productId } = req.body; // Inclure productId ici

    try {
      const message = await prisma.message.create({
        data: {
          content,
          user: { connect: { id: senderId } }, // Connexion à l'utilisateur
          conversation: { connect: { id: conversationId } }, // Connexion à la conversation
          product: { connect: { id: productId } }, // Connexion au produit
        },
      });

      res.status(200).json(message);
    } catch (error) {
      console.error(error); // Ajoutez cela pour aider à déboguer
      res.status(500).json({ error: 'Erreur lors de l\'envoi du message' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Méthode ${req.method} non autorisée`);
  }
}
