import React from 'react';
import Header from '@/components/Header';
import './page.css'; // Adjust the path as necessary

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