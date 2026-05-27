"use client";
import { Suspense } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';

const Login = () => {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const credentialsAction = async () => {
    setLoading(true);
    const response: any = await signIn("credentials", {
      redirect: false,
      email,
      password,
      callbackUrl,
    });
    setLoading(false);

    if (response?.error) {
      console.error("Authentication error:", response.error);
      toast.error("Email ou mot de passe incorrect");
    } else if (response?.url) {
      window.location.replace(response.url);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        {/* Wordmark */}
        <div className="mb-10 text-center">
          <Link href="/" className="inline-block mb-4">
            <span className="font-logo text-3xl font-black uppercase tracking-tighter select-none">
              FLIP<span className="animate-flip-i">I</span>
              <span className="inline-flex items-center justify-center rounded-[3px] px-[3px]"
                style={{ background: 'var(--acid)', color: 'var(--ink)' }}>T</span>
            </span>
          </Link>
          <p className="text-sm text-muted-foreground">Connecte-toi à ton compte</p>
        </div>

        {/* Form card */}
        <div className="rounded-xl border border-border bg-card p-8 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
            <Input
              id="email"
              placeholder="exemple@gmail.com"
              type="email"
              name="email"
              onChange={(e: any) => setEmail(e.target.value)}
              className="bg-background"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium">Mot de passe</Label>
            <Input
              id="password"
              placeholder="••••••••••••"
              type="password"
              name="password"
              onChange={(e: any) => setPassword(e.target.value)}
              className="bg-background"
            />
          </div>

          <button
            onClick={credentialsAction}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold tracking-wide disabled:opacity-60 transition-opacity cursor-pointer"
            style={{ background: 'var(--acid)', color: 'var(--ink)' }}
          >
            {loading ? 'Connexion…' : <>Se connecter <ArrowRight className="h-4 w-4" /></>}
          </button>
        </div>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Pas encore de compte ?{' '}
          <Link href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="font-semibold text-foreground underline underline-offset-2 hover:opacity-70">
            S&apos;inscrire
          </Link>
        </p>
      </div>
    </div>
  );
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="h-6 w-6 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" /></div>}>
      <Login />
    </Suspense>
  );
}
