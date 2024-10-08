// pages/api/articles/index.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db'; // Your Prisma instance

export async function GET(req: NextRequest) {
  try {
    // Fetch all products with their owners (users)
    const products = await prisma.product.findMany({
      include: {
        user: {
          select: {
            firstName: true, // Select the name of the user
            image: true, // Select the avatar if needed
          },
        },
      },
    });
   
    // Check if articles exist
    if (!products.length) {
      return NextResponse.json({ error: 'No articles found' }, { status: 404 });
    }

    // Return the articles as a JSON response
    return NextResponse.json(products, { status: 200 });
  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
  }
}
