'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Euro, Package, AlertTriangle, Users, Tag, RefreshCw } from 'lucide-react'

interface Stats {
  revenue: number
  commission: number
  refunds: number
  totalOrders: number
  ordersThisMonth: number
  activeDisputes: number
  resolvedDisputes: number
  totalUsers: number
  newUsersThisMonth: number
  totalProducts: number
  availableProducts: number
}

function KpiCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub?: string; icon: any; accent?: string
}) {
  return (
    <div className="rounded-2xl border p-5 space-y-3" style={{ background: 'var(--snow)', borderColor: 'rgba(0,0,0,.06)' }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--concrete-4)' }}>{label}</p>
        <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: accent ?? 'var(--paper-2)' }}>
          <Icon className="h-4 w-4" style={{ color: accent ? 'var(--ink)' : 'var(--concrete-3)' }} />
        </div>
      </div>
      <div>
        <p className="font-display font-bold text-2xl tracking-tight" style={{ color: 'var(--ink)' }}>{value}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--concrete-4)' }}>{sub}</p>}
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.ok ? r.json() : null)
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  const fmt = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

  if (loading) {
    return (
      <div className="px-8 py-10">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'var(--paper-2)' }} />
          ))}
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="px-8 py-10">
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl tracking-tight" style={{ color: 'var(--ink)' }}>Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--concrete-4)' }}>Vue d'ensemble de la plateforme</p>
      </div>

      {/* Financier */}
      <p className="font-mono text-[11px] uppercase tracking-widest mb-3" style={{ color: 'var(--concrete-3)' }}>Finances</p>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <KpiCard label="Volume (CA)" value={fmt(stats.revenue)} icon={TrendingUp} accent="var(--acid)" />
        <KpiCard label="Commission FlipIt" value={fmt(stats.commission)} sub="10% du volume confirmé" icon={Euro} accent="var(--acid)" />
        <KpiCard label="Remboursements" value={fmt(stats.refunds)} icon={RefreshCw} />
      </div>

      {/* Commandes */}
      <p className="font-mono text-[11px] uppercase tracking-widest mb-3" style={{ color: 'var(--concrete-3)' }}>Commandes</p>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <KpiCard label="Total commandes" value={String(stats.totalOrders)} icon={Package} />
        <KpiCard label="Ce mois-ci" value={String(stats.ordersThisMonth)} icon={Package} accent="var(--acid)" />
        <KpiCard label="Litiges actifs" value={String(stats.activeDisputes)} sub={`${stats.resolvedDisputes} résolus`} icon={AlertTriangle} accent={stats.activeDisputes > 0 ? '#fef3c7' : undefined} />
      </div>

      {/* Utilisateurs & Produits */}
      <p className="font-mono text-[11px] uppercase tracking-widest mb-3" style={{ color: 'var(--concrete-3)' }}>Communauté</p>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label="Utilisateurs" value={String(stats.totalUsers)} sub={`+${stats.newUsersThisMonth} ce mois`} icon={Users} />
        <KpiCard label="Annonces" value={String(stats.totalProducts)} sub={`${stats.availableProducts} disponibles`} icon={Tag} />
      </div>
    </div>
  )
}
