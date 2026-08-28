# FlipIt — Documentation complète du projet

> Dernière vérification contre le code : 2026-08-28

## Vue d'ensemble

FlipIt est une **marketplace de revente de matériel de skate** entre particuliers. C'est un **projet portfolio / démonstration** — les paiements sont en mode test Stripe, aucune transaction réelle n'est effectuée. Une modal d'avertissement (`PortfolioModal`) s'affiche à la première visite.

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Framework | Next.js 14 (App Router) |
| Langage | TypeScript 5.6 |
| Styling | Tailwind CSS 3 + CSS variables custom |
| Composants UI | shadcn/ui (Radix UI) + Lucide React |
| Animations | Framer Motion |
| ORM | Prisma 5.20 |
| Base de données | PostgreSQL via NeonDB (serverless) |
| Auth | NextAuth v5 (beta) — Credentials + Google OAuth |
| Paiements | Stripe (mode test) + Stripe Connect |
| Temps réel | Pusher (messages instantanés) |
| Hébergement | Vercel |
| Images | Uploadées en `multipart/form-data`, converties en **base64** et stockées en DB (`ProductImage.url` = `data:image/jpeg;base64,...`) |

Polices (next/font) : Inter (`--font-sans`), Bricolage Grotesque (`--font-display`), Space Mono (`--font-mono`), Anton (`--font-logo`).

---

## Bases de données

Deux bases NeonDB séparées :

- **`.env`** → `ep-winter-field-ab5ly6pv` = base Vercel **prod** (aussi utilisée par Vercel en déploiement)
- **`.env.local`** → `ep-tiny-violet-abonxi1v-pooler` = base de **développement local**

> Next.js charge `.env.local` en priorité sur `.env`. `prisma db push` lit `.env` par défaut — pour pousser sur la bonne base en local, il faut passer l'URL via `$env:DATABASE_URL`.

**Commande pour pousser le schema sur la base locale :**
```powershell
$env:DATABASE_URL = "postgresql://..." # URL de .env.local
npx prisma db push --skip-generate
```

**Build :** `npm run build` = `prisma generate && next build`. Le dev server doit être arrêté avant car il verrouille le DLL Prisma sur Windows.

**Seed :** `prisma/seed.ts` (ts-node, `@faker-js/faker`).

---

## Schéma Prisma (modèles principaux)

### User
```
id (Int, autoincrement), firstName, lastName, email (unique), password?
emailVerified?, image?, bio?
stripeAccountId?, stripeOnboarded (Boolean)
suspended (Boolean), suspendedReason?
authProviderId? (Google OAuth)
createdAt, updatedAt
```

### Product
```
id, userId (FK), title, description?, price (Decimal 10,2)
condition (enum: Neuf | Comme_neuf | Bon_etat | Moyen_etat | Mauvais_etat, default Neuf)
category (enum OPTIONNEL: Deck | Truck | Roue | Chaussure | Vetement | Accessoire)
brand?, size?
status (enum: available | reserved | sold)
suspended (Boolean, default false) ← modération admin
createdAt, updatedAt
```

### Order
```
id, productId, sellerId, buyerId, offerId?
finalPrice, paymentIntentId (unique), transferGroup
status (enum: paid | shipped | confirmed | disputed | refunded)
shippedAt?, confirmDeadline?, trackingNumber?
disputeReason?, disputeDetails?
+ relation disputeImages (OrderDisputeImage[]), chargebacks
```

### Report
```
id, reporterId, reason, details?
status (enum: pending | reviewed | dismissed)
productId?, reportedUserId?  (onDelete: SetNull)
createdAt, updatedAt
```

