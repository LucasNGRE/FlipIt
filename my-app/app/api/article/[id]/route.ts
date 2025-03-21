import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  // Log the received ID to check what ID is being passed in
  console.log(`Received request to fetch product with ID: ${id}`);

  try {
    // Fetch product from the database using Prisma
    const product = await prisma.product.findUnique({
      where: { id: Number(id) }, // Ensure the ID type matches your schema
      include: { images: true }, // Optionally include related data (e.g., images)
    });

    // Log the query result, whether it's found or not
    if (!product) {
      console.log(`Product with ID ${id} not found.`);
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    console.log('Product found:', product); // Log the found product details
    return NextResponse.json(product); // Return the product data as JSON
  } catch (error) {
    // Log any errors that occur during the database query
    console.error(`Error fetching product with ID ${id}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
