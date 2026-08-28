# 03 — Sécurité de l'application

> Inventaire factuel des mécanismes présents dans le code au 28 août 2026,
> avec le fichier et la fonction concernés. La dernière section liste sans
> complaisance les faiblesses constatées, y compris celles corrigées pendant
> la campagne de tests.

## 1. Authentification des utilisateurs

### 1.1 Connexion par identifiants

**Fichier :** `my-app/lib/auth.ts` — provider `Credentials`, fonction `authorize`

| Contrôle | Implémentation |
|---|---|
| Champs obligatoires | `if (!email || !password) return null` |
| Existence du compte | `prisma.user.findUnique({ where: { email } })` |
| Compte suspendu | `if (user.suspended) return null` — un compte modéré ne peut plus se connecter |
| Compte OAuth sans mot de passe | `if (!user.password) return null` — empêche la connexion par mot de passe vide sur un compte Google |
| Vérification du mot de passe | `compare(password, user.password)` — **bcryptjs** |
| Réponse en cas d'échec | `null` dans tous les cas : aucun message distinguant « e-mail inconnu » de « mot de passe erroné » côté client |

Les mots de passe ne sont **jamais stockés en clair** : la colonne `User.password` est
optionnelle et contient un hachage bcrypt. Aucune route n'expose ce champ en réponse JSON.

### 1.2 Connexion Google OAuth

**Fichier :** `my-app/lib/auth.ts` — callback `signIn`

- Refus si l'adresse e-mail est absente du profil Google (`if (!email) return false`).
- Refus si le compte existant est suspendu (`if (existingUser?.suspended) return false`).
- Création automatique du compte au premier accès, sans mot de passe, avec `authProviderId`.

### 1.3 Sessions

**Fichier :** `my-app/lib/auth.ts` — `session: { strategy: "jwt" }`, callbacks `jwt` et `session`

La session est un **JWT signé** (pas de session en base). `token.sub` porte l'identifiant
utilisateur, réexposé en `session.user.id`. Le secret provient de `AUTH_SECRET`.
`trustHost: true` est activé pour le déploiement Vercel.

**Fichier :** `my-app/lib/getSession.ts` — wrapper `getSession()` utilisé par la quasi-totalité
des routes API pour récupérer la session côté serveur.

## 2. Authentification administrateur (session séparée)

Le panel d'administration n'utilise **pas** NextAuth : il repose sur un cookie dédié.

| Étape | Fichier | Mécanisme |
|---|---|---|
| Connexion | `app/api/admin/auth/route.ts` (POST) | Comparaison du mot de passe saisi à `process.env.ADMIN_PASSWORD` |
| Pose du cookie | `app/api/admin/auth/route.ts` | `cookies().set('admin_token', ADMIN_TOKEN, { httpOnly: true, sameSite: 'strict', secure: NODE_ENV === 'production', maxAge: 7 jours, path: '/' })` |
| Déconnexion | `app/api/admin/auth/route.ts` (DELETE) | `cookies().delete('admin_token')` |
| Protection des **pages** | `middleware.ts` | Toute route `/admin/*` sauf `/admin/login` sans cookie valide → redirection vers `/admin/login` |
| Protection des **routes API** | `lib/adminAuth.ts` → `isAdminRequest()` | Appelée en tête des 18 handlers des 15 fichiers de `app/api/admin/*` |

Attributs de sécurité du cookie : `httpOnly` (inaccessible au JavaScript, donc non exfiltrable
par XSS), `sameSite: 'strict'` (protection CSRF), `secure` en production (transport HTTPS uniquement).

> **Le matcher du middleware est `['/admin/:path*']`** : il couvre les pages mais **pas**
> `/api/admin/*`, qui commence par `/api`. La sécurité des routes API repose donc
> entièrement sur `isAdminRequest()`. Voir la faiblesse F1 ci-dessous.

## 3. Limitation de débit et anti-force brute

**Fichier :** `my-app/lib/rateLimit.ts` — fonction `rateLimit(key, { limit, windowMs, lockoutMs })`

| Usage | Fichier appelant | Paramètres |
|---|---|---|
| Signalements | `app/api/reports/route.ts` | 5 requêtes / heure, par `userId` |
| Connexion admin | `app/api/admin/auth/route.ts` | 5 tentatives / 15 min par IP, puis **verrouillage 30 min** |

La route de connexion admin ajoute un **délai artificiel de 500 ms** sur chaque mot de passe
erroné (`await new Promise(r => setTimeout(r, 500))`), ce qui ralentit une attaque par force brute
distribuée sur plusieurs IP.

