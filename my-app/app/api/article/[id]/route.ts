import { NextResponse } from 'next/server';
import prisma from '@/lib/db'; // Import Prisma client

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  // Log the received ID to check what ID is being passed in
  console.log(`Received request to fetch article with ID: ${id}`);

  try {
    // Fetch article from the database using Prisma
    const article = await prisma.product.findUnique({
      where: { id: Number(id) }, // Make sure the ID type matches your schema (assuming it's a number)
      include: { images: true },
    });

    // Log the query result, whether it's found or not
    if (!article) {
      console.log(`Article with ID ${id} not found.`);
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    console.log('Article found:', article); // Log the found article details
    return NextResponse.json(article);
  } catch (error) {
    // Log any errors that occur during the database query
    console.error(`Error fetching article with ID ${id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
