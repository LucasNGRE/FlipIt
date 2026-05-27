'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { ArrowRight, Flame } from 'lucide-react'
import Image from 'next/image'

interface FeaturedProduct {
  id: number
  title: string
  price: number | string
  brand?: string
  condition: string
  images: { url: string; altText?: string | null }[]
  user?: { firstName: string; image?: string | null }
}

interface Stats {
  totalProducts: number
  totalUsers: number
  todayProducts: number
  totalTransactions: number
}

export default function LandingHero() {
  const { data: session } = useSession()
  const [featured, setFeatured] = useState<FeaturedProduct | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/products?limit=1')
      .then(r => r.ok ? r.json() : [])
      .then((data: FeaturedProduct[]) => { if (data[0]) setFeatured(data[0]) })
      .catch(() => {})

    fetch('/api/stats')
      .then(r => r.ok ? r.json() : null)
      .then(setStats)
      .catch(() => {})
  }, [])

  return (
    <>
      {/* ── Editorial 2-col hero ────────────────────────── */}
      <section
        className="mx-auto px-8 pt-10 pb-6"
        style={{ maxWidth: 1440, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 32, alignItems: 'end' }}
      >
        {/* Left — headline */}
        <div>
          <div
            className="font-mono text-[11px] uppercase tracking-[.14em]"
            style={{ color: 'var(--concrete-4)' }}
          >
            S22 · DROP HEBDO · LIVE NOW
          </div>
          <h1
            className="font-display font-extrabold mt-3"
            style={{
              fontSize: 'clamp(64px, 9vw, 130px)',
              letterSpacing: '-.045em',
              lineHeight: .87,
              color: 'var(--ink)',
            }}
          >
            Trouve ton<br />
            <span className="acid-hl">setup</span><br />
            de rêve.
          </h1>
          <p
            className="font-sans leading-relaxed mt-6"
            style={{ fontSize: 18, color: 'var(--concrete-4)', maxWidth: 460 }}
          >
            La plateforme de revente dédiée au skate. Trouve le matos qu'il te faut, vends ce qui dort dans ton garage.
          </p>
          <div className="flex items-center gap-3 mt-7">
            <Link href="/#articles">
              <button
                className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold hover:opacity-90 transition-opacity cursor-pointer"
                style={{ background: 'var(--acid)', color: 'var(--ink)' }}
              >
                Explorer le feed <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
            <Link href={session ? '/items/add-item' : '/register'}>
              <button
                className="inline-flex items-center gap-2 rounded-full border px-7 py-3.5 text-sm font-bold hover:bg-foreground/5 transition-colors cursor-pointer"
                style={{ borderColor: 'var(--ink)', color: 'var(--ink)' }}
              >
                Vendre du matos
              </button>
            </Link>
          </div>
        </div>

        {/* Right — featured card */}
        {featured ? (
          <Link href={`/article/${featured.id}`} className="block">
            <div
              className="relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl cursor-pointer"
              style={{ borderRadius: 'var(--r-xl)', border: '1px solid var(--ink)' }}
            >
              {/* Product image */}
              <div className="relative w-full" style={{ height: 400 }}>
                {featured.images[0] ? (
                  <Image
                    src={featured.images[0].url}
                    alt={featured.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1440px) 40vw"
                    priority
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center font-mono text-xs uppercase tracking-widest"
                    style={{ background: 'var(--ink)', color: 'var(--acid)' }}
                  >
                    {featured.brand ?? 'FlipIt'}
                  </div>
                )}
              </div>

              {/* Glass info overlay */}
              <div
                className="absolute bottom-3.5 left-3.5 right-3.5 rounded-xl p-3.5"
                style={{
                  background: 'rgba(245,243,238,.72)',
                  backdropFilter: 'blur(16px) saturate(140%)',
                  WebkitBackdropFilter: 'blur(16px) saturate(140%)',
                  border: '1px solid rgba(255,255,255,.5)',
                }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div
                      className="font-mono text-[9px] uppercase tracking-[.14px]"
                      style={{ color: 'var(--concrete-4)' }}
                    >
                      FEATURED · {featured.brand?.toUpperCase() ?? 'DECK'}
                    </div>
                    <div
                      className="font-display font-bold mt-1"
                      style={{ fontSize: 20, letterSpacing: '-.02em' }}
                    >
                      {featured.title}
                    </div>
                    <div
                      className="font-mono text-[10px] mt-1"
                      style={{ color: 'var(--concrete-4)' }}
                    >
                      @{featured.user?.firstName?.toLowerCase() ?? 'vendeur'}
                    </div>
                  </div>
                  <div
                    className="font-display font-extrabold px-1.5"
                    style={{ fontSize: 28, letterSpacing: '-.02em', background: 'var(--acid)' }}
                  >
                    {Number(featured.price).toFixed(0)}€
                  </div>
                </div>
              </div>

              {/* HOT DROP badge */}
              <div
                className="absolute top-3.5 left-3.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[.1em]"
                style={{ background: 'var(--acid)', color: 'var(--ink)' }}
              >
                <Flame className="h-2.5 w-2.5" /> HOT DROP
              </div>
            </div>
          </Link>
        ) : (
          /* Skeleton while loading */
          <div
            className="animate-pulse"
            style={{ height: 400, borderRadius: 'var(--r-xl)', background: 'var(--paper-2)', border: '1px solid var(--concrete-2)' }}
          />
        )}
      </section>

      {/* ── Stats strip ───────────────────────────────── */}
      <div
        className="mx-auto px-8 py-6 border-b flex flex-wrap gap-9"
        style={{ maxWidth: 1440, borderColor: 'rgba(0,0,0,.08)' }}
      >
        {[
          [stats ? stats.totalProducts.toLocaleString('fr-FR') : '—', 'annonces vivantes'],
          [stats ? stats.totalUsers.toLocaleString('fr-FR') : '—', 'skaters inscrits'],
          [stats ? stats.todayProducts.toLocaleString('fr-FR') : '—', 'drops aujourd\'hui'],
          [stats ? stats.totalTransactions.toLocaleString('fr-FR') : '—', 'transactions réussies'],
        ].map(([n, l]) => (
          <div key={l}>
            <div
              className="font-display font-extrabold"
              style={{ fontSize: 28, letterSpacing: '-.02em' }}
            >
              {n}
            </div>
            <div
              className="font-mono text-[10px] uppercase tracking-[.14em] mt-0.5"
              style={{ color: 'var(--concrete-4)' }}
            >
              {l}
            </div>
          </div>
        ))}
      </div>

      {/* ── Marquee strip ─────────────────────────────── */}
      <div
        className="w-full overflow-hidden border-y"
        style={{ background: 'var(--ink)', borderColor: 'rgba(255,255,255,.08)' }}
        aria-hidden="true"
      >
        <div
          className="animate-marquee whitespace-nowrap py-3 font-mono text-[13px] uppercase tracking-[.1em]"
          style={{ color: 'var(--acid)' }}
        >
          {['decks', 'trucks', 'wheels', 'bearings', 'grip', 'shoes', 'apparel', 'completes', 'protection', 'new in', 'offres', 'hot deals',
            'decks', 'trucks', 'wheels', 'bearings', 'grip', 'shoes', 'apparel', 'completes', 'protection', 'new in', 'offres', 'hot deals'].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-3 mx-3">
              {item}
              <span className="opacity-40">·</span>
            </span>
          ))}
        </div>
      </div>
    </>
  )
}