L'adresse IP est lue dans l'en-tête `x-forwarded-for` (premier segment).

**Couverture de tests :** 9 tests dans `tests/rateLimit.test.ts` (sous la limite, dépassement,
persistance du blocage, isolation par clé, réinitialisation de fenêtre, verrouillage 30 min).

## 4. Validation des entrées côté serveur

### 4.1 Là où la validation existe

| Route | Fichier | Contrôles |
|---|---|---|
| Création d'annonce | `app/api/items/route.ts` | `validateProductInput()` — titre requis et ≤ 120 caractères, prix numérique strictement positif et ≤ 99 999,99, `condition` et `category` contraintes aux énumérations Prisma, nombre d'images plafonné à 5 |
| Création d'offre | `app/api/offer/route.ts` | `validateOfferInput()` — montant numérique fini strictement positif, identifiant produit entier positif |
| Acceptation d'offre | `app/api/offer/status/route.ts` | `if (!id \|\| typeof accepted !== 'boolean')` → 400 |
| Signalement | `app/api/reports/route.ts` | Raison obligatoire, au moins une cible (`productId` ou `reportedUserId`) |
| Paiement | `app/api/stripe/payment-intent/route.ts` | `productId` obligatoire, refus d'achat de son propre produit, refus si le vendeur n'a pas terminé son onboarding Stripe |
| Litige | `app/api/orders/[id]/dispute/route.ts` | Images tronquées à 3 (`.slice(0, 3)`) |
| Identifiants d'URL | `app/api/items/[id]/route.ts` | `if (isNaN(productId))` → 400 |

Les fonctions `validateProductInput` et `validateOfferInput` (dans `lib/domain/`) ont été
**extraites et introduites pendant cette campagne de tests** : elles n'existaient pas auparavant
(voir faiblesse F3).

### 4.2 Là où la validation manque encore

| Route | Manque constaté |
|---|---|
| `app/api/items/[id]/route.ts` (PUT) | Aucune validation de `title`, `description`, `price`, `size`. Un prix négatif ou une chaîne vide sont acceptés à la mise à jour, alors qu'ils sont refusés à la création. `images.map()` plante si `images` n'est pas un tableau (500 au lieu de 400). |
| `app/api/conversations/[id]/messages/route.ts` | Contenu du message non borné en longueur |
| `app/api/user/route.ts` (PUT) | Champs de profil (bio, image) non bornés |
| `app/api/admin/*` (PATCH) | Corps de requête consommé sans schéma de validation |

### 4.3 Protection contre l'injection SQL

