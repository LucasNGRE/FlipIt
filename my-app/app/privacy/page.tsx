import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité | FlipIt",
  description: "Comment FlipIt collecte, utilise et protège tes données personnelles.",
};

const sections = [
  {
    title: "1. Qui sommes-nous ?",
    content: `FlipIt est une marketplace de matériel de skate d'occasion, accessible à l'adresse flip-it-iota.vercel.app. Le responsable du traitement des données est l'équipe FlipIt, joignable à lucas12negre@gmail.com.`,
  },
  {
    title: "2. Données collectées",
    content: `Lors de ton inscription et de l'utilisation de FlipIt, nous collectons les données suivantes :
- Informations de compte : prénom, nom, adresse e-mail, photo de profil (si connexion Google).
- Annonces : photos, descriptions, prix et caractéristiques des articles publiés.
- Messages : conversations échangées via la messagerie interne entre acheteurs et vendeurs.
- Données de transaction : montant, identifiant de l'article concerné, date.
- Données techniques : adresse IP, type de navigateur, pages visitées (logs serveur).`,
  },
  {
    title: "3. Pourquoi on utilise tes données",
    content: `Tes données sont utilisées pour :
- Créer et gérer ton compte sur la plateforme.
- Afficher et gérer tes annonces.
- Permettre la communication entre acheteurs et vendeurs.
- Traiter les transactions de manière sécurisée.
- Améliorer nos services et corriger les bugs.
- T'envoyer des notifications liées à ton activité sur FlipIt (pas de spam commercial).`,
  },
  {
    title: "4. Base légale du traitement",
    content: `Le traitement de tes données repose sur :
- L'exécution du contrat (CGU) lorsque tu crées un compte ou publies une annonce.
- Notre intérêt légitime pour améliorer et sécuriser la plateforme.
- Ton consentement pour les communications optionnelles.`,
  },
  {
    title: "5. Partage des données",
    content: `Nous ne vendons pas tes données. Elles peuvent être partagées avec :
- Nos prestataires techniques (hébergement Vercel, base de données Neon, paiement Stripe) dans le cadre strict de leurs missions.
- Les autorités compétentes si la loi l'exige.

Les vendeurs voient uniquement le prénom et la photo de profil des acheteurs qui les contactent.`,
  },
  {
    title: "6. Durée de conservation",
    content: `- Données de compte : conservées tant que ton compte est actif. Supprimées dans les 30 jours suivant la suppression du compte.
- Annonces : conservées jusqu'à suppression manuelle ou 12 mois après la dernière mise à jour.
- Messages : conservés 12 mois après la fin de la transaction associée.
- Données de transaction : conservées 5 ans pour obligations comptables et légales.`,
  },
  {
    title: "7. Tes droits",
    content: `Conformément au RGPD, tu disposes des droits suivants :
- Droit d'accès : obtenir une copie de tes données.
- Droit de rectification : corriger des données inexactes.
- Droit à l'effacement : demander la suppression de tes données.
- Droit à la portabilité : recevoir tes données dans un format structuré.
- Droit d'opposition : t'opposer à certains traitements.

Pour exercer ces droits, contacte-nous à lucas12negre@gmail.com. Nous répondons sous 30 jours.`,
  },
  {
    title: "8. Cookies",
    content: `FlipIt utilise uniquement les cookies strictement nécessaires au fonctionnement de la plateforme (session d'authentification). Aucun cookie publicitaire ou de tracking tiers n'est utilisé.`,
  },
  {
    title: "9. Sécurité",
    content: `Nous mettons en œuvre des mesures techniques adaptées : connexions chiffrées (HTTPS), stockage des mots de passe hashés (bcrypt), accès aux données restreint au personnel autorisé. Aucun système n'est infaillible — en cas de violation de données, nous t'informerons dans les délais légaux.`,
  },
  {
    title: "10. Modifications",
    content: `Cette politique peut être mise à jour. En cas de changement significatif, nous t'en informons par e-mail ou via une notification sur la plateforme. La date de dernière mise à jour est indiquée ci-dessous.`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">

      <div className="mb-12 text-center">
        <span className="inline-block mb-4 rounded-full bg-brand-50 border border-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brand dark:bg-brand-800/20 dark:border-brand-800/40">
          Légal
        </span>
        <h1 className="font-display text-4xl font-bold tracking-tight mb-4">
          Politique de confidentialité
        </h1>
        <p className="text-muted-foreground">
          Dernière mise à jour : avril 2025
        </p>
      </div>

      <div className="space-y-8">
        {sections.map((section) => (
          <div key={section.title} className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold mb-3">{section.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {section.content}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-2xl bg-muted/50 border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Des questions sur tes données ?{" "}
          <a href="mailto:lucas12negre@gmail.com" className="font-semibold text-brand hover:underline">
            Contacte-nous
          </a>
        </p>
      </div>
    </div>
  );
}
