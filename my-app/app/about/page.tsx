import React from 'react'
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | FlipIt",
  description: "About us",
};

const aboutUs = () => {
  return (
    <div>
      <img src="/public/about_us.png" alt="About us" />
    </div>
  )
}

export default aboutUs