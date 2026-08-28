export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db'; // Import de votre instance Prisma
import { getSession } from '@/lib/getSession'; // Suppose que vous avez une fonction pour obtenir la session
import { validateProductInput, MAX_IMAGES } from '@/lib/domain/products';

export async function POST(req: NextRequest) {
  try {
    // Récupérer la session utilisateur
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const formData = await req.formData();
    const photos = formData.getAll('photos') as File[];

    // Validation serveur des champs de l'annonce (titre, prix, énumérations).
    const validation = validateProductInput({
      title: formData.get('title'),
      price: formData.get('price'),
      condition: formData.get('condition'),
      category: formData.get('category'),
      description: formData.get('description'),
      brand: formData.get('brand'),
      size: formData.get('size'),
    });

    if (!validation.ok) {
      return NextResponse.json({ error: 'Données invalides', details: validation.errors }, { status: 400 });
    }

    const { title, brand, price, size, condition, category, description } = validation.value!;


    // convert photos to base64 (limitées au maximum autorisé côté formulaire)
    const photosBase64 = await Promise.all(photos.slice(0, MAX_IMAGES).map(async (photo) => {
      const buffer = await photo.arrayBuffer();
      return Buffer.from(buffer).toString('base64');
    }));

    // Creating the product
    const product = await prisma.product.create({
      data: {
      title,
      brand,
      price,
      size,
      condition,
      category,
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


