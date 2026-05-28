'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Flag, Package, User, CheckCircle, XCircle, Eye,
  ExternalLink, ChevronDown, ChevronUp, EyeOff, Trash2, ShieldOff, ShieldCheck,
} from 'lucide-react'

interface Report {
  id: number
  reason: string
  details: string | null
  status: string
  createdAt: string
  reporter: { id: number; firstName: string; lastName: string; email: string }
  product: { id: number; title: string; suspended: boolean; images: { url: string }[] } | null
  reportedUser: { id: number; firstName: string; lastName: string; email: string; suspended: boolean } | null
}

interface ReportGroup {
  key: string
  type: 'product' | 'user'
  targetId: number
  targetLabel: string
  targetImage: string | null
  targetSuspended: boolean
  reports: Report[]
}

const REASON_LABELS: Record<string, string> = {
  inappropriate: 'Contenu inapproprié',
  fake:          'Fausse description / arnaque',
  spam:          'Spam / doublon',
  abusive_price: 'Prix abusif',
  fraud:         'Utilisateur frauduleux',
  other:         'Autre',
}

function groupReports(reports: Report[]): ReportGroup[] {
  const map = new Map<string, ReportGroup>()
  for (const r of reports) {
    if (r.product) {
      const key = `product_${r.product.id}`
      if (!map.has(key)) map.set(key, {
        key, type: 'product',
        targetId: r.product.id,
        targetLabel: r.product.title,
        targetImage: r.product.images[0]?.url ?? null,
        targetSuspended: r.product.suspended,
        reports: [],
      })
      map.get(key)!.reports.push(r)
    } else if (r.reportedUser) {
      const key = `user_${r.reportedUser.id}`
      if (!map.has(key)) map.set(key, {
        key, type: 'user',
        targetId: r.reportedUser.id,
        targetLabel: `${r.reportedUser.firstName} ${r.reportedUser.lastName}`,
        targetImage: null,
        targetSuspended: r.reportedUser.suspended,
        reports: [],
      })
      map.get(key)!.reports.push(r)
    }
  }
  return Array.from(map.values()).sort((a, b) => b.reports.length - a.reports.length)
}

