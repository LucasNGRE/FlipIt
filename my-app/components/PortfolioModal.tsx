'use client'

import { useEffect, useState } from 'react'
import { X, ShoppingBag, MessageCircle, Tag, CreditCard, FlaskConical } from 'lucide-react'

const STORAGE_KEY = 'flipit_portfolio_seen'

interface Props {
  alwaysShow?: boolean
}

export default function PortfolioModal({ alwaysShow = false }: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (alwaysShow) {
      setOpen(true)
      return
    }
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true)
    } catch {}
  }, [alwaysShow])

  const close = () => {
    setOpen(false)
    if (!alwaysShow) {
      try { localStorage.setItem(STORAGE_KEY, '1') } catch {}
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ background: 'rgba(10,10,10,.7)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--snow)' }}
      >
        {/* Header */}
        <div className="px-7 pt-7 pb-5" style={{ background: 'var(--ink)' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-widest mb-3"
                style={{ background: 'rgba(202,255,0,.15)', color: 'var(--acid)' }}
              >
                <FlaskConical className="h-3 w-3" />
                Projet Portfolio
              </span>
              <h2 className="font-display font-bold text-2xl leading-tight" style={{ color: '#fff', letterSpacing: '-.02em' }}>
                Bienvenue sur FlipIt
              </h2>
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,.5)' }}>
                Marketplace du skate d&apos;occasion — version démo
              </p>
            </div>
            <button
              onClick={close}
              className="flex-shrink-0 mt-1 rounded-lg p-1.5 cursor-pointer transition-colors hover:bg-white/10"
            >
              <X className="h-4 w-4" style={{ color: 'rgba(255,255,255,.4)' }} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-7 py-5 space-y-5">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--concrete-4)' }}>
            FlipIt est un projet de démonstration conçu pour un portfolio de développeur.
            Ce n&apos;est <strong style={{ color: 'var(--ink)' }}>pas une vraie marketplace</strong> — aucune annonce n&apos;est réelle
            et aucune transaction financière n&apos;est effectuée.
          </p>

          <div className="space-y-2.5">
            <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--concrete-3)' }}>
              Ce que tu peux simuler
            </p>
            {[
              { icon: Tag,            text: 'Publier des annonces et gérer ton profil vendeur' },
              { icon: ShoppingBag,    text: 'Faire des offres et négocier un prix' },
              { icon: MessageCircle,  text: 'Envoyer des messages aux autres utilisateurs' },
              { icon: CreditCard,     text: 'Passer une commande avec un paiement fictif' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--paper-2)' }}>
                  <Icon className="h-3.5 w-3.5" style={{ color: 'var(--concrete-3)' }} />
                </div>
                <p className="text-sm" style={{ color: 'var(--concrete-4)' }}>{text}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl p-4" style={{ background: '#fefce8', border: '1.5px solid #fbbf24' }}>
            <p className="text-sm font-semibold" style={{ color: '#92400e' }}>
              Les paiements sont 100% fictifs
            </p>
            <p className="text-xs mt-1" style={{ color: '#b45309' }}>
              Stripe est configuré en mode test. Aucune vraie carte de crédit ne peut être débitée — toute tentative avec une vraie carte sera automatiquement refusée.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-7 pb-7">
          <button
            onClick={close}
            className="w-full rounded-2xl py-3.5 text-sm font-bold cursor-pointer hover:opacity-90 transition-opacity"
            style={{ background: 'var(--ink)', color: 'var(--acid)' }}
          >
            J&apos;ai compris — Explorer le site →
          </button>
        </div>
      </div>
    </div>
  )
}
