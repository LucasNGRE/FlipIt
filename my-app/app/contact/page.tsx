import type { Metadata } from "next";
import { Mail, MessageCircle, GitBranch } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact | FlipIt",
  description: "Contacte l'équipe FlipIt.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16">

      <div className="mb-12 text-center">
        <span className="inline-block mb-4 rounded-full bg-brand-50 border border-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brand dark:bg-brand-800/20 dark:border-brand-800/40">
          Support
        </span>
        <h1 className="font-display text-4xl font-bold tracking-tight mb-4">
          On est là pour toi
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          Un problème avec une transaction, une question sur ton compte, ou juste envie de nous faire un retour ? Écris-nous.
        </p>
      </div>

      <div className="space-y-4 mb-12">
        <a
          href="mailto:lucas12negre@gmail.com"
          className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 hover:border-brand transition-colors duration-200 group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-800/20 flex-shrink-0">
            <Mail className="h-5 w-5 text-brand" />
          </div>
          <div>
            <p className="font-semibold group-hover:text-brand transition-colors duration-150">Email</p>
            <p className="text-sm text-muted-foreground">lucas12negre@gmail.com</p>
          </div>
        </a>

        <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-800/20 flex-shrink-0">
            <MessageCircle className="h-5 w-5 text-brand" />
          </div>
          <div>
            <p className="font-semibold">Messagerie interne</p>
            <p className="text-sm text-muted-foreground">Pour tout litige entre acheteur et vendeur, utilise la messagerie intégrée à la plateforme.</p>
          </div>
        </div>

        <a
          href="https://github.com/LucasNGRE/FlipIt"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 hover:border-brand transition-colors duration-200 group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-800/20 flex-shrink-0">
            <GitBranch className="h-5 w-5 text-brand" />
          </div>
          <div>
            <p className="font-semibold group-hover:text-brand transition-colors duration-150">GitHub</p>
            <p className="text-sm text-muted-foreground">Le projet est open-source. Tu peux signaler un bug ou proposer une amélioration.</p>
          </div>
        </a>
      </div>

      <div className="rounded-2xl bg-muted/50 border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">
          On répond généralement sous <span className="font-semibold text-foreground">24-48h</span>. Pour les urgences, envoie un email directement.
        </p>
      </div>
    </div>
  );
}
