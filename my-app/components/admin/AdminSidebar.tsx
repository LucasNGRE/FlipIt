'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, AlertTriangle, Package, Users, Tag, BarChart3, LogOut, Flag, AlertOctagon, Search, ScrollText } from 'lucide-react'

const NAV = [
  { href: '/admin',              label: 'Dashboard',    icon: LayoutDashboard, exact: true },
  { href: '/admin/disputes',     label: 'Litiges',      icon: AlertTriangle },
  { href: '/admin/reports',      label: 'Signalements', icon: Flag },
  { href: '/admin/chargebacks',  label: 'Chargebacks',  icon: AlertOctagon },
  { href: '/admin/orders',       label: 'Commandes',    icon: Package },
  { href: '/admin/users',        label: 'Utilisateurs', icon: Users },
  { href: '/admin/products',     label: 'Annonces',     icon: Tag },
  { href: '/admin/finances',     label: 'Finances',     icon: BarChart3 },
  { href: '/admin/search',       label: 'Recherche',    icon: Search },
  { href: '/admin/logs',         label: 'Journaux',     icon: ScrollText },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const logout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.push('/admin/login')
  }

  return (
    <aside className="w-56 flex flex-col h-full flex-shrink-0" style={{ background: 'var(--ink)' }}>
      <div className="px-5 py-6 border-b" style={{ borderColor: 'rgba(255,255,255,.08)' }}>
        <span className="font-display font-bold text-xl" style={{ color: 'var(--acid)' }}>FlipIt</span>
        <span className="font-mono text-[10px] uppercase tracking-widest block mt-0.5" style={{ color: 'rgba(255,255,255,.3)' }}>
          Administration
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: active ? 'rgba(202,255,0,.12)' : 'transparent',
                color: active ? 'var(--acid)' : 'rgba(255,255,255,.45)',
              }}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 pb-5 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,.08)' }}>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors hover:bg-white/5"
          style={{ color: 'rgba(255,255,255,.3)' }}
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
