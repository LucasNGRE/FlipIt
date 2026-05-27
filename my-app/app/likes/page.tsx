'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SkateArticleCard from '@/components/Articles/ArticleCard'
import { Heart } from 'lucide-react'

export default function LikesPage() {
  const { status } = useSession()
  const router = useRouter()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login?callbackUrl=/likes'); return }
    if (status !== 'authenticated') return

    fetch('/api/likes')
      .then(r => r.ok ? r.json() : [])
      .then(setProducts)
      .finally(() => setLoading(false))
  }, [status, router])

  return (
    <div className="mx-auto px-8 py-12" style={{ maxWidth: 1440 }}>

      {/* Header */}
      <div className="mb-10">
        <div className="font-mono text-[11px] uppercase tracking-[.14em] mb-2" style={{ color: 'var(--concrete-4)' }}>
          ↳ TES COUPS DE CŒUR
        </div>
        <h1 className="font-display font-extrabold" style={{ fontSize: 44, letterSpacing: '-.025em', lineHeight: 1 }}>
          Articles likés.
        </h1>
      </div>

      {/* States */}
      {status === 'loading' || loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-muted animate-pulse aspect-[4/5]" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div
            className="h-20 w-20 rounded-2xl flex items-center justify-center mb-6"
            style={{ background: 'var(--paper-2)' }}
          >
            <Heart className="h-10 w-10" style={{ color: 'var(--concrete-3)' }} />
          </div>
          <p className="font-display font-bold text-xl mb-2">Aucun article liké</p>
          <p className="text-sm mb-6" style={{ color: 'var(--concrete-4)' }}>
            Clique sur le ❤ d'une annonce pour la retrouver ici.
          </p>
          <Link href="/">
            <button
              className="rounded-full px-6 py-3 text-sm font-bold hover:opacity-90 transition-opacity cursor-pointer"
              style={{ background: 'var(--acid)', color: 'var(--ink)' }}
            >
              Explorer les annonces →
            </button>
          </Link>
        </div>
      ) : (
        <>
          <p className="font-mono text-[11px] mb-6" style={{ color: 'var(--concrete-4)' }}>
            {products.length} article{products.length > 1 ? 's' : ''} sauvegardé{products.length > 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map(p => (
              <SkateArticleCard key={p.id} {...p} user={p.user} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
