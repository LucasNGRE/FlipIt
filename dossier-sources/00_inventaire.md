# 00 — Inventaire technique du projet

> Relevé effectué le **28 août 2026** sur la branche `tests/dossier-cda`,
> après la campagne de nettoyage du code mort (voir §9)
> (dernier commit de `main` : `0019db1`, 5 juin 2026).

## 1. Identification

| Élément | Valeur |
|---|---|
| Nom du projet | **FlipIt** |
| Nature | Marketplace de revente de matériel de skate entre particuliers |
| Statut | Projet portfolio / démonstration — paiements en **mode test Stripe**, aucune transaction réelle |
| Dépôt | `github.com/LucasNGRE/FlipIt` (branche par défaut `main`) |
| Racine applicative | `my-app/` (le dépôt contient l'application dans un sous-dossier) |
| Hébergement | Vercel (projet `my-app`) |
| Base de données | PostgreSQL sur Neon, région `eu-west-2` |

## 2. Environnement d'exécution

| Outil | Version relevée |
|---|---|
| Node.js | **v24.11.1** |
| npm | **11.6.2** |
| Système de développement | Windows 11 Home (10.0.26200) |
| Shell | PowerShell / Git Bash |

## 3. Arborescence (2–3 niveaux, hors `node_modules` et `.next`)

```
FlipIt/
├── dossier-sources/            # Sources rassemblées pour le dossier CDA
├── my-app/                     # Application Next.js
│   ├── app/                    # App Router
│   │   ├── layout.tsx          # Layout racine (Header, Footer, PortfolioModal, ThemeProvider)
│   │   ├── page.tsx            # Page d'accueil
│   │   ├── globals.css         # Design system (variables CSS custom)
│   │   ├── admin/              # Panel d'administration (11 pages)
│   │   ├── api/                # 47 routes API
│   │   │   ├── admin/          # 16 routes d'administration
│   │   │   ├── auth/           # NextAuth
│   │   │   ├── conversations/  # Messagerie
│   │   │   ├── cron/           # auto-confirm (cron Vercel)
│   │   │   ├── items/          # CRUD annonces
│   │   │   ├── offer/          # Négociation
│   │   │   ├── orders/         # Cycle de vie des commandes
│   │   │   ├── products/       # Catalogue public
│   │   │   ├── reports/        # Signalements
│   │   │   └── stripe/         # Paiement, webhook, Connect
│   │   ├── article/[id]/       # Détail d'une annonce
│   │   ├── profile/[id]/       # Profil public + seller-onboarding
│   │   ├── items/              # Mes annonces + add-item
│   │   ├── inbox/ orders/ payment/ likes/ settings/ thank-you/
│   │   ├── login/ register/
│   │   ├── about/ contact/ privacy/
│   │   └── action/user.ts      # Server action
│   ├── components/             # 38 composants React
│   │   ├── ui/                 # 20 composants shadcn/ui
│   │   ├── admin/              # AdminSidebar
│   │   ├── Articles/           # ArticleCard, ArticleGrid
│   │   ├── chat/               # ConversationList, MessageThread, offer-dialog
│   │   ├── items/              # add-item (formulaire multi-étapes)
│   │   ├── payment/            # StripePaymentForm, payment-form, Delivery-form
│   │   ├── settings/           # user_settings
│   │   └── Header, Footer, Banner, Marquee, PortfolioModal, ReportButton…
│   ├── lib/
│   │   ├── domain/             # Logique métier pure (extraite, testée) — offers, orders,
│   │   │                       #   products, pricing, access, session
│   │   ├── auth.ts             # Configuration NextAuth v5
│   │   ├── adminAuth.ts        # Vérification de session administrateur
│   │   ├── getSession.ts, db.ts, adminLog.ts, rateLimit.ts
│   │   ├── pusher-server.ts, pusher-client.ts, stripe.ts, utils.ts
│   ├── tests/                  # Suites Vitest (10 fichiers, 162 tests)
│   │   └── api/                # Tests de routes avec Prisma mocké
│   ├── scripts/captures.mjs    # Génération des captures d'écran (Playwright)
│   ├── prisma/
│   │   ├── schema.prisma       # 19 modèles, 6 énumérations
│   │   ├── schema.mmd          # Diagramme Mermaid
│   │   ├── seed.ts             # Jeu de données (écrites en dur)
│   │   └── migrations/         # 3 migrations (octobre 2024)
│   ├── ERD/diagram.svg         # Diagramme entité-association
│   ├── middleware.ts           # Protection des pages /admin/*
│   ├── vitest.config.ts        # Configuration des tests
│   ├── vercel.json             # Cron auto-confirm (08:00 UTC)
│   ├── next.config.mjs, tailwind.config.ts, tsconfig.json
│   ├── .env                    # Base de production (non versionné)
│   └── .env.local              # Base de développement (non versionné)
```

## 4. Métriques

| Indicateur | Valeur |
|---|---|
| Pages (`page.tsx`) | **29** (18 publiques + 11 admin) |
| Routes API (`route.ts`) | **47** (31 applicatives + 16 admin) |
| Composants React (`.tsx` dans `components/`) | **38** |
| Modèles Prisma | **19** |
| Énumérations Prisma | **6** |
| Fichiers de tests | **10** |
| Tests automatisés | **162** |
| Migrations Prisma | 1 (baseline `0_init` du 23/09/2026, 20 tables) |

### Volume de code (hors `node_modules`, `.next`, `.git`)

| Langage | Fichiers | Lignes |
|---|---:|---:|
| TypeScript React (`.tsx`) | 69 | 10 965 |
| TypeScript (`.ts`) | 79 | 4 996 |
| Prisma (`.prisma`) | 1 | 336 |
| CSS | 1 | 149 |
| JavaScript (`.mjs`) | 2 | 26 |
| **Total code applicatif** | **153** | **16 791** |
| JSON (configs + lockfile) | 7 | 11 929 |

> Comptage réalisé par parcours du système de fichiers (lignes brutes, commentaires
> et lignes vides inclus). `package-lock.json` représente l'essentiel du volume JSON.

## 5. Dépendances de production

| Paquet | Version | Rôle dans le projet |
|---|---|---|
| `next` | ^14.2.25 | Framework applicatif (App Router, routes API, SSR) |
| `react` / `react-dom` | ^18 | Bibliothèque d'interface |
| `typescript` | 5.6.3 | Typage statique (devDependency, mais central) |
| `@prisma/client` | ^5.20.0 | Client ORM généré, accès PostgreSQL |
| `next-auth` | ^5.0.0-beta.22 | Authentification (Credentials + Google OAuth), sessions JWT |
| `bcryptjs` | ^2.4.3 | Hachage et vérification des mots de passe |
| `stripe` | ^22.1.1 | SDK serveur Stripe (PaymentIntent, transferts, webhooks) |
| `@stripe/stripe-js` | ^9.7.0 | SDK navigateur Stripe |
| `@stripe/react-stripe-js` | ^6.4.0 | Composants React Stripe Elements |
| `pusher` | ^5.3.3 | Diffusion temps réel côté serveur |
| `pusher-js` | ^7.6.0 | Abonnement temps réel côté client |
| `zod` | ^3.23.8 | Schémas de validation — utilisé dans `components/payment/Delivery-form.tsx` uniquement |
| `react-hook-form` | ^7.53.0 | Gestion des formulaires (2 fichiers) |
| `@hookform/resolvers` | ^3.9.0 | Passerelle react-hook-form ↔ zod |
| `framer-motion` | ^11.11.9 | Animations — **plus aucun import** depuis la suppression de `app/landing-page/` |
| `next-themes` | ^0.3.0 | Bascule thème clair / sombre (3 fichiers) |
| `lucide-react` | ^0.438.0 | Jeu d'icônes principal |
| `@radix-ui/react-*` (17 paquets) | ^1.x – ^2.x | Primitives accessibles sous-jacentes à shadcn/ui |
| `class-variance-authority` | ^0.7.0 | Variantes de classes Tailwind |
| `clsx` + `tailwind-merge` | ^2.1.1 / ^2.5.2 | Composition de classes CSS (`cn()`) |
| `tailwindcss-animate` | ^1.0.7 | Animations Tailwind |
| `embla-carousel-react` | ^8.3.0 | Carrousel d'images (2 fichiers) |
| `canvas-confetti` | ^1.9.3 | Effet visuel de confirmation (1 fichier) |
| `sonner` | ^1.5.0 | Notifications toast (2 fichiers) |
| `react-intersection-observer` | ^9.13.1 | Détection de visibilité — **plus aucun import** depuis la suppression de `app/landing-page/` |
| `react-icons` | ^5.3.0 | Jeu d'icônes secondaire (8 fichiers) |

### Dépendances supprimées lors du nettoyage

Ces paquets étaient déclarés sans qu'aucun import ne les référence. Ils ont été
désinstallés (voir §9) :

| Paquet | Motif |
|---|---|
| `talkjs`, `@talkjs/react` | Messagerie tierce, remplacée par l'implémentation Pusher maison |
| `multer`, `formidable`, `next-connect` | Traitement d'upload de l'ère Pages Router ; l'App Router utilise `req.formData()` |
| `@tabler/icons-react` | Jeu d'icônes jamais employé |
| `@faker-js/faker` | Déclaré pour le seed, mais `prisma/seed.ts` utilise des données écrites en dur |
| `@auth/prisma-adapter` | Adaptateur inutile en stratégie JWT |
| `babel-eslint`, `@babel/eslint-parser`, `@babel/core`, `@babel/preset-react` | Aucune configuration Babel dans le projet ; `.eslintrc.json` n'étend que `next` et `next/core-web-vitals` |
| `@types/multer`, `@types/formidable`, `@types/uuid` | Types orphelins, leurs paquets respectifs n'étant plus (ou pas) installés |

`@types/canvas-confetti` a par ailleurs été déplacé de `dependencies` vers `devDependencies`.

### Dépendances devenues orphelines après le nettoyage

| Paquet | Situation |
|---|---|
| `framer-motion` | N'était importé que par `app/landing-page/page.tsx`, page supprimée |
| `react-intersection-observer` | Idem |

Elles sont **conservées pour l'instant** : leur suppression est une décision à prendre
séparément, ces deux bibliothèques pouvant resservir pour des animations.

## 6. Dépendances de développement

| Paquet | Version | Rôle |
|---|---|---|
| `vitest` | ^2.1.9 | Exécuteur de tests unitaires et de routes |
| `@vitest/coverage-v8` | ^2.1.9 | Mesure de couverture de code |
| `rollup` (alias `@rollup/wasm-node`) | ^4.63.1 | Build WASM de Rollup — contournement documenté en §7 |
| `prisma` | ^5.20.0 | CLI ORM (`generate`, `db push`, `migrate`) |
| `typescript` | 5.6.3 | Compilateur / vérificateur de types |
| `eslint` + `eslint-config-next` | ^8 / ^14.2.7 | Analyse statique |
| `tailwindcss`, `postcss`, `autoprefixer` | ^3.4.1 / ^8 / ^10.4.20 | Chaîne CSS |
| `ts-node` | ^10.9.2 | Exécution du script de seed |
| `@mermaid-js/mermaid-cli` | ^11.1.1 | Génération des diagrammes du schéma |
| `@types/*` | — | Définitions de types (node 20.17.6, react 18.3.12, bcryptjs, multer, formidable, uuid) |

## 7. Scripts npm

| Script | Commande | Usage |
|---|---|---|
| `dev` | `next dev` | Serveur de développement |
| `build` | `prisma generate && next build` | Build de production (exécuté aussi par Vercel) |
| `start` | `next start` | Serveur de production |
| `lint` | `next lint` | Analyse ESLint |
| `typecheck` | `tsc --noEmit` | Vérification de types (**ajouté pour ce dossier**) |
| `test` | `vitest run` | Suite de tests (**ajouté pour ce dossier**) |
| `test:watch` | `vitest` | Tests en mode surveillance |
| `test:coverage` | `vitest run --coverage` | Tests + couverture |

### Contrainte d'installation rencontrée (à mentionner dans le dossier)

L'installation de Vitest a échoué au premier lancement : le binaire natif
`@rollup/rollup-win32-x64-msvc/rollup.win32-x64-msvc.node` est **bloqué par la stratégie
de contrôle d'application de Windows 11** (`ERR_DLOPEN_FAILED` — « Une stratégie de contrôle
d'application a bloqué ce fichier »). La solution retenue est le build officiel WebAssembly
de Rollup, déclaré en alias dans `devDependencies` :

```json
"rollup": "npm:@rollup/wasm-node@^4.63.1"
```

Cette substitution n'affecte pas le build Next.js, qui n'utilise pas Rollup.

## 8. État de sécurité des dépendances (`npm audit`, 28/08/2026)

| Sévérité | Avant nettoyage | Après nettoyage |
|---|---:|---:|
| Critique | 6 | **5** |
| Haute | 25 | 25 |
| Modérée | 15 | 15 |
| Faible | 4 | **2** |
| **Total** | **50** | **47** |

La désinstallation des dépendances inutilisées a supprimé 3 vulnérabilités, dont une
critique (`@auth/prisma-adapter`, transitive de `@auth/core`).

Les vulnérabilités les plus significatives sont détaillées dans `03_securite.md`.
La seule touchant directement le périmètre de production est
`@auth/core` (critique — contournement par homoglyphe lors de la normalisation d'adresse e-mail),
transitive de `next-auth`.

## 9. Campagne de nettoyage du code mort (28/08/2026)

Chaque suppression a été précédée d'une recherche de références (imports, appels `fetch`,
liens `href`, mentions en configuration) dans `app/`, `components/`, `lib/`, `middleware.ts`
et les fichiers de configuration. Aucune référence active n'a été trouvée pour les éléments
listés ci-dessous.

### Routes API supprimées

| Fichier | Motif |
|---|---|
| `app/api/messages/route.ts` | **Faille active** : acceptait un `senderId` fourni par le client et créait un message au nom de cet utilisateur, sans vérification de session. Route non appelée par l'interface mais déployée en production |
| `app/api/conversation/route.ts` | Ancienne API de conversation (singulier), remplacée par `app/api/conversations/` |
| `app/api/conversation/[userId]/route.ts` | Idem |

`app/api/messages/unread/` et l'ensemble de `app/api/conversations/` sont conservés :
ce sont eux que la messagerie en service appelle.

### Composants et pages supprimés

| Fichier | Motif |
|---|---|
| `components/TestButtonApi.tsx` | Composant de test |
| `components/FooterBanner.tsx` | Abandonné |
| `components/Articles/CheapItems.tsx` | Abandonné |
| `components/Articles/ExpensiveItems.tsx` | Abandonné |
| `components/ui/homepage-carousel.tsx` | Abandonné |
| `components/chat/chat-component.tsx` | Ancienne messagerie, remplacée par `MessageThread` |
| `components/chat/conversation-list.tsx` | Doublon en minuscules de `ConversationList.tsx`, seul ce dernier étant importé par `/inbox` |
| `app/landing-page/` | Page d'accueil alternative de 488 lignes, aucun lien n'y menait |
| `app/Item_summary/` | Page cassée en production : `fetch('http://localhost:3000/api/items/…')` en dur |

### Coquilles vides et fichiers obsolètes supprimés

| Fichier | Motif |
|---|---|
| `app/api/auth/forgot-password/`, `reset-password/` | Dossiers sans `route.ts` — fonctionnalité jamais implémentée |
| `my-app/prisma-heroku` | **Gitlink de sous-module orphelin** (mode `160000`) pointant vers le commit `5576da9`, sans entrée dans un `.gitmodules` inexistant |
| `infos.txt` | Notes d'installation obsolètes (multer, PostgreSQL local) |

### Effet mesuré

| Indicateur | Avant | Après |
|---|---:|---:|
| Pages | 31 | 29 |
| Routes API | 50 | 47 |
| Composants | 45 | 38 |
| Lignes de code applicatif | 17 431 | 16 791 |
| Dépendances de production | 51 | 41 |
| Vulnérabilités `npm audit` | 50 | 47 |

Le build de production, le typage (`tsc --noEmit`) et la suite de tests (162 tests)
passent après nettoyage.
