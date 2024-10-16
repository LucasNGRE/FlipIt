"use client";
import React, { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Heart, MessageCircle, Share2 } from 'lucide-react';
import Link from 'next/link';
import { OfferDialog } from '@/components/chat/offer-dialog';

interface ArticlePageProps {
  params: { id: string };
}

interface Article {
  id: number;
  title: string;
  price: number;
  description: string;
  images: { url: string; altText: string | null }[];
  condition: string;
  size: string;
  brand?: string;
  color?: string;
  material?: string;
  location?: string;
  userId: string;
  tags?: string[];
}

interface User {
  id: string;
  firstName: string;
  image: string;
}

// Fetch article by ID
async function fetchArticle(id: string): Promise<Article | null> {
  const res = await fetch(`/api/article/${id}`);

  if (!res.ok) {
    console.log(`Error fetching article with ID: ${id}`);
    return null;
  }

  const article: Article = await res.json();
  return article;
}

// Fetch user by ID
// Fetch user by ID (the seller)
async function fetchUser(userId: string): Promise<User | null> {
  const res = await fetch(`/api/user/${userId}`);

  if (!res.ok) {
    console.log(`Error fetching user with ID: ${userId}`);
    return null;
  }

  const user: User = await res.json();
  return user;
}


const ArticlePage: React.FC<ArticlePageProps> = ({ params }) => {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Fetch article data
  useEffect(() => {
    const fetchData = async () => {
      const fetchedArticle = await fetchArticle(params.id);
      setArticle(fetchedArticle);

      // Fetch user data once article is loaded
      if (fetchedArticle) {
        const fetchedUser = await fetchUser(fetchedArticle.userId);
        setUser(fetchedUser);
      }

      setLoading(false);
    };

    fetchData();
  }, [params.id]);

  if (loading) {
    return <div>Chargement...</div>;
  }

  if (!article) {
    return notFound(); // If no article is found, render a 404 page
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Left column - Image gallery */}
        <div>
          <Carousel className="w-full max-w-xl mx-auto">
            <CarouselContent>
              {article.images.map((image, index) => (
                <CarouselItem key={index}>
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="cursor-pointer">
                        <Image
                          src={image.url}
                          alt={image.altText || `${article.title} - Image ${index + 1}`}
                          width={600}
                          height={800}
                          className="rounded-lg object-cover w-full h-[600px]"
                        />
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <Image
                        src={image.url}
                        alt={image.altText || `${article.title} - Image ${index + 1}`}
                        width={800}
                        height={1000}
                        className="rounded-lg object-contain w-full h-full"
                      />
                    </DialogContent>
                  </Dialog>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
          <div className="flex justify-center mt-4 space-x-2">
            {article.images.map((_, index) => (
              <div
                key={index}
                className="w-2 h-2 rounded-full bg-gray-300"
                aria-hidden="true"
              />
            ))}
          </div>
        </div>

        {/* Right column - Article details */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{article.title}</h1>
            <p className="text-2xl font-bold mt-2">{article.price} €</p>
          </div>

          <div className="flex items-center justify-between">
            <Button onClick={() => setIsLiked(!isLiked)}>
              <Heart className={`mr-2 h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
              {isLiked ? 'Liked' : 'Like'}
            </Button>
            <Button variant="outline">
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Détails de l'article</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div><span className="font-semibold">Size:</span> {article.size}</div>
              <div><span className="font-semibold">Condition:</span> {article.condition}</div>
              {article.brand && <div><span className="font-semibold">Brand:</span> {article.brand}</div>}
              {article.color && <div><span className="font-semibold">Color:</span> {article.color}</div>}
              {article.material && <div><span className="font-semibold">Material:</span> {article.material}</div>}
              {article.location && <div><span className="font-semibold">Location:</span> {article.location}</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{article.description}</p>
            </CardContent>
          </Card>

          {article.tags && (
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Information du vendeur</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <Avatar>
                  <AvatarImage src={user?.image} alt={user?.firstName} />
                  <AvatarFallback>{user?.firstName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{user?.firstName}</p>
                </div>
              </div>
              <Link href="/inbox">
                <Button className="w-full mt-4" variant="outline">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Contacter le vendeur
                </Button>
              </Link>
            </CardContent>
          </Card>


          <div className="space-y-4">
            <Link href={`/payment?amount=${article.price}&currency=EUR`}>
              <Button className="w-full" size="lg">Acheter maintenant</Button>
            </Link>
              <Button variant="outline" className="w-full" size="lg">
                <OfferDialog productId={article.id} onOfferSubmit={(offer) => console.log('Offer submitted:', offer)}>
                </OfferDialog>
              </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArticlePage;
