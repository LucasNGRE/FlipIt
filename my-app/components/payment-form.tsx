'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { LockIcon, EyeIcon, EyeOffIcon } from 'lucide-react'

interface PaymentFormProps {
  amount?: number
  currency?: string
}

export default function PaymentForm({ amount = 50, currency = 'EUR' }: PaymentFormProps) {
  const [cardNumber, setCardNumber] = useState<string>('')
  const [expiryDate, setExpiryDate] = useState<string>('')
  const [cvv, setCvv] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [showCvv, setShowCvv] = useState<boolean>(false)
  const router = useRouter()

  const validateCardNumber = (number: string): boolean => {
    return /^\d{4} \d{4} \d{4} \d{4}$/.test(number);
  }

  const validateExpiryDate = (date: string): boolean => {
    return /^(0[1-9]|1[0-2])\/\d{2}$/.test(date);
  }

  const validateCvv = (cvv: string): boolean => {
    return /^\d{3}$/.test(cvv);
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!validateCardNumber(cardNumber)) {
      setError('Numéro de carte invalide. Doit contenir 16 chiffres.')
      return;
    }

    if (!validateExpiryDate(expiryDate)) {
      setError('Date d\'expiration invalide. Utilisez le format MM/YY.')
      return;
    }

    if (!validateCvv(cvv)) {
      setError('CVV invalide. Doit contenir 3 chiffres.')
      return;
    }

    setError('')
    console.log('Traitement du paiement...')

    // Rediriger vers une page fictive de remerciement
    router.push('/thank-you')

    // Optionnel : redirection vers la page d'accueil après un court délai
    setTimeout(() => {
      router.push('/')
    }, 3000)
  }

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/[^0-9]/g, '');
    let formattedInput = '';

    for (let i = 0; i < input.length; i += 4) {
      formattedInput += input.substring(i, i + 4) + ' ';
    }

    setCardNumber(formattedInput.trim());
  }

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const input = e.target.value.replace(/[^0-9]/g, '');
  let formattedInput = input;

  if (input.length >= 4) {
    formattedInput = `${input.slice(0, 2)}/${input.slice(2, 4)}`;
  } else if (input.length >= 2) {
    formattedInput = `${input.slice(0, 2)}/${input.slice(2, 4)}`;
  }

  setExpiryDate(formattedInput);
}

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Paiement</CardTitle>
        <CardDescription>Entre ta carte pour finaliser ton achat</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Numéro de carte</Label>
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={handleCardNumberChange}
                required
                maxLength={19}
                type="text"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiryDate">Date d&apos;expiration</Label>
                <Input
                  id="expiryDate"
                  placeholder="MM/YY"
                  value={expiryDate}
                  onChange={handleExpiryChange}
                  required
                  maxLength={5}
                  type="text"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvv">CVV</Label>
                <div className="relative">
                  <Input
                    id="cvv"
                    placeholder="123"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/[^0-9]/g, ''))}
                    required
                    maxLength={3}
                    type={showCvv ? 'text' : 'password'}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                    onClick={() => setShowCvv(!showCvv)}
                  >
                    {showCvv ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>
            {error && <p className="text-red-500">{error}</p>}
          </div>
          <CardFooter className="flex flex-col items-stretch">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-semibold">Total:</span>
              <span className="text-lg font-bold">{amount} {currency}</span>
            </div>
            <Button className="w-full" type="submit">
              <LockIcon className="mr-2 h-4 w-4" /> Paiement sécurisée
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  )
}
