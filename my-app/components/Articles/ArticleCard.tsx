import React from 'react'
import Link from 'next/link'

interface SkateArticleProps {
  id: string
  title: string
  price: number | null
  image: string
  condition: 'New' | 'Like New' | 'Good' | 'Fair' | 'Poor'
  size: string
  isNegotiable: boolean
  seller: {
    name: string
    avatar: string
  }
}

export default function SkateArticleCard({
  id,
  title,
  price,
  image,
  condition,
  size,
  isNegotiable,
  seller
}: SkateArticleProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:shadow-lg">
      <div className="aspect-square overflow-hidden">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
        />
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold truncate">{title}</h3>
        <div className="flex items-center justify-between">
          <p className="text-2xl font-bold text-green-600">
            {price !== null ? `$${price.toFixed(2)}` : 'Price not available'}
          </p>
          {isNegotiable && (
            <span className="text-xs text-blue-600 font-semibold">Negotiable</span>
          )}
        </div>
        <div className="mt-2 flex items-center space-x-2">
          <span className="inline-block px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-200 rounded-full">
            {condition}
          </span>
          <span className="inline-block px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded-full border border-gray-300">
            Size: {size}
          </span>
        </div>
      </div>
      <div className="px-4 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img
              src={seller.avatar}
              alt={seller.name}
              className="h-8 w-8 rounded-full object-cover"
            />
            <span className="text-sm text-gray-600">{seller.name}</span>
          </div>
          <div className="space-x-2">
            <Link href={`/buy/${id}`} className="inline-block px-3 py-1 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors">
              Buy
            </Link>
            <Link href={`/inbox/${id}`} className="inline-block px-3 py-1 text-sm font-medium text-green-600 bg-white border border-green-600 rounded hover:bg-green-50 transition-colors">
              Message
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}