Toutes les requêtes passent par **Prisma Client**, qui produit des requêtes paramétrées.
Aucun appel à `$queryRawUnsafe` ou `$executeRawUnsafe` n'existe dans le code.
Les champs énumérés sont en outre contraints applicativement par `isCondition()` / `isCategory()`
(`lib/domain/products.ts`), testés y compris sur une charge d'injection
(`tests/products.test.ts` — « refuse une tentative d'injection dans un champ énuméré »).

## 5. Sécurité des paiements

### 5.1 Vérification de la signature du webhook Stripe

**Fichier :** `app/api/stripe/webhook/route.ts`

```ts
const body = await req.text()
const sig = req.headers.get('stripe-signature')
if (!sig) return NextResponse.json({ error: 'Signature manquante' }, { status: 400 })
event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
```

Le corps est lu en **texte brut** (obligatoire pour que le calcul de signature soit valide),
et `constructEvent` rejette tout événement dont la signature HMAC ne correspond pas au secret.
C'est ce contrôle qui empêche un tiers de forger un `payment_intent.succeeded` et de faire
créer une commande payée sans paiement réel.

### 5.2 Séquestre des fonds

Le `PaymentIntent` est créé **sans** `transfer_data` ni `application_fee`
(`app/api/stripe/payment-intent/route.ts`) : les fonds restent sur le compte plateforme.
Le transfert vers le vendeur n'a lieu qu'à la confirmation de réception
(`app/api/orders/[id]/confirm/route.ts`) ou à l'expiration du délai de 48 h
(`app/api/cron/auto-confirm/route.ts`), via `stripe.transfers.create` rattaché au
`transfer_group` de la commande.

Contrôles associés :
- Seul l'**acheteur** peut confirmer (`canConfirmOrder`, `lib/domain/orders.ts`) — un vendeur
  ne peut pas se libérer les fonds lui-même. Vérifié par 4 tests.
- Le vendeur doit disposer d'un `stripeAccountId` (`if (!order.seller.stripeAccountId)`).
- La commande doit être au statut `shipped`.
- `Order.paymentIntentId` est **UNIQUE** en base : un même paiement ne peut pas générer
  deux commandes (protection contre le rejeu du webhook).

### 5.3 Protection du cron

**Fichier :** `app/api/cron/auto-confirm/route.ts`, via `isCronAuthorized()` (`lib/domain/access.ts`)

```ts
if (!isCronAuthorized(req.headers.get('authorization'), process.env.CRON_SECRET)) → 401
```

L'en-tête doit valoir exactement `Bearer <CRON_SECRET>`. Sans ce contrôle, n'importe qui
pourrait déclencher la libération anticipée de tous les fonds en séquestre.
6 tests couvrent ce point (`tests/access.test.ts`), dont le cas où `CRON_SECRET` est absent.

## 6. Contrôles d'accès aux ressources

| Ressource | Fichier | Règle |
|---|---|---|
| Expédier une commande | `app/api/orders/[id]/ship/route.ts` → `canShipOrder()` | Vendeur uniquement, statut `paid` |
| Confirmer une commande | `app/api/orders/[id]/confirm/route.ts` → `canConfirmOrder()` | Acheteur uniquement, statut `shipped` |
| Ouvrir un litige | `app/api/orders/[id]/dispute/route.ts` → `canDisputeOrder()` | Acheteur uniquement, statut `paid` ou `shipped` |
| Répondre à une offre | `app/api/offer/status/route.ts` → `canRespondToOffer()` | Offre `pending`, émetteur exclu, participant de la conversation obligatoire |
| Supprimer une annonce | `app/api/items/[id]/route.ts` → `canModifyProduct()` | Propriétaire uniquement |
| Supprimer une annonce (variante) | `app/api/items/route.ts` (DELETE) | `product.userId !== session.user.id` → 404 |
| Modifier une annonce | `app/api/items/[id]/route.ts` (PUT) | `where: { id, userId }` — la clause Prisma échoue si l'utilisateur n'est pas propriétaire |
| Canal `private-conversation-<id>` | `app/api/pusher/auth/route.ts` | Abonnement refusé (403) si l'utilisateur n'est pas participant de la conversation |
| Canal `private-user-<id>` | `app/api/pusher/auth/route.ts` | Abonnement refusé (403) si l'identifiant du canal ne correspond pas à l'utilisateur |

À noter : `app/api/pusher/auth/route.ts` résout l'utilisateur par **e-mail**
(`prisma.user.findUnique({ where: { email: session.user.email } })`) et non par
`session.user.id`. Cette route échappe donc au problème d'identifiant décrit en F4 —
c'est le seul endroit du code qui procède ainsi.

Ces règles sont couvertes par **54 tests** dans `tests/orders.test.ts`, `tests/offers.test.ts`
et `tests/products.test.ts`.

## 7. Éléments RGPD visibles dans le code

| Élément | Emplacement |
|---|---|
| Page de politique de confidentialité | `app/privacy/page.tsx` |
| Suppression du compte par l'utilisateur | `app/api/user/route.ts` (DELETE) |
| Suppression en cascade des données liées | `onDelete: Cascade` sur Product, Offer, Like, Message, Order, AdminMessage… (`prisma/schema.prisma`) |
| Conservation de l'historique de modération | `Report` en `onDelete: SetNull` — les signalements survivent à la suppression de la cible |
| Journal des actions d'administration | `lib/adminLog.ts` → table `AdminLog` (action, cible, détails, horodatage) |
| Avertissement « site de démonstration » | `components/PortfolioModal.tsx`, monté globalement dans `app/layout.tsx` et forcé sur `/payment` |
| Minimisation dans les réponses API | `app/api/products/route.ts` : `select: { firstName: true, image: true }` sur le vendeur — ni e-mail ni nom complet exposés |

## 8. Faiblesses constatées

> Section volontairement exhaustive et honnête. Les trois premières ont été **découvertes
> pendant la campagne de tests** ; F1, F2 et F3 ont été corrigées, les suivantes sont
> documentées comme limites connues.

### F1 — Contournement de l'authentification admin quand `ADMIN_TOKEN` est absent (CORRIGÉE)

**Gravité : critique.** Les 18 handlers de `app/api/admin/*` testaient l'accès ainsi :

```ts
if (cookies().get('admin_token')?.value !== process.env.ADMIN_TOKEN) {
  return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
}
```

Si la variable `ADMIN_TOKEN` n'est **pas définie dans l'environnement** et qu'aucun cookie
n'est envoyé, l'expression évaluée est `undefined !== undefined`, soit `false` :
**la garde ne se déclenche pas et l'accès est accordé**. Comme le middleware ne couvre
pas `/api/admin/*`, toute l'API d'administration (liste des utilisateurs, suspension,
remboursement, finances) devenait publique.

Détectée par le test « refuse l'accès lorsque ADMIN_TOKEN n'est pas configuré et qu'aucun
cookie n'est fourni » (`tests/api/admin-users.route.test.ts`), qui échouait avec
`expected 200 to be 403`.

**Correction :** création de `lib/domain/access.ts` → `isValidAdminToken(presented, expected)`
qui refuse explicitement lorsque le secret attendu est vide ou absent, et de
`lib/adminAuth.ts` → `isAdminRequest()`. Les 18 occurrences ont été remplacées.
Couverte par 7 tests supplémentaires dans `tests/access.test.ts`.

### F2 — Suppression d'annonce sans authentification ni contrôle de propriété (CORRIGÉE)

**Gravité : critique.** Le handler `DELETE` de `app/api/items/[id]/route.ts` ne lisait
aucune session : il supprimait directement le produit à partir de l'identifiant d'URL.

```ts
export async function DELETE(request, { params }) {
  const productId = parseInt(params.id, 10)
  if (isNaN(productId)) return … 400
  const deletedProduct = await prisma.product.delete({ where: { id: productId } })
```

N'importe quel visiteur, authentifié ou non, pouvait supprimer l'annonce de n'importe qui
par un simple appel HTTP. La suppression entraînait de surcroît la cascade sur
`ProductImage`, `Offer`, `Message`, `Like` et `Order`.

**Correction :** ajout de la récupération de session et du contrôle `canModifyProduct()`
(401 sans session, 404 si l'annonce n'existe pas, 403 si l'utilisateur n'est pas propriétaire).
Couverte par 5 tests dans `tests/products.test.ts`.

### F3 — Absence de validation à la création d'annonce (CORRIGÉE)

**Gravité : moyenne.** `app/api/items/route.ts` transmettait les champs du formulaire
directement à Prisma, avec `condition as any` et `category as any` :
titre vide accepté, `parseFloat` produisant `NaN` sur un prix non numérique,
valeurs d'énumération non contrôlées (erreur Prisma 500 au lieu d'un 400 explicite).

