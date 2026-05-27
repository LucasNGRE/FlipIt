'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ShieldCheck, Truck, CreditCard, Check, X } from 'lucide-react'
import PortfolioModal from '@/components/PortfolioModal'
import Image from 'next/image'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import StripePaymentForm from '@/components/payment/StripePaymentForm'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface Product {
  id: number
  title: string
  price: string | number
  brand?: string
  images: { url: string; altText?: string | null }[]
  user?: { firstName: string; image?: string | null }
}

function CheckoutPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const productId = searchParams.get('productId')
  const offerId = searchParams.get('offerId')

  const [step, setStep] = useState<1 | 2>(1)
  const [product, setProduct] = useState<Product | null>(null)
  const [negotiatedPrice, setNegotiatedPrice] = useState<number | null>(null)
  const [offerInvalid, setOfferInvalid] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [intentLoading, setIntentLoading] = useState(false)

  const [shipping, setShipping] = useState({
    deliveryMode: 'standard',
    fullName: '', address: '', complement: '',
    postalCode: '', city: '', country: 'fr',
  })
  const [shippingErrors, setShippingErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!productId) return
    fetch(`/api/article/${productId}`)
      .then(r => r.ok ? r.json() : null)
      .then(setProduct)
  }, [productId])

  useEffect(() => {
    if (!offerId) return
    fetch(`/api/offer/${offerId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return
        if (d.status !== 'accepted') {
          setOfferInvalid(true)
        } else {
          setNegotiatedPrice(Number(d.offerPrice))
        }
      })
  }, [offerId])

  const basePrice = negotiatedPrice ?? (product ? Number(product.price) : 0)
  const deliveryCost = shipping.deliveryMode === 'express' ? 8 : 4
  const commission = Math.round(basePrice * 0.10 * 100) / 100
  const total = basePrice + deliveryCost + commission

  const validateShipping = () => {
    const e: Record<string, string> = {}
    if (!shipping.fullName.trim()) e.fullName = 'Nom requis'
    if (!shipping.address.trim()) e.address = 'Adresse requise'
    if (!/^\d{5}$/.test(shipping.postalCode)) e.postalCode = 'Code postal invalide (5 chiffres)'
    if (!shipping.city.trim()) e.city = 'Ville requise'
    setShippingErrors(e)
    return Object.keys(e).length === 0
  }

  const handleContinueToPayment = async () => {
    if (!validateShipping()) return
    if (!productId) return
    setIntentLoading(true)
    try {
      const res = await fetch('/api/stripe/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: Number(productId),
          offerId: offerId ? Number(offerId) : undefined,
          deliveryCost,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur')
      setClientSecret(data.clientSecret)
      setStep(2)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIntentLoading(false)
    }
  }

  const inp = (err?: string) =>
    `w-full rounded-xl border px-4 py-3 text-sm bg-white outline-none transition-colors focus:border-foreground placeholder:text-muted-foreground ${err ? 'border-red-400' : 'border-border'}`

  if (offerInvalid) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--paper)' }}>
        <div className="text-center max-w-sm">
          <div className="h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <X className="h-7 w-7 text-red-500" />
          </div>
          <p className="font-display font-bold text-lg mb-1">Offre expirée</p>
          <p className="text-sm text-muted-foreground mb-5">
            Cette offre n'est plus valide. Une nouvelle négociation a été entamée pour ce produit.
          </p>
          <button
            onClick={() => router.back()}
            className="rounded-xl px-6 py-3 text-sm font-bold cursor-pointer hover:opacity-90 transition-opacity"
            style={{ background: 'var(--ink)', color: 'var(--acid)' }}
          >
            Retour
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: 'var(--paper)' }}>
      <div className="mx-auto" style={{ maxWidth: 1080 }}>

        {/* Wordmark */}
        <div className="mb-6 text-center">
          <span className="font-logo text-3xl select-none" style={{ letterSpacing: '-.04em' }}>
            FL<span className="animate-flip-i inline-block">I</span>P
            <span style={{ background: 'var(--acid)', color: 'var(--ink)', padding: '0 .08em' }}>IT</span>
          </span>
          <p className="font-mono text-[10px] uppercase tracking-[.14em] mt-1.5" style={{ color: 'var(--concrete-4)' }}>
            Paiement sécurisé par Stripe
          </p>
        </div>

        <PortfolioModal alwaysShow />

        <div className="grid gap-8" style={{ gridTemplateColumns: '1fr 360px', alignItems: 'start' }}>

          {/* ── Gauche : stepper + formulaire ─────────────── */}
          <div>
            {/* Stepper */}
            <div className="flex items-center mb-8">
              {([{ n: 1, label: 'Livraison' }, { n: 2, label: 'Paiement' }] as const).map((s, i) => (
                <div key={s.n} className="flex items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{
                        background: step > s.n ? 'var(--acid)' : step === s.n ? 'var(--ink)' : 'var(--paper-2)',
                        color: step > s.n ? 'var(--ink)' : step === s.n ? 'var(--acid)' : 'var(--concrete-3)',
                        border: `2px solid ${step > s.n ? 'var(--acid)' : step === s.n ? 'var(--ink)' : 'var(--concrete-2)'}`,
                      }}
                    >
                      {step > s.n ? <Check className="h-4 w-4" /> : s.n}
                    </div>
                    <span className="text-sm font-semibold" style={{ color: step >= s.n ? 'var(--ink)' : 'var(--concrete-3)' }}>
                      {s.label}
                    </span>
                  </div>
                  {i === 0 && (
                    <div className="mx-4 h-px" style={{ width: 64, background: step > 1 ? 'var(--ink)' : 'var(--concrete-2)' }} />
                  )}
                </div>
              ))}
            </div>

            {/* ─ Step 1 : Livraison ─ */}
            {step === 1 && (
              <div className="rounded-2xl p-7" style={{ background: 'var(--snow)', border: '1px solid var(--ink)' }}>
                <h2 className="font-display font-bold mb-6" style={{ fontSize: 22, letterSpacing: '-.02em' }}>
                  Adresse de livraison
                </h2>

                <div className="mb-6">
                  <p className="font-mono text-[10px] uppercase tracking-[.12em] mb-3" style={{ color: 'var(--concrete-4)' }}>
                    Mode de livraison
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'standard', label: 'Standard', sub: '3–5 jours ouvrés', price: '4 €', Icon: Truck },
                      { id: 'express',  label: 'Express',  sub: '1–2 jours ouvrés', price: '8 €', Icon: CreditCard },
                    ].map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setShipping(s => ({ ...s, deliveryMode: m.id }))}
                        className="rounded-xl p-4 text-left transition-all cursor-pointer"
                        style={{
                          border: `2px solid ${shipping.deliveryMode === m.id ? 'var(--ink)' : 'var(--concrete-2)'}`,
                          background: shipping.deliveryMode === m.id ? 'var(--paper-2)' : 'white',
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-sm">{m.label}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--concrete-4)' }}>{m.sub}</p>
                          </div>
                          <span className="font-mono font-bold text-sm">{m.price}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'fullName',   label: 'Nom complet',            placeholder: 'Jean Dupont',       span: 1 },
                    { key: 'address',    label: 'Adresse',                placeholder: '12 rue de la Paix', span: 1 },
                    { key: 'complement', label: 'Complément (optionnel)', placeholder: 'Bât B, Apt 4',      span: 2, optional: true },
                    { key: 'postalCode', label: 'Code postal',            placeholder: '75001',             span: 1 },
                    { key: 'city',       label: 'Ville',                  placeholder: 'Paris',             span: 1 },
                  ].map(f => (
                    <div key={f.key} className={f.span === 2 ? 'col-span-2' : ''}>
                      <label className="font-mono text-[10px] uppercase tracking-[.12em] block mb-1.5" style={{ color: 'var(--concrete-4)' }}>
                        {f.label}
                      </label>
                      <input
                        className={inp(f.optional ? undefined : shippingErrors[f.key])}
                        placeholder={f.placeholder}
                        value={(shipping as any)[f.key]}
                        onChange={e => setShipping(s => ({ ...s, [f.key]: e.target.value }))}
                        maxLength={f.key === 'postalCode' ? 5 : undefined}
                      />
                      {!f.optional && shippingErrors[f.key] && (
                        <p className="text-red-500 text-xs mt-1">{shippingErrors[f.key]}</p>
                      )}
                    </div>
                  ))}
                  <div className="col-span-2">
                    <label className="font-mono text-[10px] uppercase tracking-[.12em] block mb-1.5" style={{ color: 'var(--concrete-4)' }}>
                      Pays
                    </label>
                    <select
                      className={inp()}
                      value={shipping.country}
                      onChange={e => setShipping(s => ({ ...s, country: e.target.value }))}
                    >
                      <option value="fr">France</option>
                      <option value="be">Belgique</option>
                      <option value="ch">Suisse</option>
                      <option value="lu">Luxembourg</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleContinueToPayment}
                  disabled={intentLoading}
                  className="mt-7 w-full rounded-xl py-4 text-sm font-bold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: 'var(--ink)', color: 'var(--acid)' }}
                >
                  {intentLoading ? (
                    <><span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" /> Préparation…</>
                  ) : 'Continuer vers le paiement →'}
                </button>
              </div>
            )}

            {/* ─ Step 2 : Paiement Stripe ─ */}
            {step === 2 && clientSecret && (
              <div className="rounded-2xl p-7" style={{ background: 'var(--snow)', border: '1px solid var(--ink)' }}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-display font-bold" style={{ fontSize: 22, letterSpacing: '-.02em' }}>
                    Informations de paiement
                  </h2>
                  <button
                    onClick={() => setStep(1)}
                    className="font-mono text-[11px] underline underline-offset-2 cursor-pointer"
                    style={{ color: 'var(--concrete-4)' }}
                  >
                    ← Modifier livraison
                  </button>
                </div>

                {/* Récap adresse */}
                <div
                  className="flex items-center gap-3 p-3.5 rounded-xl mb-6 text-sm"
                  style={{ background: 'var(--paper-2)', border: '1px solid var(--concrete-2)' }}
                >
                  <Truck className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--concrete-4)' }} />
                  <p>
                    <span className="font-semibold">{shipping.fullName}</span>
                    <span style={{ color: 'var(--concrete-4)' }}>
                      {' '}· {shipping.address}, {shipping.postalCode} {shipping.city}
                    </span>
                  </p>
                </div>

                {/* Stripe Elements */}
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: 'flat',
                      variables: {
                        colorPrimary: '#0a0a0a',
                        colorBackground: '#ffffff',
                        colorText: '#0a0a0a',
                        borderRadius: '12px',
                        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                      },
                    },
                  }}
                >
                  <StripePaymentForm onSuccess={() => router.push('/thank-you')} />
                </Elements>
              </div>
            )}
          </div>

          {/* ── Droite : récapitulatif ─────────────────────── */}
          <div className="rounded-2xl overflow-hidden sticky top-24" style={{ border: '1px solid var(--ink)' }}>
            {product?.images[0] ? (
              <div className="relative w-full" style={{ height: 200 }}>
                <Image src={product.images[0].url} alt={product.title} fill className="object-cover" />
              </div>
            ) : (
              <div
                className="w-full flex items-center justify-center font-mono text-xs uppercase tracking-widest"
                style={{ height: 160, background: 'var(--ink)', color: 'var(--acid)' }}
              >
                FlipIt
              </div>
            )}

            <div className="p-5" style={{ background: 'var(--snow)' }}>
              <div className="pb-4 mb-4" style={{ borderBottom: '1px solid var(--concrete-2)' }}>
                <p className="font-display font-bold" style={{ fontSize: 16, letterSpacing: '-.01em' }}>
                  {product?.title ?? '—'}
                </p>
                {product?.user && (
                  <p className="font-mono text-[11px] mt-0.5" style={{ color: 'var(--concrete-4)' }}>
                    Vendu par {product.user.firstName}
                  </p>
                )}
              </div>

              {negotiatedPrice !== null && (
                <div className="flex items-center gap-1.5 mb-3 px-2 py-1.5 rounded-lg text-[11px] font-mono font-bold" style={{ background: '#f0fdf4', color: '#15803d' }}>
                  <Check className="h-3 w-3" /> Prix négocié appliqué
                </div>
              )}

              <div className="space-y-2.5 text-sm">
                {([
                  ['Article', `${basePrice} €`, false],
                  [`Livraison ${shipping.deliveryMode === 'express' ? 'Express' : 'Standard'}`, `${deliveryCost} €`, false],
                  ['Commission FlipIt (10%)', `${commission.toFixed(2)} €`, true],
                ] as [string, string, boolean][]).map(([label, val, muted]) => (
                  <div key={label} className="flex justify-between">
                    <span style={{ color: muted ? 'var(--concrete-3)' : 'var(--concrete-4)' }}>{label}</span>
                    <span className="font-mono" style={{ color: muted ? 'var(--concrete-3)' : 'var(--ink)' }}>{val}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-baseline mt-4 pt-4" style={{ borderTop: '2px solid var(--ink)' }}>
                <span className="font-bold text-sm">Total</span>
                <span className="font-display font-extrabold" style={{ fontSize: 26, letterSpacing: '-.02em' }}>
                  {total} €
                </span>
              </div>

              <div
                className="flex items-start gap-2 mt-4 p-3 rounded-xl text-xs"
                style={{ background: 'var(--paper-2)', color: 'var(--concrete-4)' }}
              >
                <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: 'var(--acid-deep)' }} />
                Paiement 100% sécurisé. Le vendeur est payé uniquement après confirmation de réception.
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default function CheckoutPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--paper)' }}>
        <div className="h-8 w-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
      </div>
    }>
      <CheckoutPage />
    </Suspense>
  )
}
