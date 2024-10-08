import React from 'react'
import SkateArticleCard from './ArticleCard'

const sampleArticles = [
  {
    id: "",
    title: "Vintage Skateboard Deck",
    price: 89.99,
    image: "/placeholder.svg?height=300&width=300",
    condition: "Good" as const,
    size: "8.5\"",
    seller: {
      name: "Tony H.",
      avatar: "/placeholder.svg?height=32&width=32"
    }
  },
  {
    id: "",
    title: "Pro Model Trucks",
    price: 54.99,
    image: "/placeholder.svg?height=300&width=300",
    condition: "Like New" as const,
    size: "149mm",
    seller: {
      name: "Rodney M.",
      avatar: "/placeholder.svg?height=32&width=32"
    }
  },
  {
    id: "",
    title: "Limited Edition Wheels",
    price: null,
    image: "/placeholder.svg?height=300&width=300",
    condition: "New" as const,
    size: "54mm",
    seller: {
      name: "Leticia B.",
      avatar: "/placeholder.svg?height=32&width=32"
    }
  },
  {
    id: "",
    title: "Skate Tool",
    price: 14.99,
    image: "/placeholder.svg?height=300&width=300",
    condition: "Good" as const,
    size: "One Size",
    seller: {
      name: "Nyjah H.",
      avatar: "/placeholder.svg?height=32&width=32"
    }
  }
]

export default function SkateArticleGrid() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-6">Derniers Articles ajoutés</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {sampleArticles.map((article, index) => (
          <SkateArticleCard key={index} {...article} />
        ))}
      </div>
    </div>
  )
}