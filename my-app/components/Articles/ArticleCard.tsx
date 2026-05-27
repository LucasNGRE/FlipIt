'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Heart } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface SkateArticleProps {
  id: number
  title: string
  price: number
  images: { url: string; altText: string | null }[]
  condition: string
  size: string
  userId: number
  status?: string
  user: {
    userId: number
    firstName: string
    image: string
  }
}

const conditionConfig: Record<string, { label: string }> = {
  Neuf:         { label: 'Neuf' },
  Comme_neuf:   { label: 'Comme neuf' },
  Bon_etat:     { label: 'Bon état' },
  Moyen_etat:   { label: 'Moyen état' },
  Mauvais_etat: { label: 'Mauvais état' },
}

export default function SkateArticleCard({ id, title, price, images, condition, size, userId, status: itemStatus, user }: SkateArticleProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const userIdFromSession = session?.user?.id ? parseInt(session.user.id, 10) : null
  const isOwner = userIdFromSession !== null && userId === userIdFromSession
  const cond = conditionConfig[condition] ?? { label: condition }

  const [isLiked, setIsLiked] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch(`/api/likes/${id}`)
      .then(r => r.ok ? r.json() : { liked: false })
      .then(d => setIsLiked(d.liked))
  }, [id, status])

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (status !== 'authenticated') {
      router.push(`/login?callbackUrl=/article/${id}`)
      return
    }
    if (likeLoading) return
    setLikeLoading(true)
    const res = await fetch('/api/likes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: id }),
    })
    if (res.ok) {
      const d = await res.json()
      setIsLiked(d.liked)
    }
    setLikeLoading(false)
  }

  return (
    <Link
      href={`/article/${id}`}
      className="group relative flex flex-col overflow-hidden bg-card transition-all duration-250 cursor-pointer hover:-translate-y-1"
      style={{ borderRadius: 'var(--r-lg)', border: '1px solid var(--ink)' }}
    >
      {/* Image */}
      <div className="aspect-[4/5] overflow-hidden bg-muted relative group-hover:shadow-[0_14px_30px_rgba(0,0,0,.12)]">
        {images.length > 0 ? (
          <img
            src={images[0].url}
            alt={images[0].altText || title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground text-xs font-mono">
            — aucune image —
          </div>
        )}

        {/* Condition badge – top left */}
        <span className="absolute top-2.5 left-2.5 rounded-full bg-card/85 backdrop-blur-sm border border-border/60 px-2 py-0.5 text-[10px] font-semibold text-foreground/80">
          {cond.label}
        </span>

        {/* Réservé overlay */}
        {itemStatus === 'reserved' && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(10,10,10,.45)' }}>
            <span className="font-mono text-xs font-bold uppercase tracking-widest rounded-full px-3 py-1" style={{ background: 'var(--acid)', color: 'var(--ink)' }}>
              Réservé
            </span>
          </div>
        )}

        {isOwner ? (
          <span
            className="absolute top-2.5 right-2.5 rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{ background: 'var(--acid)', color: 'var(--ink)' }}
          >
            Mon annonce
          </span>
        ) : (
          <button
            onClick={handleLike}
            disabled={likeLoading}
            aria-label={isLiked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            className={`absolute top-2.5 right-2.5 h-7 w-7 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer
              ${isLiked
                ? 'bg-white text-red-500 shadow-md'
                : 'bg-card/80 backdrop-blur-sm text-foreground/60 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-white hover:shadow-md'
              }`}
          >
            <Heart className={`h-3.5 w-3.5 ${isLiked ? 'fill-current' : ''}`} />
          </button>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1.5 p-3.5">
        <h3 className="font-sans text-sm font-medium leading-snug line-clamp-2 text-foreground/90 group-hover:text-foreground transition-colors duration-150">
          {title}
        </h3>

        <div className="flex items-center justify-between mt-0.5">
          <span className="font-display font-extrabold" style={{ fontSize: 18, letterSpacing: '-.02em' }}>
            {Number(price).toFixed(0)}€
          </span>
          {size && (
            <span className="text-[10px] font-mono text-muted-foreground border border-border rounded-full px-2 py-0.5">
              {size}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-border/60">
          <Avatar className="h-4 w-4">
            <AvatarImage src={user?.image} />
            <AvatarFallback className="text-[9px]">{user?.firstName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="text-[11px] text-muted-foreground">{user?.firstName}</span>
        </div>
      </div>
    </Link>
  )
}
