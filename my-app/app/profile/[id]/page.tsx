'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft, CalendarDays, Package, Star, MessageCircle } from 'lucide-react'
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

const conditionColors: Record<string, string> = {
  Neuf:         'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Comme_neuf:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Bon_etat:     'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  Moyen_etat:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Mauvais_etat: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}
const conditionLabels: Record<string, string> = {
  Neuf: 'Neuf', Comme_neuf: 'Comme neuf', Bon_etat: 'Bon état',
  Moyen_etat: 'Moyen état', Mauvais_etat: 'Mauvais état',
}

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: session } = useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

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
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full bg-muted animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className="h-6 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="aspect-square bg-muted rounded-2xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="font-semibold text-lg">Profil introuvable</p>
        <p className="text-sm text-muted-foreground mt-1">Cet utilisateur n'existe pas.</p>
      </div>
    )
  }

  const memberSince = new Date(profile.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const isOwnProfile = session?.user?.email && String(profile.id) === id

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">

      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </button>

      {/* Profile card */}
      <div className="rounded-2xl border border-border bg-card p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <Avatar className="h-20 w-20 ring-4 ring-background shadow-md flex-shrink-0">
            <AvatarImage src={profile.image ?? undefined} />
            <AvatarFallback className="text-2xl font-bold bg-brand/10 text-brand">
              {profile.firstName?.charAt(0)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold">{profile.firstName} {profile.lastName}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                Membre depuis {memberSince}
              </span>
              <span className="flex items-center gap-1">
                <Package className="h-3.5 w-3.5" />
                {profile.products.length} annonce{profile.products.length !== 1 ? 's' : ''}
              </span>
            </div>
            {profile.bio && (
              <p className="mt-3 text-sm leading-relaxed text-foreground/80 max-w-lg">{profile.bio}</p>
            )}
          </div>

          {!isOwnProfile && (
            <button
              onClick={handleContact}
              className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand/90 transition-colors cursor-pointer flex-shrink-0"
            >
              <MessageCircle className="h-4 w-4" />
              Contacter
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Annonces', value: profile.products.length },
          { label: 'Avis', value: '—' },
          { label: 'Note', value: <span className="flex items-center justify-center gap-1"><Star className="h-4 w-4 text-yellow-400 fill-yellow-400" /> —</span> },
        ].map(stat => (
          <div key={stat.label} className="rounded-2xl border border-border bg-card p-4 text-center">
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Listings */}
      <div>
        <h2 className="font-bold text-base mb-4 flex items-center gap-2">
          <Package className="h-4 w-4 text-brand" />
          Annonces de {profile.firstName}
        </h2>

        {profile.products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center">
            <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Aucune annonce pour le moment</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {profile.products.map(product => (
              <Link
                key={product.id}
                href={`/article/${product.id}`}
                className="group rounded-2xl border border-border bg-card overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
              >
                <div className="aspect-square relative bg-muted">
                  {product.images[0] ? (
                    <Image
                      src={product.images[0].url}
                      alt={product.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Package className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                  <span className={`absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${conditionColors[product.condition] ?? 'bg-muted text-muted-foreground'}`}>
                    {conditionLabels[product.condition] ?? product.condition}
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-xs font-medium truncate">{product.title}</p>
                  <p className="text-sm font-bold mt-0.5">{Number(product.price).toFixed(0)} €</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Reviews placeholder */}
      <div className="mt-8">
        <h2 className="font-bold text-base mb-4 flex items-center gap-2">
          <Star className="h-4 w-4 text-brand" />
          Avis reçus
        </h2>
        <div className="rounded-2xl border border-dashed border-border py-12 text-center">
          <Star className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Les avis arrivent bientôt</p>
        </div>
      </div>

    </div>
  )
}
