"use client"; // Ajoutez ceci pour rendre le composant un Client Component

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation'; // Remplacez l'importation ici
import PaymentForm from '@/components/payment-form';

const CheckoutPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams(); // Utiliser useSearchParams pour obtenir les paramètres de l'URL
  const amount = searchParams.get('amount');
  const currency = searchParams.get('currency');

  return (
    <div className="flex items-center justify-center min-h-screen container mx-auto p-4">
      {amount && currency ? (
        <PaymentForm amount={Number(amount)} currency={currency} />
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default CheckoutPage;
