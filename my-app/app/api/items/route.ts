import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db'; // Import de votre instance Prisma
import { getSession } from '@/lib/getSession'; // Suppose que vous avez une fonction pour obtenir la session

export async function POST(req: NextRequest) {
  try {
    // Récupérer la session utilisateur
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const formData = await req.formData();
    const title = formData.get('title') as string;
    const brand = formData.get('brand') as string;
    const price = parseFloat(formData.get('price') as string);
    const size = formData.get('size') as string;
    const condition = formData.get('condition') as string;
    const description = formData.get('description') as string;
    const photos = formData.getAll('photos') as File[];


    // convert photos to base64
    const photosBase64 = await Promise.all(photos.map(async (photo) => {
      const buffer = await photo.arrayBuffer();
      return Buffer.from(buffer).toString('base64');
    }));

    console.log('photosBase64:', photosBase64[0]);


    // Creating the product
    const product = await prisma.product.create({
      data: {
      title,
      brand,
      price,
      size,
      condition: condition as any,
      description,
      userId: Number(session.user.id),
      images: {
        createMany: {
        data: photosBase64.map((photo) => {
          return { url: 'data:image/jpeg;base64,' + photo };
        }),
        },
      },
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) { // Fonction pour mettre à jour un produit
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id, title, description, price, status } = await req.json();

    const updatedProduct = await prisma.product.update({
      where: { id: Number(id), userId: Number(session.user.id) },
      data: { title, description, price },
    });

    return NextResponse.json(updatedProduct, { status: 200 });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) { 
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await req.json();

    // Vérifie si le produit existe et appartient à l'utilisateur
    const product = await prisma.product.findUnique({
      where: { id: Number(id) },
      include: {
        images: true, // Inclut les images associées au produit
      },
    });

    if (!product || product.userId !== Number(session.user.id)) {
      return NextResponse.json({ error: 'Produit non trouvé ou non autorisé' }, { status: 404 });
    }

    // Supprime les images associées au produit
    await prisma.productImage.deleteMany({
      where: { productId: Number(id) },
    });

    // Supprime le produit
    await prisma.product.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ message: 'Produit et images supprimés' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Échec de la suppression du produit' }, { status: 500 });
  }
}


