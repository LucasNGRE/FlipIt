'use client'

import { useEffect, useState } from 'react'
import { ScrollText } from 'lucide-react'

interface Log {
  id: number
  action: string
  target: string | null
  details: string | null
  createdAt: string
}

const ACTION_META: Record<string, { label: string; color: string; bg: string }> = {
  dispute_refunded:  { label: 'Remboursement litige', color: '#991b1b', bg: '#fee2e2' },
  dispute_released:  { label: 'Libération vendeur',   color: '#065f46', bg: '#d1fae5' },
  product_deleted:   { label: 'Annonce supprimée',    color: '#92400e', bg: '#fef3c7' },
  user_suspended:    { label: 'Utilisateur suspendu', color: '#7c3aed', bg: '#ede9fe' },
  user_unsuspended:  { label: 'Suspension levée',     color: '#065f46', bg: '#d1fae5' },
  message_sent:      { label: 'Message envoyé',       color: '#1e40af', bg: '#dbeafe' },
  report_updated:    { label: 'Signalement traité',   color: '#6b7280', bg: '#f3f4f6' },
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/logs')
      .then(r => r.ok ? r.json() : [])
      .then(setLogs)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="px-4 sm:px-8 py-10 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--paper-2)' }}>
          <ScrollText className="h-5 w-5" style={{ color: 'var(--concrete-3)' }} />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl tracking-tight" style={{ color: 'var(--ink)' }}>Journaux d'activité</h1>
          <p className="text-sm" style={{ color: 'var(--concrete-4)' }}>{logs.length} action{logs.length !== 1 ? 's' : ''} enregistrée{logs.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'var(--paper-2)' }} />)}</div>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed py-16 text-center" style={{ borderColor: 'var(--concrete-2)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--concrete-4)' }}>Aucune action enregistrée</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {logs.map(log => {
            const meta = ACTION_META[log.action] ?? { label: log.action, color: '#6b7280', bg: '#f3f4f6' }
            return (
              <div key={log.id} className="flex items-center gap-4 rounded-xl px-4 py-3 border" style={{ background: 'var(--snow)', borderColor: 'rgba(0,0,0,.06)' }}>
                <span className="text-[11px] font-semibold rounded-full px-2.5 py-0.5 flex-shrink-0" style={{ background: meta.bg, color: meta.color }}>
                  {meta.label}
                </span>
                <div className="flex-1 min-w-0">
                  {log.target && <span className="text-xs font-mono" style={{ color: 'var(--concrete-4)' }}>{log.target}</span>}
                  {log.details && <span className="text-xs ml-2" style={{ color: 'var(--concrete-3)' }}>{log.details}</span>}
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--concrete-3)' }}>
                  {new Date(log.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
