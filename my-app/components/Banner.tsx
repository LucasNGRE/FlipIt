'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { ArrowRight } from 'lucide-react'

interface BannerProps {
  image: string
  infoTitle?: string
  infoDescription?: string
}

export default function StaticBanner({
  image,
  infoTitle = "La marketplace du skate d'occasion",
  infoDescription = "Achète et vends du matos de skate entre passionnés. Des planches, trucks, roues et fringues à petits prix.",
}: BannerProps = {
  image: '/placeholder.svg?height=400&width=800'
}) {
  const { data: session } = useSession()

  return (
    <div className="relative w-full h-[85vh] min-h-[500px] overflow-hidden">
      <img
        src={image}
        alt="FlipIt banner"
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />

      <div className="absolute inset-0 flex items-center">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-xl">
            <span className="inline-block mb-4 rounded-full bg-brand/20 border border-green-500/30 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-green-400">
              Marketplace Skate
            </span>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4">
              {infoTitle}
            </h1>
            <p className="text-base sm:text-lg text-white/70 mb-8 leading-relaxed">
              {infoDescription}
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              {!session ? (
                <Link href="/register">
                  <button className="flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors duration-200 cursor-pointer">
                    Commencer à vendre <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
              ) : (
                <Link href="/items/add-item">
                  <button className="flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors duration-200 cursor-pointer">
                    Déposer une annonce <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
              )}
              <Link href="#articles">
                <button className="rounded-full border border-white/30 bg-white/10 backdrop-blur-sm px-6 py-3 text-sm font-semibold text-white hover:bg-white/20 transition-colors duration-200 cursor-pointer">
                  Explorer les articles
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
