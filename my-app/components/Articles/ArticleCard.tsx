import React from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";

interface SkateArticleProps {
  id: string;
  title: string;
  price: number;
  image: string;
  condition: 'Neuf' | 'Comme neuf' | 'Bon état' | 'Moyen état' | 'Mauvais état';
  size: string;
  user: {
    userId: number;
    firstName: string;
    image: string;
  };
}
// console.log(SkateArticleProps);
export default function SkateArticleCard({
  id,
  title,
  price,
  image,
  condition,
  size,
  user,
}: SkateArticleProps) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:shadow-lg">
      <div className="aspect-square overflow-hidden">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
        />
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold truncate" title={title}>{title}</h3>
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
      <div className="px-4 py-3 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img
              src={user.image}
              alt={`Avatar of ${user.firstName}`}
              className="h-8 w-8 rounded-full object-cover"
            />
            <span className="text-sm text-muted-foreground">{user.firstName}</span>
          </div>
          <div className="space-x-2">
            <Link href={`/buy/${id}`}>
              <Button variant="secondary" size="sm" aria-label={`Acheter ${title}`}>
                Acheter
              </Button>
            </Link>
            <Link href={`/inbox/${id}`}>
              <Button variant="default" size="sm" aria-label={`Message à ${user.firstName}`}>
                Message
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
