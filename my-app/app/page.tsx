import * as React from "react"
import type { Metadata } from "next";
import SkateArticleGrid from "@/components/Articles/ArticleGrid";
import CheapItems from "@/components/Articles/CheapItems";
import AutoSlidingBanner from '@/components/Banner';
import FooterBanner from "@/components/FooterBanner";


export const metadata: Metadata = {
  title: "FlipIt",
  description: "Welcome home!",
};

const bannerImages = '/Banner/360_F_833576004_fzcOzQkYZCJ7qxSQuiaQQ5jqEhH0yhA0.jpg';


export default function Home() {
  return (
    <div>
      <AutoSlidingBanner image={bannerImages} />
      <SkateArticleGrid />
      <CheapItems />
      <FooterBanner />
    </div>
  );
}