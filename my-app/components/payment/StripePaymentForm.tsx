'use client'

import { useState } from 'react'
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Lock } from 'lucide-react'

interface Props {
  onSuccess: () => void
}

export default function StripePaymentForm({ onSuccess }: Props) {
  const stripe = useStripe()
  const elements = useElements()
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setPaying(true)
    setError(null)

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/thank-you`,
      },
      redirect: 'if_required',
    })

    if (stripeError) {
      setError(stripeError.message ?? 'Erreur de paiement')
      setPaying(false)
      return
    }

    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement options={{ layout: 'tabs' }} />

      {error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2.5">{error}</p>
      )}

      <button
        type="submit"
        disabled={!stripe || paying}
        className="w-full rounded-xl py-4 text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer"
        style={{ background: 'var(--acid)', color: 'var(--ink)' }}
      >
        {paying ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            Traitement…
          </span>
        ) : (
          <>
            <Lock className="h-4 w-4" />
            Payer maintenant
          </>
        )}
      </button>

      <p className="text-center text-xs text-muted-foreground">
        Paiement sécurisé par Stripe · Vos données bancaires ne nous sont jamais transmises
      </p>
    </form>
  )
}