### Autres modèles
- `Offer` — offres de prix (pending | accepted | rejected) + `expiresAt` (fenêtre d'achat 24 h)
- `Like` — favoris (userId + productId, clé composite)
- `Message` — messages liés à une conversation et un produit
- `Conversation` — participants (many-to-many avec User) + `productId?`
- `ConversationRead` — dernière lecture par utilisateur
- `Transaction` — historique des ventes finalisées (**modèle présent mais quasi inutilisé** : seul `/api/stats` en fait un `count()`)
- `Chargeback` — litiges Stripe
- `AdminLog` — journal des actions admin
- `AdminMessage` — messages admin → utilisateur (lus via `/api/user/messages`)
- `ProductImage` — images d'un produit (url = data-URI base64, altText)
- `OrderDisputeImage` — photos jointes à un litige
- `Account`, `Session`, `VerificationToken`, `Authenticator` — tables NextAuth (présentes dans le schéma, non utilisées activement car stratégie **JWT**)

---

## Architecture des routes (App Router)

### Pages publiques
| Route | Description |
|-------|-------------|
| `/` | Page principale — hero, grille d'annonces, catégories, marquee |
| `/article/[id]` | Page détail d'une annonce |
| `/profile/[id]` | Profil public d'un utilisateur + ses annonces |
| `/likes` | Annonces likées (auth requise) |
| `/login` | Connexion (email/pass ou Google) |
| `/register` | Inscription |
| `/inbox` | Messagerie (auth requise) |
| `/orders` | Mes commandes (auth requise) |
| `/payment` | Tunnel de paiement Stripe (auth requise) |
| `/thank-you` | Confirmation après paiement |
| `/settings` | Paramètres du compte |
| `/profile/seller-onboarding` | Onboarding Stripe Connect vendeur |
| `/items` | Mes annonces |
| `/items/add-item` | Créer une annonce (auth requise, formulaire multi-étapes) |
| `/edit-product/[id]` | Modifier une annonce |
| `/about` | À propos |
| `/contact` | Contact |
| `/privacy` | Politique de confidentialité |
| `/Item_summary/[id]` | Récapitulatif d'article (avant paiement) |
| `/landing-page` | Landing alternative (page annexe) |

### Admin (cookie `admin_token`)
| Route | Description |
|-------|-------------|
| `/admin` | Dashboard stats |
| `/admin/login` | Connexion admin (mot de passe → cookie) |
| `/admin/users` | Liste des utilisateurs, suspension |
| `/admin/products` | Liste des annonces |
| `/admin/reports` | Signalements groupés par cible |
| `/admin/orders` | Commandes |
| `/admin/disputes` | Litiges |
| `/admin/chargebacks` | Chargebacks Stripe |
| `/admin/finances` | Vue financière (+ export) |
| `/admin/logs` | Journal des actions admin |
| `/admin/search` | Recherche globale |

L'accès est protégé **en amont par `middleware.ts`** : toute route `/admin/*` (sauf `/admin/login`) sans cookie `admin_token` valide est redirigée vers `/admin/login`.

---

## API Routes

### Authentification admin
Toutes les routes `/api/admin/*` vérifient `cookies().get('admin_token')?.value === process.env.ADMIN_TOKEN`.

### Routes API principales

| Endpoint | Méthodes | Description |
|----------|----------|-------------|
| `/api/products` | GET | Liste annonces (filtre `cat`, `q`, exclut `sold` + `suspended`) |
| `/api/products/user` | GET | Annonces de l'utilisateur connecté |
| `/api/article/[id]` | GET | Détail d'une annonce + user |
| `/api/items` | POST, DELETE | Créer une annonce (multipart + photos base64) / supprimer |
| `/api/items/[id]` | GET, PUT, DELETE | Détail / modifier / supprimer une annonce |
| `/api/likes` | GET, POST | Favoris de l'utilisateur |
| `/api/likes/[productId]` | GET | Vérifie si un article est liké |
| `/api/user` | GET, PUT, DELETE | Profil de l'utilisateur connecté (lecture, mise à jour, suppression du compte) |
| `/api/user/[id]` | GET | Profil public |
| `/api/user/messages` | GET, PATCH | Messages admin reçus / marquer comme lu |
| `/api/conversations` | GET, POST | Conversations de l'utilisateur |
| `/api/conversations/[id]` | GET | Détail conversation |
| `/api/conversations/[id]/messages` | POST | Envoyer un message (broadcast Pusher) |
| `/api/conversations/[id]/read` | POST | Marquer comme lu |
| `/api/messages/unread` | GET | Compte de messages non lus |
| `/api/offer` | POST | Créer une offre |
| `/api/offer/[id]` | GET | Détail d'une offre (auto-expire après 24 h si `accepted`) |
| `/api/offer/status` | POST | Accepter / refuser une offre |
| `/api/orders` | GET | Commandes de l'utilisateur |
| `/api/orders/[id]/ship` | POST | Marquer expédié |
| `/api/orders/[id]/confirm` | POST | Confirmer réception |
| `/api/orders/[id]/dispute` | POST | Ouvrir un litige |
| `/api/reports` | POST | Créer un signalement (rate limit : 5/h) |
| `/api/stats` | GET | Stats publiques (nb produits, users, transactions) |
| `/api/pusher/auth` | POST | Auth Pusher pour canaux privés |
| `/api/stripe/payment-intent` | POST | Créer un PaymentIntent |
| `/api/stripe/webhook` | POST | Webhook Stripe |
| `/api/stripe/onboarding` | POST, GET | Lien onboarding Stripe Connect / statut |
| `/api/stripe/dashboard` | GET | Lien dashboard Stripe Connect |
| `/api/cron/auto-confirm` | POST | Confirmation auto des commandes (cron Vercel, `Bearer CRON_SECRET`) |

**Routes héritées / non référencées côté UI** (candidates à suppression) : `/api/conversation`, `/api/conversation/[userId]`, `/api/messages`.
**Dossiers vides** (fonctionnalité non implémentée) : `app/api/auth/forgot-password/`, `app/api/auth/reset-password/` — pas de `route.ts`, et aucune librairie d'e-mail installée bien que `RESEND_API_KEY` figure dans `.env.local`.

### Routes API admin

| Endpoint | Méthodes | Description |
|----------|----------|-------------|
| `/api/admin/auth` | POST, DELETE | Login admin (`ADMIN_PASSWORD` → pose le cookie) / logout |
| `/api/admin/reports` | GET, PATCH | Signalements + batch status update |
| `/api/admin/products` | GET, PATCH, DELETE | Gestion annonces + suspension |
| `/api/admin/users` | GET | Liste utilisateurs |
| `/api/admin/users/[id]/suspend` | POST | Suspendre/réactiver un compte |
| `/api/admin/users/[id]/message` | POST | Envoyer message admin à un user |
| `/api/admin/orders` | GET | Commandes admin |
| `/api/admin/orders/[id]/refund` | POST | Rembourser une commande |
| `/api/admin/orders/[id]/release` | POST | Libérer les fonds |
| `/api/admin/finances` | GET | Stats financières |
| `/api/admin/finances/export` | GET | Export des données financières |
| `/api/admin/stats` | GET | Stats dashboard |
| `/api/admin/logs` | GET | Journal actions admin |
| `/api/admin/search` | GET | Recherche globale |
| `/api/admin/disputes` | GET | Litiges |
| `/api/admin/chargebacks` | GET | Chargebacks |

---

## Authentification

**NextAuth v5** avec stratégie JWT (`trustHost: true`, pages `signIn`/`error` → `/login`).

- **Credentials** : email + password (bcryptjs), refuse si `user.suspended` ou si le compte n'a pas de mot de passe (compte OAuth)
- **Google OAuth** : crée le user en DB si nouveau (`firstName`/`lastName` déduits de `name`), refuse si `suspended`
- **Session** : `session.user.id` = `token.sub` = ID numérique DB (string) pour Credentials, Google sub ID pour OAuth
- **Callbacks** : `jwt` stocke `token.sub = user.id`, `session` expose `session.user.id = token.sub`
- Helper `lib/getSession.ts` — wrapper autour de `auth()` utilisé par la majorité des routes API

> Attention : pour les users Google, `session.user.id` = Google sub ID, pas l'ID DB numérique. Les comparaisons propriétaire (`session.user.id === product.userId`) et les `Number(session.user.id)` ne fonctionnent fiablement que pour les users Credentials.

---

## Composants clés

### Layout
- **`Header.tsx`** — navbar avec recherche, liens, mode sombre, menu mobile hamburger
- **`Footer.tsx`** — liens, stats, grille responsive
- **`PortfolioModal.tsx`** — modal d'avertissement "site démo", s'affiche une fois (localStorage), prop `alwaysShow`
- **`Marquee.tsx`** — bandeau défilant réutilisable (utilisé dans `app/page.tsx` et `Banner.tsx`)
- **`AdminSidebar.tsx`** — sidebar desktop + topbar mobile + drawer pour le panel admin
- **`theme-provider.tsx`** / **`toggle.mode.tsx`** — thème clair/sombre (next-themes)

### Annonces
- **`ArticleCard.tsx`** — carte annonce (image, prix, condition, vendeur)
- **`ArticleGrid.tsx`** — grille des annonces. Fetch **unique** de `/api/products?cat=...`, puis filtrage **côté client** par recherche texte + état (`CONDITIONS`). Pas de pagination ni de scroll infini ; auto-scroll vers `#articles` quand `cat`/`q` sont dans l'URL.
- **`Banner.tsx`** — hero page principale (headline + featured card + stats strip + marquee)

### Messagerie
- **`ConversationList.tsx`** + **`MessageThread.tsx`** — l'interface réellement utilisée par `/inbox`
- **`offer-dialog.tsx`** — modal pour faire une offre
- **Non utilisés (legacy)** : `chat-component.tsx`, `conversation-list.tsx`

### Paiement
- **`StripePaymentForm.tsx`** — formulaire Stripe Elements
- **`payment-form.tsx`** — wrapper formulaire de paiement
- **`Delivery-form.tsx`** — saisie adresse livraison

### Modération
- **`ReportButton.tsx`** — bouton signalement avec modal (raison + détails). Stocke l'état "déjà signalé" dans localStorage (`flipit_reported_product_X` / `flipit_reported_user_X`). Redirige vers `/login` si non authentifié (401 de l'API).

