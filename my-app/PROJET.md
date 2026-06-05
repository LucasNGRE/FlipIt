# FlipIt — Documentation complète du projet

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
| ORM | Prisma 5.20 |
| Base de données | PostgreSQL via NeonDB (serverless) |
| Auth | NextAuth v5 (beta) — Credentials + Google OAuth |
| Paiements | Stripe (mode test) |
| Temps réel | Pusher (messages instantanés) |
| Hébergement | Vercel |
| Images | Uploadées via URL externe (stockées en DB) |

---

## Bases de données

Deux bases NeonDB séparées :

- **`.env`** → `ep-winter-field-ab5ly6pv` = base Vercel **prod** (aussi utilisée par Vercel en déploiement)
- **`.env.local`** → `ep-tiny-violet-abonxi1v` = base de **développement local**

> Next.js charge `.env.local` en priorité sur `.env`. `prisma db push` lit `.env` par défaut — pour pousser sur la bonne base en local, il faut passer l'URL via `$env:DATABASE_URL`.

**Commande pour pousser le schema sur la base locale :**
```powershell
$env:DATABASE_URL = "postgresql://..." # URL de .env.local
npx prisma db push --skip-generate
```

**Build :** `npm run build` = `prisma generate && next build`. Le dev server doit être arrêté avant car il verrouille le DLL Prisma sur Windows.

---

## Schéma Prisma (modèles principaux)

### User
```
id, firstName, lastName, email, password?, image?, bio?
stripeAccountId?, stripeOnboarded
suspended (Boolean), suspendedReason?
authProviderId? (Google OAuth)
createdAt, updatedAt
```

### Product
```
id, userId (FK), title, description?, price (Decimal)
condition (enum: Neuf | Comme_neuf | Bon_etat | Moyen_etat | Mauvais_etat)
category (enum: Deck | Truck | Roue | Chaussure | Vetement | Accessoire)
brand?, size?
status (enum: available | reserved | sold)
suspended (Boolean, default false) ← ajouté récemment pour modération admin
createdAt, updatedAt
```

### Order
```
id, productId, sellerId, buyerId, offerId?
finalPrice, paymentIntentId (unique), transferGroup
status (enum: paid | shipped | confirmed | disputed | refunded)
shippedAt?, confirmDeadline?, trackingNumber?
disputeReason?, disputeDetails?
```

### Report
```
id, reporterId, reason, details?
status (enum: pending | reviewed | dismissed)
productId?, reportedUserId?
createdAt, updatedAt
```

### Autres modèles
- `Offer` — offres de prix (pending | accepted | rejected)
- `Like` — favoris (userId + productId, clé composite)
- `Message` — messages liés à une conversation et un produit
- `Conversation` — participants (relation many-to-many avec User)
- `ConversationRead` — dernière lecture par utilisateur
- `Transaction` — historique des ventes finalisées
- `Chargeback` — litiges Stripe
- `AdminLog` — journal des actions admin
- `AdminMessage` — messages admin → utilisateur
- `ProductImage` — images d'un produit (url, altText)

---

## Architecture des routes (App Router)

### Pages publiques
| Route | Description |
|-------|-------------|
| `/` | Page principale — hero, grille d'annonces, catégories |
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
| `/items/add-item` | Créer une annonce (auth requise) |
| `/edit-product/[id]` | Modifier une annonce |

### Admin (cookie `admin_token`)
| Route | Description |
|-------|-------------|
| `/admin` | Dashboard stats |
| `/admin/login` | Connexion admin (token cookie) |
| `/admin/users` | Liste des utilisateurs, suspension |
| `/admin/products` | Liste des annonces |
| `/admin/reports` | Signalements groupés par cible (refonte récente) |
| `/admin/orders` | Commandes |
| `/admin/disputes` | Litiges |
| `/admin/chargebacks` | Chargebacks Stripe |
| `/admin/finances` | Vue financière |
| `/admin/logs` | Journal des actions admin |
| `/admin/search` | Recherche globale |

---

## API Routes

### Authentification admin
Toutes les routes `/api/admin/*` vérifient `cookies().get('admin_token')?.value === process.env.ADMIN_TOKEN`.

### Routes API principales

