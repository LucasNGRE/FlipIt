'use client'

import React, { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import SkateArticleCard from './ArticleCard'

const CONDITIONS = [
  { value: 'all',          label: 'Tous' },
  { value: 'Neuf',         label: 'Neuf' },
  { value: 'Comme_neuf',   label: 'Comme neuf' },
  { value: 'Bon_etat',     label: 'Bon état' },
  { value: 'Moyen_etat',   label: 'Moyen état' },
  { value: 'Mauvais_etat', label: 'Mauvais état' },
]

function ArticleGridInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const urlCat = searchParams.get('cat') ?? ''
  const urlQ   = searchParams.get('q')   ?? ''

  const [articles, setArticles]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState(urlQ)
  const [condition, setCondition] = useState('all')
  const [shouldScroll, setShouldScroll] = useState(!!(urlCat || urlQ))

  // Re-fetch when category changes, then scroll to results if a filter is active
  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (urlCat) params.set('cat', urlCat)
    fetch(`/api/products?${params}`)
      .then(r => r.ok ? r.json() : [])
      .then(setArticles)
      .catch(() => setArticles([]))
      .finally(() => setLoading(false))
  }, [urlCat])

  // Scroll after articles are loaded (not before)
  useEffect(() => {
    if (loading || !shouldScroll) return
    setShouldScroll(false)
    const el = document.getElementById('articles')
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - 80
    window.scrollTo({ top, behavior: 'smooth' })
  }, [loading, shouldScroll])

  // Mark scroll needed when URL filters change
  useEffect(() => {
    if (urlCat || urlQ) setShouldScroll(true)
  }, [urlCat, urlQ])

  // Sync text search from URL
  useEffect(() => {
    setSearch(urlQ)
  }, [urlQ])

  // Client-side filter: text + condition
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return articles.filter(a => {
      const matchSearch    = !q || a.title?.toLowerCase().includes(q) || a.brand?.toLowerCase().includes(q)
      const matchCondition = condition === 'all' || a.condition === condition
      return matchSearch && matchCondition
    })
  }, [articles, search, condition])

  const updateSearch = (value: string) => {
    setSearch(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value.trim()) params.set('q', value.trim())
    else params.delete('q')
    router.replace(`/?${params}`, { scroll: false })
  }

  const reset = () => {
    setSearch('')
    setCondition('all')
    router.replace('/', { scroll: false })
  }

  const categoryLabel = urlCat
    ? { Deck: 'Decks', Truck: 'Trucks', Roue: 'Roues', Chaussure: 'Chaussures', Vetement: 'Vêtements', Accessoire: 'Accessoires' }[urlCat] ?? urlCat
    : null

  return (
    <section id="articles" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">

      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand mb-1">
            {categoryLabel ?? 'Nouveautés'}
          </p>
          <h2 className="font-display text-3xl font-bold">
            {categoryLabel ?? 'Derniers ajouts'}
          </h2>
        </div>
        {!loading && (
          <span className="text-sm text-muted-foreground">
            {filtered.length} article{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => updateSearch(e.target.value)}
            placeholder="Rechercher un article, une marque…"
            className="w-full rounded-xl border border-border bg-background pl-9 pr-9 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/40 transition-shadow"
          />
          {search && (
            <button onClick={() => updateSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 flex-shrink-0">
          {CONDITIONS.map(c => (
            <button
              key={c.value}
              onClick={() => setCondition(c.value)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-150 cursor-pointer ${
                condition === c.value
                  ? 'bg-brand text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-muted animate-pulse aspect-[4/6]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-muted-foreground text-sm">Aucun article ne correspond à ta recherche.</p>
          <button onClick={reset} className="mt-3 text-sm font-medium text-brand hover:underline cursor-pointer">
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(product => (
            <SkateArticleCard key={product.id} {...product} user={product.user} />
          ))}
        </div>
      )}
    </section>
  )
}

export default function SkateArticleGrid() {
  return (
    <Suspense fallback={
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-muted animate-pulse aspect-[4/6]" />
          ))}
        </div>
      </section>
    }>
      <ArticleGridInner />
    </Suspense>
  )
}
