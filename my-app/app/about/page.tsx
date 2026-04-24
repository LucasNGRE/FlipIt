import type { Metadata } from "next";
import { Shield, Users, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "À propos | FlipIt",
  description: "FlipIt, la marketplace du skate d'occasion entre passionnés.",
};

const values = [
  {
    icon: Users,
    title: "Communauté avant tout",
    description: "FlipIt est né entre skateurs. On sait ce que c'est de chercher un bon deck à prix abordable ou de vouloir revendre du matos qui prend la poussière.",
  },
  {
    icon: Shield,
    title: "Transactions sécurisées",
    description: "Chaque échange passe par la plateforme. Pas de paiement en dehors, pas de risque. On protège acheteurs et vendeurs à chaque transaction.",
  },
  {
    icon: Zap,
    title: "Simple et rapide",
    description: "Déposer une annonce prend moins de 2 minutes. Trouver la pièce qu'il te manque, encore moins. On a conçu FlipIt pour que ça aille vite.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">

      {/* Hero */}
      <div className="mb-20 text-center">
        <span className="inline-block mb-4 rounded-full bg-brand-50 border border-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brand dark:bg-brand-800/20 dark:border-brand-800/40">
          Notre histoire
        </span>
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-6">
          La marketplace du skate<br />
          <span className="text-brand">entre passionnés</span>
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
          FlipIt c'est Vinted, mais pour le skate. On a créé cet espace pour que les skateurs puissent acheter, vendre et échanger du matos d'occasion facilement, sans intermédiaire et sans prise de tête.
        </p>
      </div>

      {/* Valeurs */}
      <div className="grid sm:grid-cols-3 gap-8 mb-20">
        {values.map(({ icon: Icon, title, description }) => (
          <div key={title} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-800/20">
              <Icon className="h-5 w-5 text-brand" />
            </div>
            <h2 className="font-display text-lg font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          </div>
        ))}
      </div>

      {/* Story */}
      <div className="rounded-2xl border border-border bg-card p-8 sm:p-12">
        <h2 className="font-display text-2xl font-bold mb-4">Pourquoi FlipIt ?</h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Trop de matériel de skate finit dans un coin d'un garage alors qu'il pourrait rouler. Une planche en bon état, des trucks qui ont encore de la vie, des chaussures portées deux fois — autant de pièces qui méritent une seconde chance.
          </p>
          <p>
            FlipIt permet à celui qui veut vider sa cave de trouver rapidement un acheteur, et à celui qui débute de s'équiper sans se ruiner. Tout le monde y gagne.
          </p>
          <p className="font-medium text-foreground">
            On est deux skateurs qui ont codé ça parce qu'on en avait besoin. Si toi aussi, bienvenue.
          </p>
        </div>
      </div>
    </div>
  );
}
