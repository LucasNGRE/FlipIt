"use client";
import React, { useEffect, useState } from "react";
import SkateArticleCard from "./ArticleCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/homepage-carousel"; // Adjust the import path if needed

export default function SkateArticleGrid() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const response = await fetch("/api/products"); // Fetch from the public articles API
        if (!response.ok) throw new Error("Failed to fetch articles");
        const data = await response.json();

        // Filter articles that are priced under 20 euros
        const filteredArticles = data.filter((article: any) => article.price <= 20);

        // Sort the filtered articles by updatedAt (newest first)
        const sortedArticles = filteredArticles.sort(
          (a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );

        setArticles(sortedArticles);
      } catch (error) {
        console.error("Error fetching articles:", error);
        setError("Could not load articles.");
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold mb-6">Moins de 20 euros !</h2>
      
      {/* Keep everything inside the Carousel component */}
      <Carousel className="relative w-full overflow-hidden">
        <CarouselPrevious className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10" />
        
        <CarouselContent className="flex"> {/* Ensure items are aligned horizontally */}
          {articles.map((product) => (
            <CarouselItem key={product.id} className="min-w-[25%] p-4"> {/* Ensure 4 items per view */}
              <SkateArticleCard {...product} user={product.user} />
            </CarouselItem>
          ))}
        </CarouselContent>
        
        <CarouselNext className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10" />
      </Carousel>
    </div>
  );
}
