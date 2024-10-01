import * as React from "react"
import type { Metadata } from "next";
import SkateArticleGrid from "@/components/Articles/ArticleGrid";

export const metadata: Metadata = {
  title: "FlipIt",
  description: "Welcome home!",
};


export default function Home() {
  return (
    <div>
        <SkateArticleGrid />
    </div>
  );
}