'use client'

import { useEffect, useState } from 'react'
import { AlertOctagon } from 'lucide-react'

interface Chargeback {
  id: number
  stripeId: string
  amount: string
  reason: string | null
  status: string
  createdAt: string
  order: {
    id: number
    finalPrice: string
    product: { title: string }
    buyer: { firstName: string; lastName: string; email: string }
    seller: { firstName: string; lastName: string }
  } | null
}

const STATUS_COLORS: Record<string, { label: string; color: string; bg: string }> = {
  needs_response: { label: 'Réponse requise', color: '#92400e', bg: '#fef3c7' },
  under_review:   { label: 'En cours',         color: '#1e40af', bg: '#dbeafe' },
  won:            { label: 'Gagné',             color: '#065f46', bg: '#d1fae5' },
  lost:           { label: 'Perdu',             color: '#991b1b', bg: '#fee2e2' },
  warning_closed: { label: 'Clôturé',           color: '#6b7280', bg: '#f3f4f6' },
}

export default function AdminChargebacksPage() {
  const [chargebacks, setChargebacks] = useState<Chargeback[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/chargebacks')
      .then(r => r.ok ? r.json() : [])
      .then(setChargebacks)
      .finally(() => setLoading(false))
  }, [])

  const total = chargebacks.reduce((s, c) => s + Number(c.amount), 0)

  return (
    <div className="px-4 sm:px-8 py-10 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: '#fee2e2' }}>
          <AlertOctagon className="h-5 w-5" style={{ color: '#dc2626' }} />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl tracking-tight" style={{ color: 'var(--ink)' }}>Chargebacks</h1>
          <p className="text-sm" style={{ color: 'var(--concrete-4)' }}>
            {chargebacks.length} opposition{chargebacks.length !== 1 ? 's' : ''} · {total.toFixed(2)} € à risque
          </p>
        </div>
      </div>

      {chargebacks.length > 0 && (
        <div className="rounded-2xl border p-4 mb-6 flex gap-6" style={{ background: '#fee2e2', borderColor: '#fca5a5' }}>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: '#991b1b' }}>Montant total à risque</p>
            <p className="font-display font-bold text-xl" style={{ color: '#991b1b' }}>{total.toFixed(2)} €</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: '#991b1b' }}>Réponse requise</p>
            <p className="font-display font-bold text-xl" style={{ color: '#991b1b' }}>
              {chargebacks.filter(c => c.status === 'needs_response').length}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--paper-2)' }} />)}</div>
      ) : chargebacks.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed py-16 text-center" style={{ borderColor: 'var(--concrete-2)' }}>
          <AlertOctagon className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--concrete-2)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--concrete-4)' }}>Aucun chargeback</p>
        </div>
      ) : (
        <div className="space-y-3">
          {chargebacks.map(c => {
            const meta = STATUS_COLORS[c.status] ?? { label: c.status, color: '#6b7280', bg: '#f3f4f6' }
            return (
              <div key={c.id} className="rounded-2xl border p-5 space-y-3" style={{ background: 'var(--snow)', borderColor: 'rgba(0,0,0,.06)' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-sm" style={{ color: 'var(--ink)' }}>{Number(c.amount).toFixed(2)} €</span>
                      <span className="text-[11px] font-semibold rounded-full px-2 py-0.5" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--concrete-3)' }}>
                      Stripe ID : <span className="font-mono">{c.stripeId}</span>
                      {c.reason && <> · Motif : {c.reason}</>}
                    </p>
                  </div>
                  <p className="text-xs flex-shrink-0" style={{ color: 'var(--concrete-3)' }}>
                    {new Date(c.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                {c.order && (
                  <div className="rounded-xl p-3 text-xs space-y-1" style={{ background: 'var(--paper-2)' }}>
                    <p className="font-semibold" style={{ color: 'var(--ink)' }}>Commande #{c.order.id} — {c.order.product.title}</p>
                    <p style={{ color: 'var(--concrete-4)' }}>
                      Acheteur : {c.order.buyer.firstName} {c.order.buyer.lastName} ({c.order.buyer.email})
                      · Vendeur : {c.order.seller.firstName} {c.order.seller.lastName}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
