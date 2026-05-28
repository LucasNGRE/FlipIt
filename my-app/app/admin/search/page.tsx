'use client'

import { useState } from 'react'
import { Search, User, Package, ShoppingBag } from 'lucide-react'

interface SearchResults {
  users: { id: number; firstName: string; lastName: string; email: string; image: string | null; suspended: boolean }[]
  orders: { id: number; finalPrice: string; status: string; product: { title: string }; buyer: { firstName: string; lastName: string } }[]
  products: { id: number; title: string; price: number; status: string; images: { url: string }[]; user: { firstName: string; lastName: string } }[]
}

export default function AdminSearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)

  const search = async (q: string) => {
    setQuery(q)
    if (q.length < 2) { setResults(null); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`)
      if (res.ok) setResults(await res.json())
    } finally {
      setLoading(false)
    }
  }

  const total = results ? results.users.length + results.orders.length + results.products.length : 0

  return (
    <div className="px-4 sm:px-8 py-10 max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl tracking-tight mb-1" style={{ color: 'var(--ink)' }}>Recherche globale</h1>
        <p className="text-sm" style={{ color: 'var(--concrete-4)' }}>Email, nom, ID commande, titre article</p>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--concrete-3)' }} />
        <input
          type="text"
          value={query}
          onChange={e => search(e.target.value)}
          placeholder="Rechercher…"
          autoFocus
          className="w-full rounded-2xl border pl-11 pr-4 py-3.5 text-sm outline-none focus:ring-2"
          style={{ borderColor: 'rgba(0,0,0,.12)', background: 'var(--snow)', color: 'var(--ink)' }}
        />
      </div>

      {loading && (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'var(--paper-2)' }} />)}</div>
      )}

      {!loading && results && total === 0 && (
        <p className="text-sm text-center py-8" style={{ color: 'var(--concrete-4)' }}>Aucun résultat pour « {query} »</p>
      )}

      {!loading && results && total > 0 && (
        <div className="space-y-6">
          {results.users.length > 0 && (
            <section>
              <p className="font-mono text-[11px] uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: 'var(--concrete-3)' }}>
                <User className="h-3.5 w-3.5" /> Utilisateurs ({results.users.length})
              </p>
              <div className="space-y-2">
                {results.users.map(u => (
                  <div key={u.id} className="flex items-center justify-between rounded-xl p-3 border" style={{ background: 'var(--snow)', borderColor: 'rgba(0,0,0,.06)' }}>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{u.firstName} {u.lastName}</p>
                      <p className="text-xs" style={{ color: 'var(--concrete-3)' }}>{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {u.suspended && <span className="text-[11px] font-semibold rounded-full px-2 py-0.5" style={{ background: '#fee2e2', color: '#991b1b' }}>Suspendu</span>}
                      <span className="text-xs font-mono" style={{ color: 'var(--concrete-3)' }}>#{u.id}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {results.orders.length > 0 && (
            <section>
              <p className="font-mono text-[11px] uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: 'var(--concrete-3)' }}>
                <ShoppingBag className="h-3.5 w-3.5" /> Commandes ({results.orders.length})
              </p>
              <div className="space-y-2">
                {results.orders.map(o => (
                  <div key={o.id} className="flex items-center justify-between rounded-xl p-3 border" style={{ background: 'var(--snow)', borderColor: 'rgba(0,0,0,.06)' }}>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{o.product.title}</p>
                      <p className="text-xs" style={{ color: 'var(--concrete-3)' }}>{o.buyer.firstName} {o.buyer.lastName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-sm" style={{ color: 'var(--ink)' }}>{Number(o.finalPrice).toFixed(2)} €</p>
                      <p className="text-xs font-mono" style={{ color: 'var(--concrete-3)' }}>#{o.id}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {results.products.length > 0 && (
            <section>
              <p className="font-mono text-[11px] uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: 'var(--concrete-3)' }}>
                <Package className="h-3.5 w-3.5" /> Annonces ({results.products.length})
              </p>
              <div className="space-y-2">
                {results.products.map(p => (
                  <div key={p.id} className="flex items-center gap-3 rounded-xl p-3 border" style={{ background: 'var(--snow)', borderColor: 'rgba(0,0,0,.06)' }}>
                    <div className="h-10 w-10 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'var(--paper-2)' }}>
                      {p.images[0]
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={p.images[0].url} alt={p.title} className="h-full w-full object-cover" />
                        : <div className="h-full flex items-center justify-center"><Package className="h-4 w-4" style={{ color: 'var(--concrete-2)' }} /></div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: 'var(--ink)' }}>{p.title}</p>
                      <p className="text-xs" style={{ color: 'var(--concrete-3)' }}>{p.user.firstName} {p.user.lastName}</p>
                    </div>
                    <p className="font-mono font-bold text-sm" style={{ color: 'var(--ink)' }}>{Number(p.price).toFixed(2)} €</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
