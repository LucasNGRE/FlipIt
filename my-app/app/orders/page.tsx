'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Package, Truck, CheckCircle, AlertTriangle, Clock, ChevronRight, X, ImagePlus, Trash2 } from 'lucide-react'

interface Order {
  id: number
  finalPrice: string
  status: 'paid' | 'shipped' | 'confirmed' | 'disputed' | 'refunded'
  createdAt: string
  shippedAt: string | null
  confirmDeadline: string | null
  trackingNumber: string | null
  product: { id: number; title: string; images: { url: string }[] }
  seller: { id: number; firstName: string; lastName: string; image: string | null }
  buyer: { id: number; firstName: string; lastName: string; image: string | null }
}

const STATUS_META: Record<Order['status'], { label: string; color: string; bg: string }> = {
  paid:      { label: 'En attente d\'expédition', color: '#92400e', bg: '#fef3c7' },
  shipped:   { label: 'Expédiée — à confirmer',   color: '#1e40af', bg: '#dbeafe' },
  confirmed: { label: 'Confirmée',                 color: '#065f46', bg: '#d1fae5' },
  disputed:  { label: 'Litige ouvert',             color: '#7c3aed', bg: '#ede9fe' },
  refunded:  { label: 'Remboursée',                color: '#6b7280', bg: '#f3f4f6' },
}

