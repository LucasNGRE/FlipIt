"use client";
import { Suspense, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

const Login = () => {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Remplis tous les champs'); return; }
    setLoading(true);
    const response: any = await signIn('credentials', { redirect: false, email, password, callbackUrl });
    setLoading(false);
    if (response?.error) {
      toast.error('Email ou mot de passe incorrect');
    } else if (response?.url) {
      window.location.replace(response.url);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    await signIn('google', { callbackUrl });
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

        <div className="rounded-xl border border-border bg-card p-8 space-y-5">

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-border py-2.5 text-sm font-semibold hover:bg-muted transition-colors cursor-pointer disabled:opacity-60"
          >
            {googleLoading
              ? <span className="h-4 w-4 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
              : <GoogleIcon />
            }
            Continuer avec Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-mono">ou</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Credentials form */}
          <form onSubmit={handleCredentials} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                autoFocus
                placeholder="exemple@gmail.com"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">Mot de passe</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  placeholder="••••••••••••"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="bg-background pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label={showPass ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold tracking-wide disabled:opacity-60 transition-opacity cursor-pointer"
              style={{ background: 'var(--acid)', color: 'var(--ink)' }}
            >
              {loading
                ? <span className="h-4 w-4 rounded-full border-2 border-ink/20 border-t-ink animate-spin" />
                : <>Se connecter <ArrowRight className="h-4 w-4" /></>
              }
            </button>
          </form>
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
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
      </div>
    }>
      <Login />
    </Suspense>
  );
}
