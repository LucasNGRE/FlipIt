import * as React from "react"
import Header from "@/components/Header"
import type { Metadata } from "next";
import SkateArticleGrid from "@/components/Articles/ArticleGrid";

export const metadata: Metadata = {
  title: "FlipIt",
  description: "Welcome home!",
};


export default function Home() {
  return (
    <div>
      <Header />
        <SkateArticleGrid />
    </div>
  );
}