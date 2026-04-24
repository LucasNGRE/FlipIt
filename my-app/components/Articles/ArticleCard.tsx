'use client'

import React from 'react'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useSession } from 'next-auth/react'

interface SkateArticleProps {
  id: number
  title: string
  price: number
  images: { url: string; altText: string | null }[]
  condition: string
  size: string
  userId: number
  user: {
    userId: number
    firstName: string
    image: string
  }
}

const conditionConfig: Record<string, { label: string; color: string }> = {
  Neuf:         { label: 'Neuf',        color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  Comme_neuf:   { label: 'Comme neuf',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  Bon_etat:     { label: 'Bon état',    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  Moyen_etat:   { label: 'Moyen état',  color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  Mauvais_etat: { label: 'Mauvais état',color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}

export default function SkateArticleCard({ id, title, price, images, condition, size, userId, user }: SkateArticleProps) {
  const { data: session } = useSession()
  const userIdFromSession = session?.user?.id ? parseInt(session.user.id, 10) : null
  const isOwner = userIdFromSession !== null && userId === userIdFromSession
  const cond = conditionConfig[condition] ?? { label: condition, color: 'bg-muted text-muted-foreground' }

  return (
    <Link
      href={`/article/${id}`}
      className="group relative flex flex-col rounded-2xl overflow-hidden bg-card border border-border/50 hover:border-brand/40 hover:shadow-lg transition-all duration-300 cursor-pointer"
    >
      {/* Image */}
      <div className="aspect-[4/5] overflow-hidden bg-muted">
        {images.length > 0 ? (
          <img
            src={images[0].url}
            alt={images[0].altText || title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            Aucune image
          </div>
        )}
      </div>

      {/* Condition badge */}
      <span className={`absolute top-3 left-3 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cond.color}`}>
        {cond.label}
      </span>

      {/* Info */}
      <div className="flex flex-col gap-2 p-4">
        <h3 className="font-sans text-sm font-medium leading-snug line-clamp-2 group-hover:text-brand transition-colors duration-150">
          {title}
        </h3>

        <div className="flex items-center justify-between">
          <span className="text-xl font-bold tabular-nums">
            {Number(price).toFixed(0)} €
          </span>
          <span className="text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5">
            {size}
          </span>
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-border/50">
          <Avatar className="h-5 w-5">
            <AvatarImage src={user?.image} />
            <AvatarFallback className="text-xs">{user?.firstName?.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">{user?.firstName}</span>
          {isOwner && (
            <span className="ml-auto text-xs text-brand font-medium">Mon annonce</span>
          )}
        </div>
      </div>
    </Link>
  )
}
