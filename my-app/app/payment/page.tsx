"use client";

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PaymentForm from '@/components/payment/payment-form';
import ShippingForm from '@/components/payment/Delivery-form'; // Importer le composant

const CheckoutPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const amount = searchParams.get('amount');
  const currency = searchParams.get('currency');

  return (
    <div className="flex items-start justify-center min-h-screen container mx-auto p-4 space-x-8 mt-20"> {/* Ajout de mt-8 ici */}
      <div className="w-1/2">
        {/* Formulaire de livraison */}
        <ShippingForm />
      </div>
      <div className="w-1/2">
        {/* Formulaire de paiement */}
        {amount && currency ? (
          <PaymentForm amount={Number(amount)} currency={currency} />
        ) : (
          <p>Loading...</p>
        )}
      </div>
    </div>
  );
};

export default CheckoutPage;
