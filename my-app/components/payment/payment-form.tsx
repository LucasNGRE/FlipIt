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
  productId: number
}

export default function PaymentForm({ amount = 50, currency = 'EUR', productId = 0 }: PaymentFormProps) {
  const [cardNumber, setCardNumber] = useState<string>('')
  const [expiryDate, setExpiryDate] = useState<string>('')
  const [cvv, setCvv] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [showCvv, setShowCvv] = useState<boolean>(false)
  const router = useRouter()

  if (productId <= 0) {
    console.error('ID du produit invalide:', productId);
    return <div>Erreur: ID du produit invalide.</div>;
  }

  const validateCardNumber = (number: string): boolean => {
    return /^\d{4} \d{4} \d{4} \d{4}$/.test(number)
  }

  const validateExpiryDate = (date: string): boolean => {
    return /^(0[1-9]|1[0-2])\/\d{2}$/.test(date)
  }

  const validateCvv = (cvv: string): boolean => {
    return /^\d{3}$/.test(cvv)
  }

  // const handleDeleteProduct = async (productId: number) => {
  //   // Vérification de l'ID du produit
  //   if (!productId || isNaN(productId)) {
  //     console.error('ID du produit invalide:', productId);
  //     return;
  //   }
    
  //   try {
  //     // Suppression fictive du produit via une API
  //     const response = await fetch(`/api/items/${productId}`, {
  //       method: 'DELETE',
  //     });
  
  //     console.log('Réponse de l\'API:', response); // Log de la réponse de l'API
  
  //     if (!response.ok) {
  //       const errorData = await response.json(); // Récupérer le message d'erreur
  //       console.error('Erreur lors de la suppression du produit:', errorData); // Log des erreurs
  //       throw new Error('Erreur lors de la suppression du produit.');
  //     }
      
  //     const data = await response.json(); // Récupération des données de la réponse
  //     console.log('Données de la réponse:', data); // Log des données retournées par l'API
  //     console.log('Produit supprimé avec succès.');
  //   } catch (error) {
  //     console.error('Erreur capturée:', error);
  //   }
  // };
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!validateCardNumber(cardNumber)) {
      setError('Numéro de carte invalide. Doit contenir 16 chiffres.')
      return
    }

    if (!validateExpiryDate(expiryDate)) {
      setError('Date d\'expiration invalide. Utilisez le format MM/YY.')
      return
    }

    if (!validateCvv(cvv)) {
      setError('CVV invalide. Doit contenir 3 chiffres.')
      return
    }

    setError('')
    console.log('Traitement du paiement...')

    // // Simulation d'un paiement réussi et suppression du produit
    // await handleDeleteProduct(productId)

    // Redirection vers une page de remerciement
    router.push('/thank-you')

    // Optionnel : redirection vers la page d'accueil après un court délai
    setTimeout(() => {
      router.push('/')
    }, 3000)
  }

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/[^0-9]/g, '').substring(0, 16)
    const formattedInput = input.match(/.{1,4}/g)?.join(' ') || ''
    setCardNumber(formattedInput)
  }

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/[^0-9]/g, '')
    const formattedInput = input.length > 2 ? `${input.slice(0, 2)}/${input.slice(2, 4)}` : input
    setExpiryDate(formattedInput)
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
              <LockIcon className="mr-2 h-4 w-4" /> Paiement sécurisé
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  )
}
