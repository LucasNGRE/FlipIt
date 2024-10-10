"use client";
import React, { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';

interface ArticlePageProps {
  params: { id: string };
}

interface Article {
  title: string;
  price: number;
  description: string;
  images: { url: string; altText: string | null }[];
}

async function fetchArticle(id: string): Promise<Article | null> {
  // Log the ID to check what's being passed
  console.log(`Fetching article with ID: ${id}`);

  // Fetch article from API
  const res = await fetch(`/api/article/${id}`);

  if (!res.ok) {
    console.log(`Error fetching article with ID: ${id}`);
    return null;
  }

  const article: Article = await res.json();
  console.log('Fetched article:', article); // Log the fetched article
  return article;
}

const ArticlePage: React.FC<ArticlePageProps> = ({ params }) => {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const fetchedArticle = await fetchArticle(params.id);
      setArticle(fetchedArticle);
      setLoading(false);
    };

    fetchData();
  }, [params.id]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!article) {
    return notFound(); // If no article is found, render a 404 page
  }

  return (
    <div>
      <h1>{article.title}</h1>
      <p>Price: {article.price} €</p>
      <p>Description: {article.description}</p>
      <div>
        {article.images.map((image, index) => (
          <img key={index} src={image.url} alt={image.altText || 'Article Image'} />
        ))}
      </div>
    </div>
  );
};

export default ArticlePage;