### shadcn/ui (components/ui/)
`avatar, badge, button, card, carousel, checkbox, confetti, dialog, dropdown-menu, form, homepage-carousel, input, label, menubar, progress, radio-group, scroll-area, select, sheet, textarea`

### Composants non référencés (mort potentiel)
`TestButtonApi.tsx`, `FooterBanner.tsx`, `Articles/CheapItems.tsx`, `Articles/ExpensiveItems.tsx`, `ui/homepage-carousel.tsx`

---

## Variables d'environnement requises

Noms **réellement lus par le code** :

```env
# Base de données
DATABASE_URL=postgresql://...

# NextAuth (v5 → AUTH_SECRET, pas NEXTAUTH_SECRET)
AUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Pusher (temps réel)
PUSHER_APP_ID=...
PUSHER_KEY=...
PUSHER_SECRET=...
PUSHER_CLUSTER=...
NEXT_PUBLIC_PUSHER_KEY=...
NEXT_PUBLIC_PUSHER_CLUSTER=...

# Admin
ADMIN_PASSWORD=...   # saisi sur /admin/login
ADMIN_TOKEN=...      # valeur posée dans le cookie admin_token

# Cron Vercel
CRON_SECRET=...      # attendu en "Authorization: Bearer <CRON_SECRET>"
```

