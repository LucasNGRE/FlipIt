"use client";
import React, { useEffect, useState } from "react";
import SkateArticleCard from "./ArticleCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel"; // Adjust the import path if needed

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

        // Sort articles by createdAt (newest first)
        const sortedArticles = data.sort(
          (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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

  if (loading) {
    return <p>Chargement des articles...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-6">Derniers Ajouts</h2>

      {/* Implement Carousel */}
      <Carousel className="relative">
        <CarouselContent>
          {articles.map((product) => (
            <CarouselItem key={product.id} className="min-w-[250px]"> {/* Adjust width if necessary */}
              <SkateArticleCard {...product} user={product.user} />
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* Navigation Buttons */}
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
}
