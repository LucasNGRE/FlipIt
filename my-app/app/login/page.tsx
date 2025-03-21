"use client";
import { Suspense } from 'react';  // Importer Suspense de React
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const Login = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/'; // Get callback URL from search params

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const credentialsAction = async () => {
    const response: any = await signIn("credentials", {
      redirect: false,
      email,
      password,
      callbackUrl, // Use the callback URL here
    });

    if (!response.error) {
      // Redirect to the callback URL if login is successful
      window.location.replace(callbackUrl); 
    } else {
      toast.error("Ton mot de passe ou ton email est incorrecte");
    }
  };

  return (
    <div className="mt-10 max-w-md w-full mx-auto rounded-none md:rounded-2xl p-4 md:p-8 shadow-input bg-white border border-[#121212] dark:bg-black">
      <div className="my-8">
        <Label htmlFor="email">Adresse Email</Label>
        <Input
          id="email"
          placeholder="exemple@gmail.com"
          type="email"
          name="email"
          onChange={(e: any) => setEmail(e.target.value)}
        />

        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          placeholder="*************"
          type="password"
          name="password"
          className="mb-6"
          onChange={(e: any) => setPassword(e.target.value)}
        />
        <div className="bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-700 to-transparent my-8 h-[1px] w-full" />
        <div className="flex justify-between items-center">
          <Link href="/" passHref>
            <Button type="button" variant="outline" className="w-24">
              Retour
            </Button>
          </Link>
          <Button className="w-36" onClick={credentialsAction}>
            Se connecter &rarr;
          </Button>
        </div>
        <p className="text-right text-neutral-600 text-sm max-w-sm mt-4 dark:text-neutral-300">
          Vous ne possédez pas de compte ?{' '}
          <Link href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-blue-500">
            S&apos;enregistrer
          </Link>
        </p>
      </div>
    </div>
  );
};

// Enveloppez le composant Login dans Suspense pour résoudre l'erreur
export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Login />
    </Suspense>
  );
}