function GroupCard({
  group,
  filter,
  onResolve,
}: {
  group: ReportGroup
  filter: string
  onResolve: (group: ReportGroup) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [suspended, setSuspended] = useState(group.targetSuspended)

  const resolveAll = async (status: 'reviewed' | 'dismissed') => {
    setBusy(true)
    const ids = group.reports.map(r => r.id)
    await fetch('/api/admin/reports', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, status }),
    })
    onResolve(group)
    setBusy(false)
  }

  const toggleProductSuspend = async () => {
    setBusy(true)
    const res = await fetch('/api/admin/products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: group.targetId, suspended: !suspended }),
    })
    if (res.ok) setSuspended(s => !s)
    setBusy(false)
  }

  const deleteProduct = async () => {
    if (!confirm('Supprimer définitivement cette annonce ?')) return
    setBusy(true)
    await fetch('/api/admin/products', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: group.targetId }),
    })
    onResolve(group)
    setBusy(false)
  }

  const toggleUserSuspend = async () => {
    setBusy(true)
    const res = await fetch(`/api/admin/users/${group.targetId}/suspend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suspend: !suspended }),
    })
    if (res.ok) setSuspended(s => !s)
    setBusy(false)
  }

  const uniqueReasons = [...new Set(group.reports.map(r => r.reason))]

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: 'var(--snow)', borderColor: 'rgba(0,0,0,.07)' }}
    >
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Thumbnail */}
          <div
            className="h-14 w-14 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
            style={{ background: 'var(--paper-2)' }}
          >
            {group.targetImage
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={group.targetImage} alt="" className="h-full w-full object-cover" />
              : group.type === 'product'
                ? <Package className="h-6 w-6" style={{ color: 'var(--concrete-3)' }} />
                : <User className="h-6 w-6" style={{ color: 'var(--concrete-3)' }} />
            }
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm truncate" style={{ color: 'var(--ink)' }}>
                {group.targetLabel}
              </p>
              {suspended && (
                <span className="text-[10px] font-bold rounded-full px-2 py-0.5 uppercase tracking-wide"
                  style={{ background: '#fee2e2', color: '#991b1b' }}>
                  {group.type === 'product' ? 'Suspendu' : 'Compte suspendu'}
                </span>
              )}
              <Link
                href={group.type === 'product' ? `/article/${group.targetId}` : `/profile/${group.targetId}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-[11px] font-mono hover:opacity-70 transition-opacity"
                style={{ color: 'var(--concrete-3)' }}
              >
                Voir <ExternalLink className="h-3 w-3" />
              </Link>
            </div>

            {/* Reasons badges */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {uniqueReasons.map(r => (
                <span key={r} className="text-[11px] font-semibold rounded-full px-2 py-0.5"
                  style={{ background: '#fef3c7', color: '#92400e' }}>
                  {REASON_LABELS[r] ?? r}
                </span>
              ))}
            </div>
          </div>

          {/* Count badge */}
          <div className="flex-shrink-0 text-right">
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
              style={{ background: group.reports.length >= 3 ? '#fee2e2' : 'var(--paper-2)', color: group.reports.length >= 3 ? '#991b1b' : 'var(--concrete-4)' }}
            >
              <Flag className="h-3 w-3" />
              {group.reports.length} signalement{group.reports.length > 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Action buttons row */}
        <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t" style={{ borderColor: 'rgba(0,0,0,.06)' }}>

          {/* Product-specific actions */}
          {group.type === 'product' && (
            <>
              <button onClick={toggleProductSuspend} disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold border cursor-pointer transition-colors disabled:opacity-50 hover:bg-black/5"
                style={{ borderColor: 'rgba(0,0,0,.12)', color: suspended ? '#16a34a' : '#b45309' }}>
                {suspended
                  ? <><ShieldCheck className="h-3.5 w-3.5" /> Remettre en ligne</>
                  : <><EyeOff className="h-3.5 w-3.5" /> Suspendre l'annonce</>
                }
              </button>
              <button onClick={deleteProduct} disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold border cursor-pointer transition-colors disabled:opacity-50 hover:bg-red-50"
                style={{ borderColor: 'rgba(239,68,68,.3)', color: '#dc2626' }}>
                <Trash2 className="h-3.5 w-3.5" /> Supprimer
              </button>
            </>
          )}

          {/* User-specific actions */}
          {group.type === 'user' && (
            <button onClick={toggleUserSuspend} disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold border cursor-pointer transition-colors disabled:opacity-50 hover:bg-black/5"
              style={{ borderColor: 'rgba(0,0,0,.12)', color: suspended ? '#16a34a' : '#b45309' }}>
              {suspended
                ? <><ShieldCheck className="h-3.5 w-3.5" /> Réactiver le compte</>
                : <><ShieldOff className="h-3.5 w-3.5" /> Suspendre le compte</>
              }
            </button>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Report status actions — only in pending tab */}
          {filter === 'pending' && (
            <>
              <button onClick={() => resolveAll('dismissed')} disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold border cursor-pointer transition-colors disabled:opacity-50 hover:bg-black/5"
                style={{ borderColor: 'rgba(0,0,0,.12)', color: 'var(--concrete-4)' }}>
                <XCircle className="h-3.5 w-3.5" /> Rejeter
              </button>
              <button onClick={() => resolveAll('reviewed')} disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
                style={{ background: 'var(--ink)', color: 'var(--paper)' }}>
                <Eye className="h-3.5 w-3.5" /> Marquer traité
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expand / collapse individual reports */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-2.5 text-xs font-mono cursor-pointer transition-colors hover:bg-black/3"
        style={{ background: 'var(--paper-2)', color: 'var(--concrete-3)', borderTop: '1px solid rgba(0,0,0,.05)' }}
      >
        <span>{expanded ? 'Masquer' : 'Voir'} les {group.reports.length} signalement{group.reports.length > 1 ? 's' : ''} individuels</span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {expanded && (
        <div className="divide-y" style={{ borderTop: '1px solid rgba(0,0,0,.05)', borderColor: 'rgba(0,0,0,.05)' }}>
          {group.reports.map(r => (
            <div key={r.id} className="px-5 py-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>
                  {r.reporter.firstName} {r.reporter.lastName}
                  <span className="font-normal ml-1" style={{ color: 'var(--concrete-3)' }}>({r.reporter.email})</span>
                </p>
                <p className="text-[11px] flex-shrink-0" style={{ color: 'var(--concrete-3)' }}>
                  {new Date(r.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <span className="inline-block text-[11px] font-semibold rounded-full px-2 py-0.5"
                style={{ background: '#fef3c7', color: '#92400e' }}>
                {REASON_LABELS[r.reason] ?? r.reason}
              </span>
              {r.details && (
                <p className="text-xs rounded-lg px-3 py-2" style={{ background: 'var(--paper-2)', color: 'var(--concrete-4)' }}>
                  {r.details}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'reviewed' | 'dismissed'>('pending')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/reports?status=${filter}`)
      .then(r => r.ok ? r.json() : [])
      .then(setReports)
      .finally(() => setLoading(false))
  }, [filter])

  const groups = groupReports(reports)

  const handleResolve = (resolved: ReportGroup) => {
    setReports(prev => prev.filter(r => !resolved.reports.some(rr => rr.id === r.id)))
  }

  return (
    <div className="px-4 sm:px-8 py-10 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: '#fef3c7' }}>
          <Flag className="h-5 w-5" style={{ color: '#d97706' }} />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl tracking-tight" style={{ color: 'var(--ink)' }}>Signalements</h1>
          <p className="text-sm" style={{ color: 'var(--concrete-4)' }}>
            {groups.length} cible{groups.length !== 1 ? 's' : ''} · {reports.length} signalement{reports.length !== 1 ? 's' : ''}
          </p>
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
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-36 rounded-2xl animate-pulse" style={{ background: 'var(--paper-2)' }} />)}</div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed py-16 text-center" style={{ borderColor: 'var(--concrete-2)' }}>
          <CheckCircle className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--concrete-2)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--concrete-4)' }}>Aucun signalement</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(g => (
            <GroupCard key={g.key} group={g} filter={filter} onResolve={handleResolve} />
          ))}
        </div>
      )}
    </div>
  )
}
