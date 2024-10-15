import React from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SkateArticleProps {
  id: string;
  title: string;
  price: number;
  images: { url: string; altText: string | null }[];
  condition: 'Neuf' | 'Comme neuf' | 'Bon état' | 'Moyen état' | 'Mauvais état';
  size: string;
  user: {
    userId: number;
    firstName: string;
    image: string;
  };
}

export default function SkateArticleCard({
  id,
  title,
  price,
  images,
  condition,
  size,
  user,
}: SkateArticleProps) {
  return (
    <div className="max-w-xs overflow-hidden rounded-lg border border-gray-300 bg-gray-100 text-card-foreground shadow-sm transition-all duration-300 hover:shadow-lg">
      <div className="aspect-square overflow-hidden">
        {images.length > 0 ? (
          <Link href={`/article/${id}`}>
            <img
              src={images[0].url}
              alt={images[0].altText || title}
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
            />
          </Link>
        ) : (
          <p className="text-center">Aucune image disponible</p>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4">
        <h3 className="text-lg font-semibold truncate" title={title}>
          {title}
        </h3>

        <div className="flex items-center justify-between">
          <p className="text-2xl font-bold text-primary">
            {price !== null ? `${price} €` : 'Prix non disponible'}
          </p>
        </div>

        <div className="mt-2 flex items-center space-x-2">
          <span className="inline-block px-2 py-1 text-xs font-semibold bg-muted text-muted-foreground rounded-full">
            {condition}
          </span>
          <span className="inline-block px-2 py-1 text-foreground text-xs font-semibold bg-muted rounded-full border border-border">
            Taille: {size}
          </span>
        </div>
      </div>

      {/* User Info */}
      <div className="px-4 py-3">
        <div className="flex items-center space-x-2">
          <Avatar>
            <AvatarImage src={user?.image} alt={user?.firstName} />
            <AvatarFallback>{user?.firstName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">{user?.firstName}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 py-3 space-x-2">
        <Link href={`/payment?amount=${price}&currency=EUR`}>
          <Button variant="secondary" size="sm" aria-label={`Acheter ${title}`}>
            Acheter
          </Button>
        </Link>
        <Link href="/inbox">
          <Button variant="default" size="sm" aria-label={`Message à ${user.firstName}`}>
            Message
          </Button>
        </Link>
      </div>
    </div>
  );
}