**Correction :** `validateProductInput()` appliquée en entrée de route, réponse 400 détaillée,
suppression des `as any`, plafonnement du nombre d'images à 5 côté serveur.
Couverte par 24 tests dans `tests/products.test.ts`.
Un `console.log('photosBase64:', …)` qui journalisait le contenu binaire des images
à chaque création a également été supprimé.

### F4 — Identifiant de session incohérent pour les comptes Google

**Gravité : moyenne. Non corrigée — limite assumée.**
Pour un compte Credentials, `session.user.id` est l'identifiant numérique en base.
Pour un compte Google, c'est le `sub` OAuth de Google (`lib/auth.ts`, callback `jwt` :
`token.sub = user.id`). Or les routes font systématiquement `Number(session.user.id)` :
la conversion donne `NaN` pour un utilisateur Google, et toutes les comparaisons de
propriété (`product.userId !== Number(session.user.id)`) deviennent fausses.

Conséquence : un utilisateur connecté via Google ne peut pas gérer ses propres annonces
ni ses commandes. Le contrôle `canModifyProduct()` traite désormais ce cas en renvoyant 401
plutôt qu'un comportement indéfini (test « refuse un identifiant de session non numérique »),
mais **la cause racine reste** : il faudrait faire porter au JWT l'identifiant en base
pour les deux providers.

### F5 — Limitation de débit en mémoire, inopérante en production serverless

**Gravité : moyenne. Non corrigée — limite assumée.**
`lib/rateLimit.ts` stocke ses compteurs dans une `Map` de module. Sur Vercel, chaque
instance de fonction serverless possède sa propre mémoire et les instances sont recyclées :
le compteur est réinitialisé à chaque démarrage à froid et n'est pas partagé entre instances.
La protection anti-force brute du login admin est donc **beaucoup plus faible en production
qu'en développement**. Une implémentation durable exigerait un stockage partagé
(Redis / Upstash, ou une table dédiée).

### F6 — Bouton de signalement visible sans authentification, de façon incohérente

**Gravité : faible.** Sur `app/article/[id]/page.tsx`, la condition d'affichage est
`String(session?.user?.id) !== String(article.userId)` : pour un visiteur anonyme,
la comparaison vaut `"undefined" !== "14"`, donc le bouton s'affiche. Sur
`app/profile/[id]/page.tsx`, la condition est `!isOwnProfile && session`, donc le bouton
est masqué. L'API renvoie bien 401 dans les deux cas (`app/api/reports/route.ts`),
il n'y a donc pas de faille — seulement une incohérence d'expérience utilisateur.

