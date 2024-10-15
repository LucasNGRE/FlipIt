"use client";

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PaymentForm from '@/components/payment/payment-form';
// import ShippingForm from '@/components/payment/Delivery-form';

const CheckoutPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const amount = searchParams.get('amount');
  const currency = searchParams.get('currency');

  return (
    <div className="flex items-start justify-center min-h-screen container mx-auto p-4 space-x-8 mt-20">
      <div className="w-1/2">
      </div>
      <div className="w-1/2">
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
