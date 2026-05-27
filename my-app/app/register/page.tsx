"use client";
import { Suspense } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { register } from "../action/user";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

interface RegisterResponse {
  success: boolean;
  message?: string;
  emailExists?: boolean;
}

const Register = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    firstname: "",
    lastname: "",
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("username",  formData.username);
      fd.append("firstname", formData.firstname);
      fd.append("lastname",  formData.lastname);
      fd.append("email",     formData.email);
      fd.append("password",  formData.password);
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

        {/* Form card */}
        <form onSubmit={handleRegister} className="rounded-xl border border-border bg-card p-8 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstname" className="text-sm font-medium">Prénom</Label>
              <Input id="firstname" placeholder="Tyler" type="text" name="firstname"
                onChange={handleChange} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastname" className="text-sm font-medium">Nom</Label>
              <Input id="lastname" placeholder="Durden" type="text" name="lastname"
                onChange={handleChange} className="bg-background" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
            <Input id="email" placeholder="exemple@gmail.com" type="email" name="email"
              onChange={handleChange} className="bg-background" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium">Mot de passe</Label>
            <Input id="password" placeholder="••••••••••••" type="password" name="password"
              onChange={handleChange} className="bg-background" />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold tracking-wide disabled:opacity-60 transition-opacity cursor-pointer mt-2"
            style={{ background: 'var(--acid)', color: 'var(--ink)' }}
          >
            {loading ? 'Création…' : <>Créer mon compte <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Déjà un compte ?{' '}
          <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="font-semibold text-foreground underline underline-offset-2 hover:opacity-70">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
};

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="h-6 w-6 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" /></div>}>
      <Register />
    </Suspense>
  );
}
