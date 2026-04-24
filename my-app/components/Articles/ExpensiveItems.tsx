'use client'

import React, { useEffect, useState } from 'react'
import SkateArticleCard from './ArticleCard'

export default function ExpensiveItems() {
  const [articles, setArticles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        const filtered = data
          .filter((a: any) => a.price >= 100)
          .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        setArticles(filtered)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (!loading && articles.length === 0) return null

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 pb-20">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand mb-1">Premium</p>
          <h2 className="font-display text-3xl font-bold">100 € et plus</h2>
        </div>
        <a href="/?min=100" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-150">
          Voir tout →
        </a>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-muted animate-pulse aspect-[4/6]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {articles.map(product => (
            <SkateArticleCard key={product.id} {...product} user={product.user} />
          ))}
        </div>
      )}
    </section>
  )
}