| Endpoint | Méthodes | Description |
|----------|----------|-------------|
| `/api/products` | GET | Liste annonces (filtre cat, q, exclut sold + suspended) |
| `/api/article/[id]` | GET | Détail d'une annonce + user |
| `/api/items` | GET, POST | Annonces de l'utilisateur connecté |
| `/api/items/[id]` | PATCH, DELETE | Modifier/supprimer une annonce |
| `/api/likes` | GET, POST | Favoris de l'utilisateur |
| `/api/likes/[productId]` | GET | Vérifie si un article est liké |
| `/api/user` | GET | Profil de l'utilisateur connecté |
| `/api/user/[id]` | GET | Profil public |
| `/api/conversations` | GET, POST | Conversations de l'utilisateur |
| `/api/conversations/[id]` | GET | Détail conversation |
| `/api/conversations/[id]/messages` | GET, POST | Messages d'une conversation |
| `/api/conversations/[id]/read` | POST | Marquer comme lu |
| `/api/messages/unread` | GET | Compte de messages non lus |
| `/api/offer` | POST | Créer une offre |
| `/api/offer/[id]` | PATCH | Accepter/refuser une offre |
| `/api/offer/status` | GET | Statut d'une offre |
| `/api/orders` | GET | Commandes de l'utilisateur |
| `/api/orders/[id]/ship` | POST | Marquer expédié |
| `/api/orders/[id]/confirm` | POST | Confirmer réception |
| `/api/orders/[id]/dispute` | POST | Ouvrir un litige |
| `/api/reports` | POST | Créer un signalement (rate limit: 5/h) |
| `/api/stats` | GET | Stats publiques (nb produits, users, etc.) |
| `/api/pusher/auth` | POST | Auth Pusher pour canaux privés |
| `/api/stripe/payment-intent` | POST | Créer un PaymentIntent |
| `/api/stripe/webhook` | POST | Webhook Stripe (paiement confirmé) |
| `/api/stripe/onboarding` | POST | Lien onboarding Stripe Connect |
| `/api/stripe/dashboard` | POST | Lien dashboard Stripe Connect |
| `/api/cron/auto-confirm` | POST | Confirmation auto commandes (cron Vercel) |

### Routes API admin

| Endpoint | Méthodes | Description |
|----------|----------|-------------|
| `/api/admin/reports` | GET, PATCH | Signalements + batch status update |
| `/api/admin/products` | GET, PATCH, DELETE | Gestion annonces + suspension |
| `/api/admin/users` | GET | Liste utilisateurs |
| `/api/admin/users/[id]/suspend` | POST | Suspendre/réactiver un compte |
| `/api/admin/users/[id]/message` | POST | Envoyer message admin à un user |
| `/api/admin/orders` | GET | Commandes admin |
| `/api/admin/orders/[id]/refund` | POST | Rembourser une commande |
| `/api/admin/orders/[id]/release` | POST | Libérer les fonds |
| `/api/admin/finances` | GET | Stats financières |
| `/api/admin/stats` | GET | Stats dashboard |
| `/api/admin/logs` | GET | Journal actions admin |
| `/api/admin/search` | GET | Recherche globale |
| `/api/admin/disputes` | GET | Litiges |
| `/api/admin/chargebacks` | GET | Chargebacks |

---

## Authentification

**NextAuth v5** avec stratégie JWT.

- **Credentials** : email + password (bcryptjs), vérifie `user.suspended`
- **Google OAuth** : crée le user en DB si nouveau, vérifie `suspended`
- **Session** : `session.user.id` = `token.sub` = ID numérique DB (string) pour Credentials, Google sub ID pour OAuth
- **Callbacks** : `jwt` stocke `token.sub = user.id`, `session` expose `session.user.id = token.sub`

> Attention : pour les users Google, `session.user.id` = Google sub ID, pas l'ID DB numérique. Les comparaisons propriétaire (`session.user.id === product.userId`) ne fonctionnent fiablement que pour les users Credentials.

---

## Composants clés

### Layout
- **`Header.tsx`** — navbar avec recherche, liens, mode sombre, menu mobile hamburger
- **`Footer.tsx`** — liens, stats, grille responsive
- **`PortfolioModal.tsx`** — modal d'avertissement "site démo", s'affiche une fois (localStorage `flipit_portfolio_seen`), `alwaysShow` prop disponible
- **`AdminSidebar.tsx`** — sidebar desktop + topbar mobile + drawer pour le panel admin

### Annonces
- **`ArticleCard.tsx`** — carte annonce (image, prix, condition, vendeur)
- **`ArticleGrid.tsx`** — grille avec filtres catégorie et pagination infinie
- **`Banner.tsx`** — hero page principale (headline + featured card + stats strip + marquee)

### Messagerie
- **`chat-component.tsx`** — interface de chat Pusher temps réel
- **`MessageThread.tsx`** — fil de messages
- **`ConversationList.tsx`** / **`conversation-list.tsx`** — liste des conversations
- **`offer-dialog.tsx`** — modal pour faire une offre

### Paiement
- **`StripePaymentForm.tsx`** — formulaire Stripe Elements
- **`payment-form.tsx`** — wrapper formulaire de paiement
- **`Delivery-form.tsx`** — saisie adresse livraison

### Modération
- **`ReportButton.tsx`** — bouton signalement avec modal (raison + détails). Stocke l'état "déjà signalé" dans localStorage (`flipit_reported_product_X` / `flipit_reported_user_X`). Redirige vers `/login` si non authentifié (401 de l'API).

### shadcn/ui (components/ui/)
`avatar, badge, button, card, carousel, checkbox, dialog, dropdown-menu, form, input, label, menubar, progress, radio-group, scroll-area, select, sheet, textarea`

---

## Variables d'environnement requises