### F7 — Images stockées en base64 sans pagination

**Gravité : faible (disponibilité).** `app/api/products/route.ts` renvoie toutes les annonces
non vendues avec **toutes leurs images** en data-URI base64, sans pagination ni limite.
Le volume de la réponse croît linéairement avec le catalogue ; c'est un vecteur de
saturation mémoire et de coût de transfert. Point de scalabilité principal du projet.

### F8 — `DATABASE_URL` inutilement inscrite dans la configuration de build

**Gravité : faible.** `next.config.mjs` déclare `env: { DATABASE_URL: process.env.DATABASE_URL }`.
Prisma lit déjà cette variable à l'exécution : cette déclaration ne sert à rien et fait
entrer la chaîne de connexion dans le périmètre du bundle de build.

### F9 — Canal Pusher `private-admin` non contrôlé

**Gravité : moyenne. Non corrigée — documentée.**
`app/api/pusher/auth/route.ts` vérifie les canaux `private-conversation-*` et `private-user-*`,
mais la chaîne de conditions ne comporte **pas de branche pour `private-admin`** ni de refus
par défaut : tout canal ne correspondant à aucun préfixe connu tombe directement sur
`pusherServer.authorizeChannel(...)`.

Or `private-admin` reçoit les événements `order-disputed`
(`app/api/orders/[id]/dispute/route.ts`) et `chargeback-created`
(`app/api/stripe/webhook/route.ts`), qui transportent `orderId`, `buyerId`, `sellerId`
et `paymentIntentId`. **Tout utilisateur simplement authentifié peut donc s'y abonner**
et observer en temps réel les litiges et impayés de la plateforme.

Correction recommandée : ajouter une branche explicite pour `private-admin` vérifiant
le cookie `admin_token` via `isAdminRequest()`, et terminer la chaîne par un
`else return 403` (refus par défaut plutôt qu'autorisation par défaut).

### F10 — Vulnérabilités des dépendances (`npm audit` : 50, dont 6 critiques)

**Gravité : variable.** Une seule concerne directement le périmètre de production :

| Paquet | Sévérité | Nature |
|---|---|---|
| `@auth/core` (via `next-auth`) | **critique** | Le normaliseur d'adresse e-mail valide l'adresse **avant** normalisation Unicode, permettant un contournement par homoglyphe du caractère `@` |
| `@auth/prisma-adapter` | critique | Transitive de `@auth/core` |
| `form-data` | haute | Injection CRLF via des noms de champs multipart non échappés |
| `cross-spawn`, `brace-expansion`, `minimatch` | haute | Dénis de service par expression régulière (ReDoS) |
| `js-yaml` | haute | Pollution de prototype via l'opérateur de fusion `<<` |

Les autres proviennent de la chaîne de développement (`@mermaid-js/mermaid-cli` → `puppeteer`,
`@typescript-eslint`, `glob`, `extract-zip`, `basic-ftp`) et ne sont pas exposées en production.

> Note de transparence : la ligne `@vitest/coverage-v8` (critique, « via vitest ») a été
> **introduite par l'ajout de Vitest lors de cette campagne**. Elle concerne exclusivement
> l'outillage de développement.

**Recommandation pour le dossier :** la mise à jour de `next-auth` vers une version
intégrant le correctif `@auth/core` est l'action de veille prioritaire.

## 9. Ce qui n'est pas mis en place

| Mécanisme absent | Conséquence |
|---|---|
| Protection CSRF explicite sur les routes API | Atténuée par `sameSite: 'strict'` sur le cookie admin et par les JWT NextAuth, mais non traitée en propre |
| En-têtes de sécurité (CSP, HSTS, X-Frame-Options) | Aucun `headers()` dans `next.config.mjs` ; seuls les défauts Vercel s'appliquent |
| Réinitialisation de mot de passe | Routes `app/api/auth/forgot-password/` et `reset-password/` **vides** — voir `99_manques.md` |
| Vérification d'adresse e-mail | Colonne `emailVerified` présente au schéma mais jamais alimentée |
| Analyse de dépendances automatisée (CI) | Aucun pipeline ; `npm audit` doit être lancé manuellement |
| Validation des variables d'environnement au démarrage | Une variable mal nommée (cas réel : `GOOGLE_ID` en production contre `GOOGLE_CLIENT_ID` attendu par le code) échoue silencieusement |
