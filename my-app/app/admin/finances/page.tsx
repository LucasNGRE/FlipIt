'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Euro, RefreshCw, Download } from 'lucide-react'

interface FinanceOrder {
  id: number
  finalPrice: string
  updatedAt: string
  product: { title: string }
  buyer: { firstName: string; lastName: string }
  seller: { firstName: string; lastName: string }
}

interface MonthData { month: string; revenue: number; commission: number; refunds: number }

interface FinancesData {
  confirmedOrders: FinanceOrder[]
  refundedOrders: FinanceOrder[]
  monthly: MonthData[]
}

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Fév', '03': 'Mar', '04': 'Avr', '05': 'Mai', '06': 'Juin',
  '07': 'Juil', '08': 'Aoû', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Déc',
}

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

export default function AdminFinancesPage() {
  const [data, setData] = useState<FinancesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'confirmed' | 'refunded'>('confirmed')

  useEffect(() => {
    fetch('/api/admin/finances')
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  const totalRevenue = data?.monthly.reduce((s, m) => s + m.revenue, 0) ?? 0
  const totalCommission = data?.monthly.reduce((s, m) => s + m.commission, 0) ?? 0
  const totalRefunds = data?.monthly.reduce((s, m) => s + m.refunds, 0) ?? 0
  const maxRevenue = Math.max(...(data?.monthly.map(m => m.revenue) ?? [1]))

  const orders = tab === 'confirmed' ? data?.confirmedOrders ?? [] : data?.refundedOrders ?? []

  if (loading) {
    return (
      <div className="px-4 sm:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--paper-2)' }} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-8 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl tracking-tight" style={{ color: 'var(--ink)' }}>Finances</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--concrete-4)' }}>6 derniers mois</p>
        </div>
        <a href="/api/admin/finances/export" download
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity"
          style={{ background: 'var(--ink)', color: 'var(--paper)' }}>
          <Download className="h-4 w-4" />
          Exporter CSV
        </a>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Volume vendu', value: fmt(totalRevenue), icon: TrendingUp, accent: 'var(--acid)' },
          { label: 'Commission FlipIt', value: fmt(totalCommission), sub: '10% du volume', icon: Euro, accent: 'var(--acid)' },
          { label: 'Remboursements', value: fmt(totalRefunds), icon: RefreshCw, accent: undefined },
        ].map(({ label, value, sub, icon: Icon, accent }) => (
          <div key={label} className="rounded-2xl border p-5" style={{ background: 'var(--snow)', borderColor: 'rgba(0,0,0,.06)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--concrete-4)' }}>{label}</p>
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: accent ?? 'var(--paper-2)' }}>
                <Icon className="h-4 w-4" style={{ color: accent ? 'var(--ink)' : 'var(--concrete-3)' }} />
              </div>
            </div>
            <p className="font-display font-bold text-xl tracking-tight" style={{ color: 'var(--ink)' }}>{value}</p>
            {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--concrete-4)' }}>{sub}</p>}
          </div>
        ))}
      </div>

      {/* Monthly bar chart */}
      {data?.monthly && data.monthly.length > 0 && (
        <div className="rounded-2xl border p-6 mb-8" style={{ background: 'var(--snow)', borderColor: 'rgba(0,0,0,.06)' }}>
          <p className="font-mono text-[11px] uppercase tracking-widest mb-5" style={{ color: 'var(--concrete-3)' }}>Volume mensuel</p>
          <div className="flex items-end gap-3 h-32">
            {data.monthly.map(m => {
              const [, month] = m.month.split('-')
              const height = maxRevenue > 0 ? (m.revenue / maxRevenue) * 100 : 0
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-mono" style={{ color: 'var(--concrete-4)' }}>{fmt(m.commission)}</span>
                  <div className="w-full rounded-t-lg transition-all" style={{ height: `${Math.max(height, 4)}%`, background: 'var(--acid)', minHeight: 4 }} />
                  <span className="text-[10px] font-mono" style={{ color: 'var(--concrete-3)' }}>{MONTH_LABELS[month]}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Transactions list */}
      <div className="inline-flex rounded-xl p-1 mb-5 gap-1" style={{ background: 'var(--paper-2)' }}>
        {(['confirmed', 'refunded'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-5 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all"
            style={{
              background: tab === t ? 'var(--ink)' : 'transparent',
              color: tab === t ? 'var(--paper)' : 'var(--concrete-4)',
            }}
          >
            {t === 'confirmed' ? `Ventes (${data?.confirmedOrders.length ?? 0})` : `Remboursements (${data?.refundedOrders.length ?? 0})`}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed py-12 text-center" style={{ borderColor: 'var(--concrete-2)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--concrete-4)' }}>Aucune transaction</p>
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'rgba(0,0,0,.06)' }}>
          <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 640 }}>
            <thead>
              <tr style={{ background: 'var(--paper-2)', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
                {['#', 'Article', 'Acheteur', 'Vendeur', 'Montant vendeur', 'Commission', 'Date'].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--concrete-4)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o, i) => (
                <tr key={o.id} style={{ background: i % 2 === 0 ? 'var(--snow)' : 'var(--paper)', borderBottom: '1px solid rgba(0,0,0,.04)' }}>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--concrete-3)' }}>#{o.id}</td>
                  <td className="px-4 py-3 font-semibold max-w-[160px] truncate" style={{ color: 'var(--ink)' }}>{o.product.title}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--concrete-4)' }}>{o.buyer.firstName} {o.buyer.lastName}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--concrete-4)' }}>{o.seller.firstName} {o.seller.lastName}</td>
                  <td className="px-4 py-3 font-mono font-bold" style={{ color: 'var(--ink)' }}>{fmt(Number(o.finalPrice))}</td>
                  <td className="px-4 py-3 font-mono text-sm" style={{ color: '#065f46' }}>
                    {tab === 'confirmed' ? fmt(Number(o.finalPrice) * 0.10) : '–'}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--concrete-3)' }}>
                    {new Date(o.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}
