import * as React from "react"
import Header from "@/components/Header"
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FlipIt",
  description: "Welcome home!",
};


export default function Home() {
  return (
    <div>
      <Header />
    </div>
  );
}