> Pièges connus :
> - Le `.env` (prod) contient `GOOGLE_ID` / `GOOGLE_SECRET`, alors que `lib/auth.ts` lit `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`. À corriger côté Vercel.
> - `.env` ne contient ni les clés Stripe, ni `ADMIN_PASSWORD`/`ADMIN_TOKEN`, ni `CRON_SECRET` — ils doivent être définis dans les variables d'environnement Vercel.
> - `RESEND_API_KEY` est présent dans `.env.local` mais aucun code ne l'utilise (reset de mot de passe non implémenté).
> - Aucun stockage d'images externe (pas de Cloudinary) : les images sont en base64 dans PostgreSQL.

---

## Fonctionnalités implémentées

### Côté utilisateur
- Inscription / connexion (email ou Google)
- Parcourir les annonces avec filtres par catégorie/état et recherche
- Fiche détail annonce (images, condition, taille, marque, vendeur)
- Liker une annonce (favoris persistants)
- Contacter un vendeur (messagerie temps réel Pusher)
- Faire une offre de prix (négociation, acceptation valable 24 h)
- Acheter (tunnel Stripe test)
- Suivi commande (paid → shipped → confirmed)
- Ouvrir un litige sur une commande (avec photos)
- Créer / modifier / supprimer ses annonces
- Profil public (annonces, stats)
- Paramètres compte (photo, bio, suppression du compte)
- Onboarding Stripe Connect (pour recevoir des paiements)
- Signaler une annonce ou un utilisateur
- Recevoir des messages de l'administration

### Côté admin
- Dashboard stats
- Gérer les utilisateurs (suspension, message direct)
- Gérer les annonces (suspension, suppression)
- Signalements groupés par cible avec actions : suspendre annonce/user, remettre en ligne, supprimer, marquer traité/rejeté
- Litiges et chargebacks
- Vue financière + export
- Journal des actions (AdminLog)
- Recherche globale

### Non implémenté
- Mot de passe oublié / réinitialisation (routes vides)
- Notifications e-mail

---

## Points d'attention / comportements non évidents

1. **Annonces suspendues** (`product.suspended = true`) : exclues du feed public (`/api/products`) mais toujours accessibles via `/article/[id]`. L'admin peut suspendre/rétablir depuis la page signalements.