export default function OrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'buyer' | 'seller'>('buyer')
  const [shipModal, setShipModal] = useState<Order | null>(null)
  const [disputeModal, setDisputeModal] = useState<Order | null>(null)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeDetails, setDisputeDetails] = useState('')
  const [disputePhotos, setDisputePhotos] = useState<string[]>([])
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  const addDisputePhotos = (files: FileList | null) => {
    if (!files) return
    const remaining = 3 - disputePhotos.length
    Array.from(files).slice(0, remaining).forEach(file => {
      const reader = new FileReader()
      reader.onload = e => {
        const result = e.target?.result as string
        if (result) setDisputePhotos(prev => [...prev, result])
      }
      reader.readAsDataURL(file)
    })
  }

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login?callbackUrl=/orders'); return }
    if (status !== 'authenticated') return
    setLoading(true)
    fetch('/api/orders')
      .then(r => r.ok ? r.json() : [])
      .then(setOrders)
      .finally(() => setLoading(false))
  }, [status, router])

  const myId = session?.user?.id ? Number(session.user.id) : null
  const buyerOrders = orders.filter(o => o.buyer.id === myId)
  const sellerOrders = orders.filter(o => o.seller.id === myId)

  const action = async (orderId: number, endpoint: string, body?: object) => {
    setActionLoading(orderId)
    try {
      const res = await fetch(`/api/orders/${orderId}/${endpoint}`, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
      })
      if (res.ok) {
        const updated = await res.json()
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updated } : o))
      }
    } finally {
      setActionLoading(null)
      setShipModal(null)
    }
  }

  const displayOrders = tab === 'buyer' ? buyerOrders : sellerOrders

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display font-bold text-2xl tracking-tight mb-8" style={{ color: 'var(--ink)' }}>
        Mes commandes
      </h1>

      {/* Tab toggle */}
      <div
        className="inline-flex rounded-xl p-1 mb-8 gap-1"
        style={{ background: 'var(--paper-2)' }}
      >
        {(['buyer', 'seller'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-5 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all"
            style={{
              background: tab === t ? 'var(--ink)' : 'transparent',
              color: tab === t ? 'var(--paper)' : 'var(--concrete-4)',
            }}
          >
            {t === 'buyer' ? `Achats (${buyerOrders.length})` : `Ventes (${sellerOrders.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--paper-2)' }} />
          ))}
        </div>
      ) : displayOrders.length === 0 ? (
        <div
          className="rounded-2xl border-2 border-dashed py-20 text-center"
          style={{ borderColor: 'var(--concrete-2)' }}
        >
          <Package className="h-10 w-10 mx-auto mb-3" style={{ color: 'var(--concrete-2)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--concrete-4)' }}>
            {tab === 'buyer' ? 'Aucun achat pour le moment' : 'Aucune vente pour le moment'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayOrders.map(order => {
            const meta = STATUS_META[order.status]
            const isLoading = actionLoading === order.id
            const isBuyer = tab === 'buyer'
            const otherPerson = isBuyer ? order.seller : order.buyer

            return (
              <div
                key={order.id}
                className="rounded-2xl border p-5"
                style={{ background: 'var(--snow)', borderColor: 'rgba(0,0,0,.06)' }}
              >
                <div className="flex items-start gap-4">
                  {/* Product image */}
                  <div
                    className="h-16 w-16 rounded-xl overflow-hidden flex-shrink-0"
                    style={{ background: 'var(--paper-2)' }}
                  >
                    {order.product.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={order.product.images[0].url}
                        alt={order.product.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Package className="h-6 w-6" style={{ color: 'var(--concrete-2)' }} />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm truncate" style={{ color: 'var(--ink)' }}>
                        {order.product.title}
                      </p>
                      <span
                        className="text-xs font-mono font-bold flex-shrink-0"
                        style={{ color: 'var(--ink)' }}
                      >
                        {Number(order.finalPrice).toFixed(2)} €
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                        style={{ background: meta.bg, color: meta.color }}
                      >
                        {meta.label}
                      </span>
                    </div>

                    <p className="text-xs mt-1" style={{ color: 'var(--concrete-3)' }}>
                      {isBuyer ? 'Vendeur' : 'Acheteur'} :{' '}
                      <span className="font-medium">{otherPerson.firstName} {otherPerson.lastName}</span>
                      {' · '}
                      {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                    </p>

                    {/* Tracking info */}
                    {order.trackingNumber && (
                      <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--concrete-4)' }}>
                        <Truck className="h-3 w-3" />
                        Suivi : <span className="font-mono">{order.trackingNumber}</span>
                      </p>
                    )}

                    {/* Confirm deadline countdown */}
                    {order.status === 'shipped' && order.confirmDeadline && isBuyer && (
                      <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#92400e' }}>
                        <Clock className="h-3 w-3" />
                        Auto-confirmée le {new Date(order.confirmDeadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>

                  {/* Navigate */}
                  <ChevronRight className="h-4 w-4 flex-shrink-0 mt-1" style={{ color: 'var(--concrete-2)' }} />
                </div>

                {/* Action buttons */}
                {!isBuyer && order.status === 'paid' && (
                  <div className="mt-4 pt-4 border-t flex justify-end" style={{ borderColor: 'rgba(0,0,0,.06)' }}>
                    <button
                      onClick={() => setShipModal(order)}
                      className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold cursor-pointer hover:opacity-90 transition-opacity"
                      style={{ background: 'var(--ink)', color: 'var(--paper)' }}
                    >
                      <Truck className="h-4 w-4" />
                      Marquer comme expédiée
                    </button>
                  </div>
                )}

                {isBuyer && order.status === 'shipped' && (
                  <div className="mt-4 pt-4 border-t flex gap-3 justify-end" style={{ borderColor: 'rgba(0,0,0,.06)' }}>
                    <button
                      onClick={() => { setDisputeModal(order); setDisputeReason(''); setDisputeDetails(''); setDisputePhotos([]) }}
                      disabled={isLoading}
                      className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold border cursor-pointer hover:bg-red-50 transition-colors disabled:opacity-50"
                      style={{ borderColor: '#ef4444', color: '#ef4444' }}
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Ouvrir un litige
                    </button>
                    <button
                      onClick={() => action(order.id, 'confirm')}
                      disabled={isLoading}
                      className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
                      style={{ background: 'var(--acid)', color: 'var(--ink)' }}
                    >
                      {isLoading ? (
                        <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      Confirmer la réception
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Ship modal */}
      {shipModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 px-4"
          style={{ background: 'rgba(10,10,10,.55)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShipModal(null) }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 space-y-5"
            style={{ background: 'var(--snow)' }}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg" style={{ color: 'var(--ink)' }}>
                Expédier la commande
              </h2>
              <button
                onClick={() => setShipModal(null)}
                className="rounded-lg p-1.5 cursor-pointer hover:bg-black/5 transition-colors"
              >
                <X className="h-4 w-4" style={{ color: 'var(--concrete-3)' }} />
              </button>
            </div>

            <p className="text-sm" style={{ color: 'var(--concrete-4)' }}>
              <span className="font-semibold" style={{ color: 'var(--ink)' }}>{shipModal.product.title}</span>
              <br />
              L&apos;acheteur aura 48h pour confirmer la réception. Passé ce délai, la vente sera automatiquement validée.
            </p>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShipModal(null)}
                className="flex-1 rounded-xl py-3 text-sm font-semibold border cursor-pointer hover:bg-black/5 transition-colors"
                style={{ borderColor: 'rgba(0,0,0,.12)', color: 'var(--concrete-4)' }}
              >
                Annuler
              </button>
              <button
                onClick={() => action(shipModal.id, 'ship')}
                disabled={actionLoading === shipModal.id}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ background: 'var(--ink)', color: 'var(--paper)' }}
              >
                {actionLoading === shipModal.id ? (
                  <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                ) : (
                  <Truck className="h-4 w-4" />
                )}
                Confirmer l&apos;expédition
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispute modal */}
      {disputeModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 px-4"
          style={{ background: 'rgba(10,10,10,.55)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setDisputeModal(null) }}
        >
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-5" style={{ background: 'var(--snow)' }}>
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg" style={{ color: 'var(--ink)' }}>Ouvrir un litige</h2>
              <button onClick={() => setDisputeModal(null)} className="rounded-lg p-1.5 cursor-pointer hover:bg-black/5 transition-colors">
                <X className="h-4 w-4" style={{ color: 'var(--concrete-3)' }} />
              </button>
            </div>

            <p className="text-sm" style={{ color: 'var(--concrete-4)' }}>
              <span className="font-semibold" style={{ color: 'var(--ink)' }}>{disputeModal.product.title}</span>
              <br />Notre équipe examinera le litige et vous contactera sous 48h. Le paiement reste bloqué pendant toute la durée.
            </p>

            <div className="space-y-1.5">
              <label className="font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--concrete-4)' }}>Raison</label>
              <select
                value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2"
                style={{ borderColor: 'rgba(0,0,0,.12)', background: 'var(--paper)', color: 'var(--ink)' }}
              >
                <option value="">Sélectionner une raison</option>
                <option value="not_received">Objet non reçu</option>
                <option value="not_as_described">Objet non conforme à l&apos;annonce</option>
                <option value="damaged">Objet endommagé à la réception</option>
                <option value="wrong_item">Mauvais article reçu</option>
                <option value="other">Autre</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--concrete-4)' }}>Détails</label>
              <textarea
                value={disputeDetails}
                onChange={e => setDisputeDetails(e.target.value)}
                rows={3}
                placeholder="Décrivez le problème en détail…"
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 resize-none"
                style={{ borderColor: 'rgba(0,0,0,.12)', background: 'var(--paper)', color: 'var(--ink)' }}
              />
            </div>

            {/* Photo upload */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <label className="font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--concrete-4)' }}>
                  Photos ({disputePhotos.length}/3)
                </label>
                <span className="text-[11px]" style={{ color: 'var(--concrete-3)' }}>JPG, PNG, WEBP</span>
              </div>
              <div className="flex gap-2">
                {disputePhotos.map((src, i) => (
                  <div key={i} className="relative h-16 w-16 rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'var(--paper-2)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    <button
                      onClick={() => setDisputePhotos(prev => prev.filter((_, j) => j !== i))}
                      className="absolute top-0.5 right-0.5 rounded-full p-0.5 cursor-pointer"
                      style={{ background: 'rgba(10,10,10,.7)' }}
                    >
                      <Trash2 className="h-3 w-3" style={{ color: '#fff' }} />
                    </button>
                  </div>
                ))}
                {disputePhotos.length < 3 && (
                  <label
                    className="h-16 w-16 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer flex-shrink-0 hover:bg-black/5 transition-colors"
                    style={{ borderColor: 'rgba(0,0,0,.15)' }}
                  >
                    <ImagePlus className="h-5 w-5" style={{ color: 'var(--concrete-3)' }} />
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      multiple
                      className="hidden"
                      onChange={e => addDisputePhotos(e.target.files)}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDisputeModal(null)}
                className="flex-1 rounded-xl py-3 text-sm font-semibold border cursor-pointer hover:bg-black/5 transition-colors"
                style={{ borderColor: 'rgba(0,0,0,.12)', color: 'var(--concrete-4)' }}
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  action(disputeModal.id, 'dispute', { reason: disputeReason, details: disputeDetails, images: disputePhotos })
                  setDisputeModal(null)
                }}
                disabled={!disputeReason || actionLoading === disputeModal.id}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ background: '#ef4444', color: '#fff' }}
              >
                <AlertTriangle className="h-4 w-4" />
                Confirmer le litige
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
