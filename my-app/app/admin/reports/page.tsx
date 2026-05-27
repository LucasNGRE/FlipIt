'use client'

import { useEffect, useState } from 'react'
import { Flag, Package, User, CheckCircle, XCircle, Eye } from 'lucide-react'

interface Report {
  id: number
  reason: string
  details: string | null
  status: string
  createdAt: string
  reporter: { id: number; firstName: string; lastName: string; email: string }
  product: { id: number; title: string; images: { url: string }[] } | null
  reportedUser: { id: number; firstName: string; lastName: string; email: string } | null
}

const REASON_LABELS: Record<string, string> = {
  inappropriate: 'Contenu inapproprié',
  fake: 'Fausse description / arnaque',
  spam: 'Spam / doublon',
  abusive_price: 'Prix abusif',
  fraud: 'Utilisateur frauduleux',
  other: 'Autre',
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'reviewed' | 'dismissed'>('pending')
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/reports?status=${filter}`)
      .then(r => r.ok ? r.json() : [])
      .then(setReports)
      .finally(() => setLoading(false))
  }, [filter])

  const updateStatus = async (id: number, status: string) => {
    setActionLoading(id)
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (res.ok) setReports(prev => prev.filter(r => r.id !== id))
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="px-8 py-10 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: '#fef3c7' }}>
          <Flag className="h-5 w-5" style={{ color: '#d97706' }} />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl tracking-tight" style={{ color: 'var(--ink)' }}>Signalements</h1>
          <p className="text-sm" style={{ color: 'var(--concrete-4)' }}>{reports.length} signalement{reports.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="inline-flex rounded-xl p-1 mb-6 gap-1" style={{ background: 'var(--paper-2)' }}>
        {(['pending', 'reviewed', 'dismissed'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all"
            style={{ background: filter === f ? 'var(--ink)' : 'transparent', color: filter === f ? 'var(--paper)' : 'var(--concrete-4)' }}
          >
            {f === 'pending' ? 'En attente' : f === 'reviewed' ? 'Traités' : 'Rejetés'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'var(--paper-2)' }} />)}</div>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed py-16 text-center" style={{ borderColor: 'var(--concrete-2)' }}>
          <CheckCircle className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--concrete-2)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--concrete-4)' }}>Aucun signalement</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map(r => (
            <div key={r.id} className="rounded-2xl border p-5 space-y-3" style={{ background: 'var(--snow)', borderColor: 'rgba(0,0,0,.06)' }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {r.product ? (
                    <div className="h-12 w-12 rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'var(--paper-2)' }}>
                      {r.product.images[0]
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={r.product.images[0].url} alt={r.product.title} className="h-full w-full object-cover" />
                        : <div className="h-full flex items-center justify-center"><Package className="h-5 w-5" style={{ color: 'var(--concrete-2)' }} /></div>
                      }
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--paper-2)' }}>
                      <User className="h-5 w-5" style={{ color: 'var(--concrete-3)' }} />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>
                      {r.product ? r.product.title : `${r.reportedUser?.firstName} ${r.reportedUser?.lastName}`}
                    </p>
                    <span className="text-[11px] font-semibold rounded-full px-2 py-0.5" style={{ background: '#fef3c7', color: '#92400e' }}>
                      {REASON_LABELS[r.reason] ?? r.reason}
                    </span>
                  </div>
                </div>
                <p className="text-xs flex-shrink-0" style={{ color: 'var(--concrete-3)' }}>
                  {new Date(r.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </p>
              </div>

              {r.details && (
                <p className="text-sm rounded-xl px-3 py-2" style={{ background: 'var(--paper-2)', color: 'var(--concrete-4)' }}>{r.details}</p>
              )}

              <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: 'rgba(0,0,0,.06)' }}>
                <p className="text-xs" style={{ color: 'var(--concrete-3)' }}>
                  Signalé par <span className="font-semibold">{r.reporter.firstName} {r.reporter.lastName}</span>
                  {r.reportedUser && <> · Contre <span className="font-semibold">{r.reportedUser.email}</span></>}
                </p>
                {filter === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => updateStatus(r.id, 'dismissed')} disabled={actionLoading === r.id}
                      className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold border cursor-pointer hover:bg-black/5 transition-colors disabled:opacity-50"
                      style={{ borderColor: 'rgba(0,0,0,.12)', color: 'var(--concrete-4)' }}>
                      <XCircle className="h-3.5 w-3.5" /> Rejeter
                    </button>
                    <button onClick={() => updateStatus(r.id, 'reviewed')} disabled={actionLoading === r.id}
                      className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
                      style={{ background: 'var(--ink)', color: 'var(--paper)' }}>
                      <Eye className="h-3.5 w-3.5" /> Traité
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
