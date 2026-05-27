'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { CheckCircle, AlertCircle, ExternalLink, Loader2, ArrowRight, BarChart2 } from 'lucide-react'

type Step = 'idle' | 'loading' | 'redirecting' | 'success' | 'error' | 'refresh' | 'already-onboarded'

function SellerOnboardingContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<Step>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const isSuccess = searchParams.get('success') === '1'
  const isRefresh = searchParams.get('refresh') === '1'

  // Vérifie le statut onboarding au chargement
  useEffect(() => {
    if (status !== 'authenticated') return

    if (!isSuccess && !isRefresh) {
      // Visite directe : vérifie si déjà onboardé
      fetch('/api/stripe/onboarding')
        .then(r => r.json())
        .then(data => { if (data.onboarded) setStep('already-onboarded') })
        .catch(() => {})
      return
    }

    // Retour depuis Stripe
    setStep('loading')
    fetch('/api/stripe/onboarding')
      .then(r => r.json())
      .then(data => {
        if (data.onboarded) {
          setStep('already-onboarded')
        } else {
          setStep('refresh')
          setErrorMsg('Votre compte n\'est pas encore totalement activé. Cliquez ci-dessous pour compléter l\'inscription.')
        }
      })
      .catch(() => {
        setStep('error')
        setErrorMsg('Erreur lors de la vérification du compte. Réessayez.')
      })
  }, [isSuccess, isRefresh, status])

  const openDashboard = async () => {
    setStep('loading')
    try {
      const res = await fetch('/api/stripe/dashboard')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur')
      window.open(data.url, '_blank')
    } finally {
      setStep('already-onboarded')
    }
  }

  const startOnboarding = async () => {
    if (status !== 'authenticated') {
      router.push('/login?callbackUrl=/profile/seller-onboarding')
      return
    }
    setStep('loading')
    setErrorMsg(null)
    try {
      const res = await fetch('/api/stripe/onboarding', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur')
      setStep('redirecting')
      window.location.href = data.url
    } catch (err: any) {
      setStep('error')
      setErrorMsg(err.message)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--acid)' }} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-20">
      {/* Header */}
      <div className="mb-10 text-center">
        <div
          className="inline-flex h-16 w-16 items-center justify-center rounded-2xl mb-5"
          style={{ background: 'var(--ink)' }}
        >
          <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="var(--acid)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className="font-display font-bold text-2xl tracking-tight mb-2" style={{ color: 'var(--ink)' }}>
          Devenir vendeur
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--concrete-4)' }}>
          Connectez votre compte bancaire via Stripe pour recevoir vos paiements directement.
        </p>
      </div>

      {/* Card */}
      <div
        className="rounded-2xl border p-6 space-y-6"
        style={{ background: 'var(--snow)', borderColor: 'rgba(0,0,0,.08)' }}
      >
        {/* Already onboarded state */}
        {step === 'already-onboarded' && (
          <div className="flex flex-col items-center text-center gap-4 py-4">
            <CheckCircle className="h-12 w-12" style={{ color: 'var(--acid)' }} />
            <div>
              <p className="font-bold text-lg" style={{ color: 'var(--ink)' }}>Compte actif</p>
              <p className="text-sm mt-1" style={{ color: 'var(--concrete-4)' }}>
                Vos paiements sont activés. Consultez votre solde et vos virements sur Stripe.
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={openDashboard}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold cursor-pointer hover:opacity-90 transition-opacity"
                style={{ background: 'var(--ink)', color: 'var(--paper)' }}
              >
                <BarChart2 className="h-4 w-4" />
                Mon dashboard Stripe
              </button>
              <button
                onClick={() => router.push('/orders')}
                className="flex-1 rounded-xl py-3 text-sm font-semibold border cursor-pointer hover:bg-black/5 transition-colors"
                style={{ borderColor: 'rgba(0,0,0,.12)', color: 'var(--concrete-4)' }}
              >
                Mes commandes
              </button>
            </div>
          </div>
        )}

        {/* Success state (legacy, redirige vers already-onboarded) */}
        {step === 'success' && (
          <div className="flex flex-col items-center text-center gap-4 py-4">
            <CheckCircle className="h-12 w-12" style={{ color: 'var(--acid)' }} />
            <div>
              <p className="font-bold text-lg" style={{ color: 'var(--ink)' }}>Compte activé !</p>
              <p className="text-sm mt-1" style={{ color: 'var(--concrete-4)' }}>
                Vous pouvez désormais recevoir des paiements sur FlipIt.
              </p>
            </div>
            <button
              onClick={() => router.push('/orders')}
              className="mt-2 rounded-xl px-6 py-3 text-sm font-bold cursor-pointer hover:opacity-90 transition-opacity"
              style={{ background: 'var(--acid)', color: 'var(--ink)' }}
            >
              Voir mes commandes
            </button>
          </div>
        )}

        {/* Error state */}
        {(step === 'error' || step === 'refresh') && (
          <div
            className="flex items-start gap-3 rounded-xl p-4"
            style={{ background: 'rgba(239,68,68,.08)' }}
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
            <p className="text-sm" style={{ color: '#ef4444' }}>{errorMsg}</p>
          </div>
        )}

        {/* Loading / Redirecting */}
        {(step === 'loading' || step === 'redirecting') && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--acid)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--concrete-4)' }}>
              {step === 'redirecting' ? 'Redirection vers Stripe…' : 'Chargement…'}
            </p>
          </div>
        )}

        {/* Idle / default CTA */}
        {(step === 'idle' || step === 'error' || step === 'refresh') && (
          <>
            {/* How it works */}
            <div className="space-y-3">
              {[
                { n: '01', title: 'Création du compte Stripe', desc: 'Renseignez vos informations bancaires de façon sécurisée.' },
                { n: '02', title: 'Vérification d\'identité', desc: 'Stripe vérifie votre identité pour respecter les obligations légales.' },
                { n: '03', title: 'Recevez vos paiements', desc: 'Les virements sont effectués sous 2–3 jours ouvrés après chaque vente confirmée.' },
              ].map(item => (
                <div key={item.n} className="flex items-start gap-4">
                  <span
                    className="font-mono text-xs font-bold flex-shrink-0 mt-0.5"
                    style={{ color: 'var(--acid)', width: 24 }}
                  >
                    {item.n}
                  </span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{item.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--concrete-3)' }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Commission notice */}
            <div
              className="rounded-xl px-4 py-3 flex items-center gap-3"
              style={{ background: 'var(--paper-2)' }}
            >
              <span className="font-mono text-sm font-bold" style={{ color: 'var(--ink)' }}>10%</span>
              <p className="text-xs" style={{ color: 'var(--concrete-4)' }}>
                Commission FlipIt prélevée sur chaque vente confirmée. Aucun abonnement.
              </p>
            </div>

            {/* CTA */}
            <button
              onClick={startOnboarding}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold cursor-pointer hover:opacity-90 transition-opacity"
              style={{ background: 'var(--ink)', color: 'var(--paper)' }}
            >
              <ExternalLink className="h-4 w-4" />
              {step === 'refresh' ? 'Compléter sur Stripe' : 'Commencer l\'inscription Stripe'}
              <ArrowRight className="h-4 w-4" />
            </button>

            <p className="text-center text-xs" style={{ color: 'var(--concrete-3)' }}>
              Vos coordonnées bancaires sont gérées exclusivement par Stripe et ne nous sont jamais transmises.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default function SellerOnboardingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-6 w-6 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
      </div>
    }>
      <SellerOnboardingContent />
    </Suspense>
  )
}
