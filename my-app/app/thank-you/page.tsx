'use client'
import React, {useRef} from 'react'
import Confetti from '@/components/ui/confetti'

const ThankYouPage = () => {
  const confettiRef = useRef<{ fire: (options: any) => void } | null>(null);
  return (
    <div className="flex items-center justify-center h-screen">
      <Confetti
        ref={confettiRef}
        className="absolute left-0 top-0 z-0 size-full"
        onMouseEnter={() => {
          confettiRef.current?.fire({});
        }}
      />
      <h1 className="text-2xl font-bold">Merci pour votre achat !</h1>
    </div>
  )
}

export default ThankYouPage
