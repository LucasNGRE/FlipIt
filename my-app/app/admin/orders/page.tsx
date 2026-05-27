'use client'

import { useEffect, useState } from 'react'
import { Package } from 'lucide-react'

interface Order {
  id: number
  finalPrice: string
  status: string
  createdAt: string
  product: { id: number; title: string; images: { url: string }[] }
  seller: { id: number; firstName: string; lastName: string }
  buyer:  { id: number; firstName: string; lastName: string }
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  paid:      { label: 'En attente expédition', color: '#92400e', bg: '#fef3c7' },
  shipped:   { label: 'Expédiée',              color: '#1e40af', bg: '#dbeafe' },
  confirmed: { label: 'Confirmée',             color: '#065f46', bg: '#d1fae5' },
  disputed:  { label: 'Litige',                color: '#7c3aed', bg: '#ede9fe' },
  refunded:  { label: 'Remboursée',            color: '#6b7280', bg: '#f3f4f6' },
}

const FILTERS = [
  { value: '', label: 'Toutes' },
  { value: 'paid', label: 'En attente' },
  { value: 'shipped', label: 'Expédiées' },
  { value: 'confirmed', label: 'Confirmées' },
  { value: 'disputed', label: 'Litiges' },
  { value: 'refunded', label: 'Remboursées' },
]

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/orders${filter ? `?status=${filter}` : ''}`)
      .then(r => r.ok ? r.json() : [])
      .then(setOrders)
      .finally(() => setLoading(false))
  }, [filter])

  return (
    <div className="px-8 py-10">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl tracking-tight" style={{ color: 'var(--ink)' }}>Commandes</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--concrete-4)' }}>{orders.length} commande{orders.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Filters */}
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
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--paper-2)' }} />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed py-16 text-center" style={{ borderColor: 'var(--concrete-2)' }}>
          <Package className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--concrete-2)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--concrete-4)' }}>Aucune commande</p>
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'rgba(0,0,0,.06)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--paper-2)', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
                {['#', 'Article', 'Acheteur', 'Vendeur', 'Montant', 'Statut', 'Date'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--concrete-4)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o, i) => {
                const meta = STATUS_META[o.status] ?? { label: o.status, color: '#6b7280', bg: '#f3f4f6' }
                return (
                  <tr key={o.id} style={{ background: i % 2 === 0 ? 'var(--snow)' : 'var(--paper)', borderBottom: '1px solid rgba(0,0,0,.04)' }}>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--concrete-3)' }}>#{o.id}</td>
                    <td className="px-4 py-3 font-semibold max-w-[180px] truncate" style={{ color: 'var(--ink)' }}>{o.product.title}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--concrete-4)' }}>{o.buyer.firstName} {o.buyer.lastName}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--concrete-4)' }}>{o.seller.firstName} {o.seller.lastName}</td>
                    <td className="px-4 py-3 font-mono font-bold" style={{ color: 'var(--ink)' }}>{Number(o.finalPrice).toFixed(2)} €</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--concrete-3)' }}>
                      {new Date(o.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
