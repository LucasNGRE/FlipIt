"use client";
import { Suspense, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { register } from "../action/user";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Eye, EyeOff, Check, X } from "lucide-react";

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

const PASSWORD_RULES = [
  { label: '8 caractères minimum', test: (p: string) => p.length >= 8 },
  { label: 'Une majuscule',        test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Un chiffre',           test: (p: string) => /\d/.test(p) },
];

interface RegisterResponse {
  success: boolean;
  message?: string;
  emailExists?: boolean;
}

const Register = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [formData, setFormData] = useState({ firstname: "", lastname: "", email: "", password: "" });
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const { firstname, lastname, email, password } = formData;
    if (!firstname || !lastname || !email || !password) {
      toast.error('Remplis tous les champs');
      return;
    }
    if (!PASSWORD_RULES.every(r => r.test(password))) {
      toast.error('Le mot de passe ne respecte pas les critères');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("username",    `${firstname.toLowerCase()}.${lastname.toLowerCase()}`);
      fd.append("firstname",   firstname);
      fd.append("lastname",    lastname);
      fd.append("email",       email);
      fd.append("password",    password);
      fd.append("callbackUrl", callbackUrl);

      const response: RegisterResponse = await register(fd);

      if (response?.success) {
        toast.success("Compte créé avec succès !");
        router.push(callbackUrl);
      } else if (response?.emailExists) {
        toast.error("Cet email est déjà utilisé.");
      } else {
        toast.error(response?.message || "Inscription échouée. Réessaie.");
      }
    } catch {
      toast.error("Une erreur est survenue lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    await signIn('google', { callbackUrl });
  };

  const passwordRulesVisible = passwordFocused && formData.password.length > 0;

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
          <p className="text-sm text-muted-foreground">Crée ton compte gratuitement</p>
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

          {/* Form */}
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstname" className="text-sm font-medium">Prénom</Label>
                <Input id="firstname" autoFocus placeholder="Tyler" type="text" name="firstname"
                  autoComplete="given-name" onChange={handleChange} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastname" className="text-sm font-medium">Nom</Label>
                <Input id="lastname" placeholder="Durden" type="text" name="lastname"
                  autoComplete="family-name" onChange={handleChange} className="bg-background" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input id="email" placeholder="exemple@gmail.com" type="email" name="email"
                autoComplete="email" onChange={handleChange} className="bg-background" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  placeholder="••••••••••••"
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  autoComplete="new-password"
                  onChange={handleChange}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
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

              {/* Password rules */}
              {passwordRulesVisible && (
                <div className="space-y-1 pt-1">
                  {PASSWORD_RULES.map(rule => {
                    const ok = rule.test(formData.password);
                    return (
                      <div key={rule.label} className="flex items-center gap-1.5 text-xs transition-colors"
                        style={{ color: ok ? '#16a34a' : 'var(--concrete-3)' }}>
                        {ok
                          ? <Check className="h-3 w-3 flex-shrink-0" />
                          : <X className="h-3 w-3 flex-shrink-0" />
                        }
                        {rule.label}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold tracking-wide disabled:opacity-60 transition-opacity cursor-pointer mt-2"
              style={{ background: 'var(--acid)', color: 'var(--ink)' }}
            >
              {loading
                ? <span className="h-4 w-4 rounded-full border-2 border-ink/20 border-t-ink animate-spin" />
                : <>Créer mon compte <ArrowRight className="h-4 w-4" /></>
              }
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Déjà un compte ?{' '}
          <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="font-semibold text-foreground underline underline-offset-2 hover:opacity-70">
            Se connecter
          </Link>
        </p>

        <p className="mt-4 text-center text-xs text-muted-foreground px-4">
          En créant un compte, tu acceptes nos{' '}
          <Link href="/privacy" className="underline underline-offset-2 hover:opacity-70">conditions d&apos;utilisation</Link>.
        </p>
      </div>
    </div>
  );
};

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
      </div>
    }>
      <Register />
    </Suspense>
  );
}
