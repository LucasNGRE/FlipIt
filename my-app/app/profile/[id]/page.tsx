'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MessageCircle, Package, BadgeCheck, MapPin, Clock } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface Product {
  id: number
  title: string
  price: string
  condition: string
  images: { url: string }[]
}

interface UserProfile {
  id: number
  firstName: string
  lastName: string
  image: string | null
  bio: string | null
  createdAt: string
  products: Product[]
}

const conditionLabels: Record<string, string> = {
  Neuf: 'Neuf', Comme_neuf: 'Comme neuf', Bon_etat: 'Bon état',
  Moyen_etat: 'Moyen état', Mauvais_etat: 'Mauvais état',
}

const TABS = [
  { id: 'annonces', label: 'En vente' },
  { id: 'avis',     label: 'Avis' },
]

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: session } = useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('annonces')

  useEffect(() => {
    fetch(`/api/user/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(setProfile)
      .finally(() => setLoading(false))
  }, [id])

  const handleContact = async () => {
    if (!session) { router.push(`/login?callbackUrl=/profile/${id}`); return }
    if (!profile) return
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: profile.products[0]?.id ?? 0, sellerId: profile.id }),
    })
    if (res.ok) {
      const conv = await res.json()
      router.push(`/inbox?c=${conv.id}`)
    }
  }

  if (loading) {
    return (
      <div>
        {/* Cover skeleton */}
        <div className="h-60 bg-muted animate-pulse" />
        <div className="mx-auto px-8 pt-4" style={{ maxWidth: 1440, display: 'grid', gridTemplateColumns: '300px 1fr', gap: 32 }}>
          <div className="space-y-4" style={{ marginTop: -54 }}>
            <div className="h-28 w-28 rounded-full bg-muted animate-pulse" />
            <div className="h-6 w-40 bg-muted rounded animate-pulse" />
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          </div>
          <div className="pt-6 space-y-4">
            <div className="h-32 bg-muted rounded-2xl animate-pulse" />
            <div className="grid grid-cols-3 gap-4">
              {[1,2,3].map(i => <div key={i} className="aspect-[3/4] bg-muted rounded-xl animate-pulse" />)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="font-display font-bold text-xl">Profil introuvable</p>
        <p className="text-sm mt-1" style={{ color: 'var(--concrete-4)' }}>Cet utilisateur n'existe pas.</p>
      </div>
    )
  }

  const memberSince = new Date(profile.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const isOwnProfile = !!session?.user?.id && session.user.id === id
  const initial = profile.firstName?.charAt(0)?.toUpperCase() ?? '?'

  return (
    <div>
      {/* ── Cover banner ─────────────────────────────── */}
      <section
        className="relative w-full overflow-hidden"
        style={{ height: 240, background: 'var(--ink)' }}
      >
        {/* Dark gradient overlay */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(10,10,10,.4) 100%)' }} />
        {/* Decorative grid pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, var(--acid) 0px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, var(--acid) 0px, transparent 1px, transparent 40px)',
            backgroundSize: '40px 40px',
          }}
        />
        {isOwnProfile && (
          <button
            className="absolute top-4 right-4 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.1em] cursor-pointer hover:bg-white/10 transition-colors"
            style={{ background: 'rgba(255,255,255,.15)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,.25)', color: 'var(--paper)' }}
          >
            ✎ Modifier bannière
          </button>
        )}
      </section>

      {/* ── Main layout: sidebar + content ───────────── */}
      <div
        className="mx-auto px-8"
        style={{ maxWidth: 1440, display: 'grid', gridTemplateColumns: '300px 1fr', gap: 32 }}
      >
        {/* ── Sidebar ────────────────────────────────── */}
        <aside style={{ marginTop: -54 }}>
          {/* Avatar */}
          <Avatar
            className="ring-4 ring-background shadow-lg"
            style={{ width: 108, height: 108 }}
          >
            <AvatarImage src={profile.image ?? undefined} />
            <AvatarFallback
              className="text-3xl font-bold"
              style={{ background: 'var(--carbon)', color: 'var(--paper)' }}
            >
              {initial}
            </AvatarFallback>
          </Avatar>

          {/* Name + handle */}
          <div className="mt-4">
            <h1
              className="font-display font-bold"
              style={{ fontSize: 26, letterSpacing: '-.02em' }}
            >
              {profile.firstName} {profile.lastName}
            </h1>
            <div
              className="font-mono text-[12px] mt-1"
              style={{ color: 'var(--concrete-3)' }}
            >
              @{profile.firstName?.toLowerCase()}.{profile.lastName?.toLowerCase()} · Paris
            </div>
            {profile.bio && (
              <p
                className="text-[14px] leading-relaxed mt-3"
                style={{ color: 'var(--concrete-4)' }}
              >
                {profile.bio}
              </p>
            )}
          </div>

          {/* Action buttons */}
          {!isOwnProfile && (
            <div className="flex gap-2 mt-5">
              <button
                className="flex-1 rounded-full py-2.5 text-sm font-bold hover:opacity-90 transition-opacity cursor-pointer"
                style={{ background: 'var(--acid)', color: 'var(--ink)' }}
              >
                + Suivre
              </button>
              <button
                onClick={handleContact}
                className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-semibold hover:bg-foreground/5 transition-colors cursor-pointer"
                style={{ borderColor: 'var(--ink)', color: 'var(--ink)' }}
              >
                <MessageCircle className="h-4 w-4" />
                Message
              </button>
            </div>
          )}

          {/* Stats card */}
          <div
            className="mt-6 p-5 rounded-[16px] border"
            style={{ background: 'var(--snow)', borderColor: 'rgba(0,0,0,.06)' }}
          >
            <div
              className="font-mono text-[10px] uppercase tracking-[.14em] mb-3"
              style={{ color: 'var(--concrete-4)' }}
            >
              STATS
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              {[
                ['Annonces', profile.products.length],
                ['Ventes', '—'],
                ['Suiveurs', '—'],
                ['Note', '—'],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <div
                    className="font-display font-extrabold"
                    style={{ fontSize: 22, letterSpacing: '-.02em' }}
                  >
                    {value}
                  </div>
                  <div
                    className="font-mono text-[10px]"
                    style={{ color: 'var(--concrete-3)' }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Info items */}
          <div
            className="mt-4 p-4 font-mono text-[11px] flex flex-col gap-2"
            style={{ color: 'var(--concrete-4)' }}
          >
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--acid-deep)' }} />
              Identité vérifiée
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 flex-shrink-0" />
              Répond généralement vite
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              Membre depuis {memberSince}
            </div>
          </div>
        </aside>

        {/* ── Main content ───────────────────────────── */}
        <main className="pt-6 pb-16">
          {/* Tab bar */}
          <div
            className="flex gap-1 border-b mb-6"
            style={{ borderColor: 'var(--concrete-2)' }}
          >
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="inline-flex items-center gap-2 px-4 py-3.5 text-[14px] font-semibold cursor-pointer transition-colors"
                style={{
                  color: tab === t.id ? 'var(--ink)' : 'var(--concrete-3)',
                  borderBottom: `2px solid ${tab === t.id ? 'var(--acid)' : 'transparent'}`,
                  marginBottom: -1,
                }}
              >
                {t.label}
                <span
                  className="font-mono text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{
                    background: tab === t.id ? 'var(--ink)' : 'var(--paper-2)',
                    color: tab === t.id ? 'var(--acid)' : 'var(--concrete-3)',
                  }}
                >
                  {t.id === 'annonces' ? profile.products.length : 0}
                </span>
              </button>
            ))}
          </div>

          {/* Tab: Annonces */}
          {tab === 'annonces' && (
            <>
              <div className="flex items-baseline justify-between mb-5">
                <div
                  className="font-mono text-[11px] uppercase tracking-[.14em]"
                  style={{ color: 'var(--concrete-4)' }}
                >
                  ↳ {profile.products.length} ANNONCES ACTIVES
                </div>
                {isOwnProfile && (
                  <Link href="/items/add-item">
                    <button
                      className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-bold cursor-pointer hover:opacity-90 transition-opacity"
                      style={{ background: 'var(--acid)', color: 'var(--ink)' }}
                    >
                      + Nouvelle annonce
                    </button>
                  </Link>
                )}
              </div>

              {profile.products.length === 0 ? (
                <div
                  className="rounded-[16px] border-2 border-dashed py-20 text-center"
                  style={{ borderColor: 'var(--concrete-2)' }}
                >
                  <Package className="h-10 w-10 mx-auto mb-3" style={{ color: 'var(--concrete-2)' }} />
                  <p className="text-sm font-semibold" style={{ color: 'var(--concrete-4)' }}>Aucune annonce pour le moment</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {profile.products.map(product => (
                    <Link
                      key={product.id}
                      href={`/article/${product.id}`}
                      className="block group cursor-pointer"
                    >
                      <div
                        className="overflow-hidden border transition-all duration-250 group-hover:-translate-y-1 group-hover:shadow-xl"
                        style={{ borderRadius: 'var(--r-lg)', borderColor: 'var(--ink)' }}
                      >
                        {/* Image */}
                        <div className="relative w-full" style={{ height: 200 }}>
                          {product.images[0] ? (
                            <Image
                              src={product.images[0].url}
                              alt={product.title}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center font-mono text-xs uppercase tracking-widest"
                              style={{ background: 'var(--ink)', color: 'var(--acid)' }}
                            >
                              No photo
                            </div>
                          )}
                          {/* Condition badge */}
                          <span
                            className="absolute top-2 left-2 rounded px-2 py-0.5 text-[10px] font-semibold border"
                            style={{ background: 'rgba(245,243,238,.85)', backdropFilter: 'blur(8px)', borderColor: 'rgba(0,0,0,.1)', color: 'var(--ink)' }}
                          >
                            {conditionLabels[product.condition] ?? product.condition}
                          </span>
                        </div>
                        {/* Info */}
                        <div className="p-3">
                          <p className="text-[14px] font-semibold truncate" style={{ color: 'var(--ink)' }}>{product.title}</p>
                          <p className="font-mono font-bold mt-1" style={{ fontSize: 18, letterSpacing: '-.02em' }}>
                            {Number(product.price).toFixed(0)}€
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Tab: Avis */}
          {tab === 'avis' && (
            <div
              className="flex flex-col items-center justify-center py-24 text-center"
              style={{ color: 'var(--concrete-3)' }}
            >
              <div
                className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'var(--paper-2)' }}
              >
                <span className="text-2xl">⭐</span>
              </div>
              <p className="font-semibold">Les avis arrivent bientôt</p>
              <p className="text-sm mt-1" style={{ color: 'var(--concrete-4)' }}>Système de notation en cours de développement</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
