'use client'

import { useEffect, useState } from 'react'
import { Package, Trash2 } from 'lucide-react'

interface Product {
  id: number
  title: string
  price: number
  status: string
  condition: string
  category: string
  createdAt: string
  images: { url: string }[]
  user: { id: number; firstName: string; lastName: string }
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  available: { label: 'Disponible', color: '#065f46', bg: '#d1fae5' },
  reserved:  { label: 'Réservé',    color: '#92400e', bg: '#fef3c7' },
  sold:      { label: 'Vendu',      color: '#6b7280', bg: '#f3f4f6' },
}

const FILTERS = [
  { value: '', label: 'Toutes' },
  { value: 'available', label: 'Disponibles' },
  { value: 'reserved', label: 'Réservées' },
  { value: 'sold', label: 'Vendues' },
]

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/products${filter ? `?status=${filter}` : ''}`)
      .then(r => r.ok ? r.json() : [])
      .then(setProducts)
      .finally(() => setLoading(false))
  }, [filter])

  const deleteProduct = async (id: number) => {
    if (!confirm('Supprimer cette annonce définitivement ?')) return
    setDeletingId(id)
    try {
      const res = await fetch('/api/admin/products', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      if (res.ok) setProducts(prev => prev.filter(p => p.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="px-8 py-10">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl tracking-tight" style={{ color: 'var(--ink)' }}>Annonces</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--concrete-4)' }}>{products.length} annonce{products.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className="px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all border"
            style={{
              background: filter === f.value ? 'var(--ink)' : 'transparent',
              color: filter === f.value ? 'var(--paper)' : 'var(--concrete-4)',
              borderColor: filter === f.value ? 'var(--ink)' : 'rgba(0,0,0,.12)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-52 rounded-2xl animate-pulse" style={{ background: 'var(--paper-2)' }} />)}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed py-16 text-center" style={{ borderColor: 'var(--concrete-2)' }}>
          <Package className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--concrete-2)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--concrete-4)' }}>Aucune annonce</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(p => {
            const meta = STATUS_META[p.status] ?? { label: p.status, color: '#6b7280', bg: '#f3f4f6' }
            return (
              <div key={p.id} className="rounded-2xl border overflow-hidden group" style={{ background: 'var(--snow)', borderColor: 'rgba(0,0,0,.06)' }}>
                <div className="h-36 relative" style={{ background: 'var(--paper-2)' }}>
                  {p.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.images[0].url} alt={p.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <Package className="h-8 w-8" style={{ color: 'var(--concrete-2)' }} />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <span className="text-[10px] font-semibold rounded-full px-2 py-0.5" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                  </div>
                  <button
                    onClick={() => deleteProduct(p.id)}
                    disabled={deletingId === p.id}
                    className="absolute top-2 right-2 h-7 w-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:opacity-50"
                    style={{ background: '#ef4444' }}
                  >
                    <Trash2 className="h-3.5 w-3.5" style={{ color: '#fff' }} />
                  </button>
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm truncate" style={{ color: 'var(--ink)' }}>{p.title}</p>
                  <p className="font-mono font-bold text-sm mt-0.5">{Number(p.price).toFixed(2)} €</p>
                  <p className="text-xs mt-1 truncate" style={{ color: 'var(--concrete-3)' }}>{p.user.firstName} {p.user.lastName}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