2. **ReportButton** : sur `/article/[id]` il est visible pour tous les non-propriétaires (`String(session?.user?.id) !== String(article.userId)`) — si `session` est null, la comparaison `"undefined" !== "14"` est vraie, donc le bouton est visible même déconnecté (l'auth est vérifiée côté API, qui renvoie 401 → redirection `/login`). Sur `/profile/[id]`, la condition exige `session`, donc le bouton est masqué aux visiteurs anonymes. Comportement incohérent entre les deux pages.

3. **Rate limiting** (`lib/rateLimit.ts`, Map in-process, reset au redémarrage / par instance serverless) :
   - signalements : 5/heure par userId
   - login admin : 5 tentatives / 15 min par IP, puis lockout 30 min + délai artificiel de 500 ms sur mot de passe faux

4. **Confirmation automatique commandes** : cron Vercel (`vercel.json`, `0 8 * * *` → `/api/cron/auto-confirm`). Confirme les commandes `shipped` dont `confirmDeadline` (48 h) est dépassé et déclenche le transfert Stripe vers le vendeur. La route exige `Authorization: Bearer $CRON_SECRET`.

5. **Stripe Connect** : les vendeurs doivent faire l'onboarding Stripe pour recevoir des paiements. Les fonds sont d'abord retenus (`transferGroup`) puis libérés après confirmation.

6. **CSS variables** : le design system utilise des variables CSS custom définies dans `globals.css` : `--ink` (noir), `--acid` (jaune fluo), `--paper`, `--snow`, `--concrete-3`, `--concrete-4`, `--r-lg`, `--r-xl`, etc.

7. **PortfolioModal** : montée dans `app/layout.tsx` (toutes les pages). Se ferme une fois et ne réapparaît plus (localStorage). Sur `/payment`, elle est aussi montée avec `alwaysShow` pour rappeler que les paiements sont fictifs.

8. **Admin auth** : session séparée de NextAuth. `/api/admin/auth` compare le mot de passe saisi à `ADMIN_PASSWORD` puis pose un cookie httpOnly `admin_token` contenant `ADMIN_TOKEN` (7 jours). `middleware.ts` protège les pages `/admin/*`, chaque route `/api/admin/*` revérifie le cookie.

9. **Prisma generate** : le build (`npm run build`) lance `prisma generate` avant `next build`. Sur Windows, le dev server doit être arrêté avant le build car il verrouille le DLL Prisma.

10. **Poids des images** : le stockage base64 en DB gonfle fortement les payloads de `/api/products` (toutes les images de toutes les annonces sont renvoyées d'un coup, sans pagination). C'est le principal point de scalabilité du projet.

---

## Structure des dossiers

```
my-app/
├── app/
│   ├── layout.tsx              # Layout racine (Header, Footer, PortfolioModal, ThemeProvider)
│   ├── page.tsx                # Page principale
│   ├── admin/                  # Panel admin (layout séparé)
│   ├── article/[id]/           # Page détail annonce
│   ├── profile/[id]/           # Profil utilisateur
│   ├── inbox/                  # Messagerie
│   ├── orders/                 # Mes commandes
│   ├── payment/                # Tunnel paiement
│   ├── items/                  # Mes annonces + add-item
│   ├── settings/               # Paramètres
│   ├── about/ contact/ privacy/ landing-page/ Item_summary/[id]/
│   ├── action/user.ts          # Server action (utilisateur)
│   └── api/                    # Routes API
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── admin/                  # AdminSidebar
│   ├── Articles/               # ArticleCard, ArticleGrid, CheapItems, ExpensiveItems
│   ├── chat/                   # ConversationList, MessageThread, offer-dialog (+ legacy)
│   ├── items/                  # Formulaire création annonce
│   ├── payment/                # StripePaymentForm, payment-form, Delivery-form
│   ├── settings/               # user_settings
│   ├── Header.tsx / Footer.tsx / FooterBanner.tsx
│   ├── Banner.tsx / Marquee.tsx
│   ├── PortfolioModal.tsx / ReportButton.tsx
│   └── theme-provider.tsx / toggle.mode.tsx
├── lib/
│   ├── auth.ts                 # Config NextAuth
│   ├── getSession.ts           # Wrapper auth() utilisé par les routes API
│   ├── db.ts                   # Client Prisma singleton
│   ├── adminLog.ts             # Helper log admin
│   ├── pusher-server.ts        # Config Pusher serveur
│   ├── pusher-client.ts        # Config Pusher client (singleton)
│   ├── rateLimit.ts            # Rate limiting en mémoire
│   ├── stripe.ts               # Config Stripe
│   └── utils.ts                # cn() (clsx + tailwind-merge)
├── prisma/
│   ├── schema.prisma           # Schéma DB
│   ├── schema.mmd              # Diagramme Mermaid
│   ├── seed.ts                 # Seed faker
│   └── migrations/
├── ERD/diagram.svg             # Diagramme entités-relations
├── middleware.ts               # Protection des pages /admin/*
├── vercel.json                 # Cron auto-confirm (08:00 UTC)
├── .env                        # DB prod Vercel (ep-winter-field)
└── .env.local                  # DB dev local (ep-tiny-violet)
```
