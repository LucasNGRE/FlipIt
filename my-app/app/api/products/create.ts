// app/api/products/create.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/getSession';
import prisma from '@/lib/db'; // Instance de Prisma Client

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: "Method Not Allowed" }); // Gérer les méthodes non autorisées
  }

  const session = await getSession();

  if (!session) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { title, description, price, status } = req.body;

  try {
    const product = await prisma.product.create({
      data: {
        title,
        description,
        price,
        status,
        user: {
          connect: { email: session.user?.email! },
        },
      },
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: "Error creating product", error });
  }
}
