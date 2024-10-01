import React from 'react';
import Header from '@/components/Header';
import './page.css'; // Adjust the path as necessary
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Articles | FlipIt",
  description: "Browse items",
};

const ArticlePage: React.FC = () => {
  return (
    <div className="article-page">
      <Header />
      <main className="article-content">
        <h1>Article Title</h1>
        <p>Article content goes here...</p>
      </main>
    </div>
  );
};

export default ArticlePage;