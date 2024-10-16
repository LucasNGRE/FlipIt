"use client";

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PaymentForm from '@/components/payment/payment-form';
import ShippingForm from '@/components/payment/Delivery-form';

const CheckoutPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const amount = searchParams.get('amount');
  const currency = searchParams.get('currency');
  const productId = searchParams.get('productId');

  // État pour gérer la soumission du formulaire de livraison
  const [shippingData, setShippingData] = useState(null);
  const [isShippingSubmitted, setIsShippingSubmitted] = useState(false);

  // Fonction de soumission pour le formulaire de livraison
  const handleShippingSubmit = (values: any) => {
    console.log('Shipping Information:', values);
    setShippingData(values); // Enregistre les données de livraison
    setIsShippingSubmitted(true); // Passe à l'étape de paiement
  };

  return (
    <div className="flex items-center justify-center min-h-screen container mx-auto">
      <div className="flex flex-col space-y-8">
        <div className="w-full max-w-md"> {/* Max width for ShippingForm */}
          {/* Formulaire de livraison */}
          {!isShippingSubmitted ? (
            <ShippingForm onSubmit={handleShippingSubmit} /> // Passer la fonction de soumission
          ) : (
            <p>Livraison enregistrée ! Vous pouvez passer au paiement.</p>
          )}
        </div>
        <div className="w-full max-w-md"> {/* Max width for PaymentForm */}
          {/* Formulaire de paiement */}
          {isShippingSubmitted && amount && currency ? (
            <PaymentForm amount={Number(amount)} currency={currency} productId={productId ? Number(productId) : 0} />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
