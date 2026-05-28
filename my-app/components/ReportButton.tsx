'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Flag, X, RefreshCw, CheckCircle } from 'lucide-react'

const REASONS = [
  { value: 'fake',          label: 'Fausse description / arnaque' },
  { value: 'inappropriate', label: 'Contenu inapproprié' },
  { value: 'spam',          label: 'Spam / doublon' },
  { value: 'abusive_price', label: 'Prix abusif' },
  { value: 'fraud',         label: 'Utilisateur frauduleux' },
  { value: 'other',         label: 'Autre' },
]

interface Props {
  productId?: number
  reportedUserId?: number
  label?: string
}

function storageKey(productId?: number, reportedUserId?: number) {
  if (productId)       return `flipit_reported_product_${productId}`
  if (reportedUserId)  return `flipit_reported_user_${reportedUserId}`
  return null
}

export default function ReportButton({ productId, reportedUserId, label = 'Signaler' }: Props) {
  const router = useRouter()
  const [open, setOpen]       = useState(false)
  const [reason, setReason]   = useState('')
  const [details, setDetails] = useState('')
  const [loading, setLoading] = useState(false)
  const [alreadyReported, setAlreadyReported] = useState(false)

  useEffect(() => {
    const key = storageKey(productId, reportedUserId)
    if (key && localStorage.getItem(key)) setAlreadyReported(true)
  }, [productId, reportedUserId])

  const markReported = () => {
    const key = storageKey(productId, reportedUserId)
    if (key) localStorage.setItem(key, '1')
    setAlreadyReported(true)
    setOpen(false)
  }

  const submit = async () => {
    if (!reason) return
    setLoading(true)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, details, productId, reportedUserId }),
      })
      if (res.status === 401) {
        setOpen(false)
        router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`)
        return
      }
      markReported()
    } finally {
      setLoading(false)
    }
  }

  if (alreadyReported) {
    return (
      <div
        className="flex items-center gap-1.5 text-xs font-semibold"
        style={{ color: 'var(--concrete-3)' }}
      >
        <CheckCircle className="h-3.5 w-3.5" style={{ color: '#065f46' }} />
        Signalement envoyé
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer hover:opacity-70 transition-opacity"
        style={{ color: 'var(--concrete-3)' }}
      >
        <Flag className="h-3.5 w-3.5" />
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 px-4"
          style={{ background: 'rgba(10,10,10,.55)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ background: 'var(--snow)' }}>
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-lg" style={{ color: 'var(--ink)' }}>Signaler</h2>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 cursor-pointer hover:bg-black/5">
                <X className="h-4 w-4" style={{ color: 'var(--concrete-3)' }} />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--concrete-4)' }}>Raison</label>
              <select value={reason} onChange={e => setReason(e.target.value)}
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2"
                style={{ borderColor: 'rgba(0,0,0,.12)', background: 'var(--paper)', color: 'var(--ink)' }}>
                <option value="">Sélectionner…</option>
                {REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[11px] uppercase tracking-widest" style={{ color: 'var(--concrete-4)' }}>Détails (optionnel)</label>
              <textarea value={details} onChange={e => setDetails(e.target.value)} rows={3}
                placeholder="Décrivez le problème…"
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 resize-none"
                style={{ borderColor: 'rgba(0,0,0,.12)', background: 'var(--paper)', color: 'var(--ink)' }} />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setOpen(false)}
                className="flex-1 rounded-xl py-3 text-sm font-semibold border cursor-pointer hover:bg-black/5 transition-colors"
                style={{ borderColor: 'rgba(0,0,0,.12)', color: 'var(--concrete-4)' }}>
                Annuler
              </button>
              <button onClick={submit} disabled={!reason || loading}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-40"
                style={{ background: '#ef4444', color: '#fff' }}>
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
                Signaler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
