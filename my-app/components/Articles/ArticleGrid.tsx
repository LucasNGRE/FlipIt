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

  useEffect(() => {
    if (loading || !shouldScroll) return
    setShouldScroll(false)
    const el = document.getElementById('articles')
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - 80
    window.scrollTo({ top, behavior: 'smooth' })
  }, [loading, shouldScroll])

  useEffect(() => {
    if (urlCat || urlQ) setShouldScroll(true)
  }, [urlCat, urlQ])

  useEffect(() => {
    setSearch(urlQ)
  }, [urlQ])

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
    <section id="articles" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">

      {/* Header */}
      <div className="flex items-baseline justify-between mb-8">
        <div>
          <div
            className="font-mono text-[11px] uppercase tracking-[.14em] mb-2"
            style={{ color: 'var(--concrete-4)' }}
          >
            ↳ {categoryLabel ? categoryLabel.toUpperCase() : 'TOUT FRAIS'}
          </div>
          <h2
            className="font-display font-extrabold"
            style={{ fontSize: 40, letterSpacing: '-.025em', lineHeight: 1 }}
          >
            {categoryLabel ?? 'Drops du jour.'}
          </h2>
        </div>
        {!loading && (
          <span className="font-mono text-[11px]" style={{ color: 'var(--concrete-4)' }}>
            {filtered.length} article{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => updateSearch(e.target.value)}
            placeholder="Rechercher un article, une marque…"
            className="w-full rounded-lg border border-border bg-card pl-9 pr-9 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/15 transition-shadow placeholder:text-muted-foreground"
          />
          {search && (
            <button
              onClick={() => updateSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 flex-shrink-0">
          {CONDITIONS.map(c => (
            <button
              key={c.value}
              onClick={() => setCondition(c.value)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer border ${
                condition !== c.value ? 'border-border bg-card text-foreground/70 hover:text-foreground hover:border-foreground/30' : ''
              }`}
              style={
                condition === c.value
                  ? { background: 'var(--ink)', color: 'var(--paper)', borderColor: 'var(--ink)' }
                  : {}
              }
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
            <div key={i} className="rounded-lg bg-muted animate-pulse aspect-[4/6]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-muted-foreground text-sm">Aucun article ne correspond à ta recherche.</p>
          <button onClick={reset} className="mt-3 text-sm font-semibold text-foreground underline underline-offset-2 hover:opacity-70 cursor-pointer">
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
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-lg bg-muted animate-pulse aspect-[4/6]" />
          ))}
        </div>
      </section>
    }>
      <ArticleGridInner />
    </Suspense>
  )
}
