'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle, RefreshCw, Package } from 'lucide-react'

const REASON_LABELS: Record<string, string> = {
  not_received: 'Objet non reçu',
  not_as_described: 'Objet non conforme',
  damaged: 'Objet endommagé',
  wrong_item: 'Mauvais article',
  other: 'Autre',
}

interface Dispute {
  id: number
  finalPrice: string
  status: string
  disputeReason: string | null
  disputeDetails: string | null
  createdAt: string
  updatedAt: string
  product: { id: number; title: string; images: { url: string }[] }
  seller: { id: number; firstName: string; lastName: string; email: string }
  buyer: { id: number; firstName: string; lastName: string; email: string }
  disputeImages: { url: string }[]
}

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [filter, setFilter] = useState<'active' | 'resolved'>('active')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/disputes?filter=${filter}`)
      .then(r => r.ok ? r.json() : [])
      .then(setDisputes)
      .finally(() => setLoading(false))
  }, [filter])

  const resolve = async (id: number, action: 'refund' | 'release') => {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/admin/orders/${id}/${action}`, { method: 'POST' })
      if (res.ok) setDisputes(prev => prev.filter(d => d.id !== id))
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="px-8 py-10 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: '#ede9fe' }}>
          <AlertTriangle className="h-5 w-5" style={{ color: '#7c3aed' }} />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl tracking-tight" style={{ color: 'var(--ink)' }}>Litiges</h1>
          <p className="text-sm" style={{ color: 'var(--concrete-4)' }}>
            {filter === 'active' ? `${disputes.length} litige${disputes.length !== 1 ? 's' : ''} en cours` : `${disputes.length} litige${disputes.length !== 1 ? 's' : ''} traité${disputes.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="inline-flex rounded-xl p-1 mb-6 gap-1" style={{ background: 'var(--paper-2)' }}>
        {(['active', 'resolved'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-5 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all"
            style={{
              background: filter === f ? 'var(--ink)' : 'transparent',
              color: filter === f ? 'var(--paper)' : 'var(--concrete-4)',
            }}
          >
            {f === 'active' ? 'Actifs' : 'Résolus'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: 'var(--paper-2)' }} />)}
        </div>
      ) : disputes.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed py-20 text-center" style={{ borderColor: 'var(--concrete-2)' }}>
          <CheckCircle className="h-10 w-10 mx-auto mb-3" style={{ color: 'var(--concrete-2)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--concrete-4)' }}>
            {filter === 'active' ? 'Aucun litige en cours' : 'Aucun litige résolu'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map(d => (
            <div key={d.id} className="rounded-2xl border p-5 space-y-4" style={{ background: 'var(--snow)', borderColor: 'rgba(0,0,0,.06)' }}>
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'var(--paper-2)' }}>
                  {d.product.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.product.images[0].url} alt={d.product.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Package className="h-5 w-5" style={{ color: 'var(--concrete-2)' }} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>{d.product.title}</p>
                    {filter === 'resolved' && (
                      <span className="text-[11px] font-semibold rounded-full px-2 py-0.5"
                        style={{ background: d.status === 'refunded' ? '#fef3c7' : '#d1fae5', color: d.status === 'refunded' ? '#92400e' : '#065f46' }}>
                        {d.status === 'refunded' ? 'Remboursé' : 'Libéré au vendeur'}
                      </span>
                    )}
                  </div>
                  <p className="font-mono font-bold text-sm mt-0.5">{Number(d.finalPrice).toFixed(2)} €</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--concrete-3)' }}>
                    Litige ouvert le {new Date(d.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Parties */}
              <div className="grid grid-cols-2 gap-3">
                {[{ role: 'Acheteur', person: d.buyer }, { role: 'Vendeur', person: d.seller }].map(({ role, person }) => (
                  <div key={role} className="rounded-xl p-3" style={{ background: 'var(--paper-2)' }}>
                    <p className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--concrete-4)' }}>{role}</p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{person.firstName} {person.lastName}</p>
                    <p className="text-xs" style={{ color: 'var(--concrete-3)' }}>{person.email}</p>
                  </div>
                ))}
              </div>

              {/* Raison */}
              {d.disputeReason && (
                <div className="rounded-xl p-3 border-l-4" style={{ background: '#fef3c7', borderColor: '#f59e0b' }}>
                  <p className="text-xs font-bold mb-1" style={{ color: '#92400e' }}>
                    {REASON_LABELS[d.disputeReason] ?? d.disputeReason}
                  </p>
                  {d.disputeDetails && (
                    <p className="text-xs leading-relaxed" style={{ color: '#92400e' }}>{d.disputeDetails}</p>
                  )}
                </div>
              )}

              {/* Photos */}
              {d.disputeImages?.length > 0 && (
                <div className="space-y-2">
                  <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--concrete-4)' }}>Photos jointes</p>
                  <div className="flex gap-2 flex-wrap">
                    {d.disputeImages.map((img, i) => (
                      <a key={i} href={img.url} target="_blank" rel="noopener noreferrer"
                        className="h-20 w-20 rounded-xl overflow-hidden block flex-shrink-0 hover:opacity-90 transition-opacity"
                        style={{ background: 'var(--paper-2)' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt={`Preuve ${i + 1}`} className="h-full w-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions — actifs seulement */}
              {filter === 'active' && (
                <div className="flex gap-3 pt-1 border-t" style={{ borderColor: 'rgba(0,0,0,.06)' }}>
                  <button
                    onClick={() => resolve(d.id, 'refund')}
                    disabled={actionLoading === d.id}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold border cursor-pointer hover:bg-red-50 transition-colors disabled:opacity-50"
                    style={{ borderColor: '#ef4444', color: '#ef4444' }}
                  >
                    {actionLoading === d.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                    Rembourser l&apos;acheteur
                  </button>
                  <button
                    onClick={() => resolve(d.id, 'release')}
                    disabled={actionLoading === d.id}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
                    style={{ background: 'var(--acid)', color: 'var(--ink)' }}
                  >
                    {actionLoading === d.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                    Libérer au vendeur
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
