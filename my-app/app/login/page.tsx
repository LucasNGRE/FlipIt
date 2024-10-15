"use client";
import { login } from '../action/user';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IconBrandGoogle } from '@tabler/icons-react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import React from 'react';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { sign } from 'crypto';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';


export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const credentialsAction = async () => {
    const response: any = await signIn("credentials", {
      redirect: false,
      email,
      password,
      callbackUrl: "/",
      
    });

    if (!response.error) {
      return window.location.replace(callbackUrl) // if login successful
    }

    toast.error("Ton mot de passe ou ton email est incorrecte");
  }

  return (
    <div className="mt-10 max-w-md w-full mx-auto rounded-none md:rounded-2xl p-4 md:p-8 shadow-input bg-white border border-[#121212] dark:bg-black">
      <div className="my-8">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          placeholder="exemple@gmail.com"
          type="email"
          name="email"
          onChange={(e: any) => setEmail(e.target.value)}
        />

        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          placeholder="*************"
          type="password"
          name="password"
          className="mb-6"
          onChange={(e: any) => setPassword(e.target.value)}
        />

        <div className="flex justify-between items-center">
          <Link href="/" passHref>
            <Button type="button" variant="outline" className="w-24">
              Back
            </Button>
          </Link>
          <Button className="w-24" onClick={credentialsAction}>
            Login &rarr;
          </Button>
        </div>

        <p className="text-right text-neutral-600 text-sm max-w-sm mt-4 dark:text-neutral-300">
          Do not have an account? <Link href="/register" className="text-blue-500">Register</Link>
        </p>

        <div className="bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-700 to-transparent my-8 h-[1px] w-full" />
      </div>
    </div>
  );
};
