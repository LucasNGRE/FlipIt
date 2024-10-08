// app/item-summary/[id]/page.tsx

import { useRouter } from 'next/navigation';
import Image from 'next/image';

type Item = {
  id: string;
  title: string;
  brand: string;
  price: string;
  size: string;
  condition: string;
  description?: string;
  photos: string[];
};

export default async function ItemSummary({ params }: { params: { id: string } }) {
  const response = await fetch(`http://localhost:3000/api/items/${params.id}`); // Adjust the URL to your API endpoint

  if (!response.ok) {
    return <div>Item not found.</div>;
  }

  const item: Item = await response.json();

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-card rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">{item.title}</h2>
      <div className="mb-4">
        {item.photos.length > 0 && (
          <Image
            src={item.photos[0]}
            alt={`Image of ${item.title}`}
            width={400}
            height={400}
            objectFit="cover"
            className="rounded-lg"
          />
        )}
      </div>
      <p><strong>Marque:</strong> {item.brand}</p>
      <p><strong>Prix:</strong> {item.price} €</p>
      <p><strong>Taille:</strong> {item.size}</p>
      <p><strong>État:</strong> {item.condition}</p>
      {item.description && <p><strong>Description:</strong> {item.description}</p>}
      <div className="mt-6">
        <button onClick={() => window.history.back()} className="btn">
          Retour à la liste
        </button>
      </div>
    </div>
  );
}