```env
# Base de données
DATABASE_URL=postgresql://...

# NextAuth
NEXTAUTH_SECRET=...
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
PUSHER_SECRET=...
NEXT_PUBLIC_PUSHER_APP_KEY=...
NEXT_PUBLIC_PUSHER_CLUSTER=...

# Admin
ADMIN_TOKEN=...

# Cloudinary ou stockage images (si utilisé)
CLOUDINARY_URL=... (optionnel)
```

---

## Fonctionnalités implémentées

### Côté utilisateur
- Inscription / connexion (email ou Google)
- Parcourir les annonces avec filtres par catégorie et recherche
- Fiche détail annonce (images, condition, taille, marque, vendeur)
- Liker une annonce (favoris persistants)
- Contacter un vendeur (messagerie temps réel Pusher)
- Faire une offre de prix (négociation)
- Acheter (tunnel Stripe test)
- Suivi commande (paid → shipped → confirmed)
- Ouvrir un litige sur une commande
- Créer / modifier / supprimer ses annonces
- Profil public (annonces, stats)
- Paramètres compte (photo, bio, etc.)
- Onboarding Stripe Connect (pour recevoir des paiements)
- Signaler une annonce ou un utilisateur

### Côté admin
- Dashboard stats
- Gérer les utilisateurs (suspension, message direct)
- Gérer les annonces (suspension, suppression)
- Signalements groupés par cible avec actions : suspendre annonce/user, remettre en ligne, supprimer, marquer traité/rejeté
- Litiges et chargebacks
- Vue financière
- Journal des actions (AdminLog)
- Recherche globale

---

## Points d'attention / comportements non évidents

1. **Annonces suspendues** (`product.suspended = true`) : exclues du feed public (`/api/products`) mais toujours accessibles via `/article/[id]`. L'admin peut suspendre/rétablir depuis la page signalements.

2. **ReportButton** : visible pour tous les non-propriétaires (condition `String(session?.user?.id) !== String(article.userId)`). Si `session` est null, la comparaison `"undefined" !== "14"` est toujours vraie → bouton visible. L'auth est vérifiée côté API.

3. **Rate limiting signalements** : 5 signalements/heure par userId, stocké en mémoire (Map in-process). Reset au redémarrage du serveur.

4. **Confirmation automatique commandes** : cron Vercel (`/api/cron/auto-confirm`) confirme automatiquement les commandes après un délai si l'acheteur ne confirme pas manuellement.

5. **Stripe Connect** : les vendeurs doivent faire l'onboarding Stripe pour recevoir des paiements. Les fonds sont d'abord retenus puis libérés après confirmation.

6. **CSS variables** : le design system utilise des variables CSS custom définies dans `globals.css` : `--ink` (noir), `--acid` (jaune fluo), `--paper`, `--snow`, `--concrete-3`, `--concrete-4`, `--r-lg`, `--r-xl`, etc.

7. **PortfolioModal** : montée dans `app/layout.tsx` (toutes les pages). Se ferme une fois et ne réapparaît plus (localStorage). Sur `/payment`, elle est aussi montée directement avec `alwaysShow={true}` pour rappeler que les paiements sont fictifs.

8. **Admin auth** : cookie `admin_token` comparé à `process.env.ADMIN_TOKEN`. Pas de NextAuth pour l'admin — session séparée.

9. **Prisma generate** : le build (`npm run build`) lance `prisma generate` avant `next build`. Sur Windows, le dev server doit être arrêté avant le build car il verrouille le DLL Prisma.

---

## Structure des dossiers

```
my-app/
├── app/
│   ├── layout.tsx              # Layout racine (Header, Footer, PortfolioModal)
│   ├── page.tsx                # Page principale
│   ├── admin/                  # Panel admin (layout séparé)
│   ├── article/[id]/           # Page détail annonce
│   ├── profile/[id]/           # Profil utilisateur
│   ├── inbox/                  # Messagerie
│   ├── orders/                 # Mes commandes
│   ├── payment/                # Tunnel paiement
│   ├── items/add-item/         # Créer annonce
│   ├── settings/               # Paramètres
│   └── api/                    # Routes API
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── admin/                  # AdminSidebar
│   ├── Articles/               # ArticleCard, ArticleGrid
│   ├── chat/                   # Messagerie, OfferDialog
│   ├── items/                  # Formulaire création annonce
│   ├── payment/                # StripePaymentForm
│   ├── settings/               # user_settings
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── Banner.tsx
│   ├── PortfolioModal.tsx
│   └── ReportButton.tsx
├── lib/
│   ├── auth.ts                 # Config NextAuth
│   ├── db.ts                   # Client Prisma singleton
│   ├── adminLog.ts             # Helper log admin
│   ├── pusher-server.ts        # Config Pusher serveur
│   ├── pusher-client.ts        # Config Pusher client
│   ├── rateLimit.ts            # Rate limiting en mémoire
│   └── stripe.ts               # Config Stripe
├── prisma/
│   └── schema.prisma           # Schéma DB
├── .env                        # DB prod Vercel (ep-winter-field)
└── .env.local                  # DB dev local (ep-tiny-violet)
```
