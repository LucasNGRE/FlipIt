# 06 — Environnement, configuration et déploiement

> **Aucune valeur secrète ne figure dans ce document.** Seuls les **noms** des variables
> d'environnement sont listés, tels que lus par le code source.

## 1. Variables d'environnement

### 1.1 Variables réellement lues par le code

Relevé par recherche de `process.env.*` dans `app/`, `lib/`, `components/` et `middleware.ts`,
complété par les variables lues implicitement par les bibliothèques (Prisma, NextAuth).

| Variable | Lue par | Rôle |
|---|---|---|
| `DATABASE_URL` | `prisma/schema.prisma` (datasource) | Chaîne de connexion PostgreSQL |
| `AUTH_SECRET` | `next-auth` (implicite) | Clé de signature des JWT de session |
| `NEXTAUTH_URL` | `next-auth` | URL canonique de l'application |
| `GOOGLE_CLIENT_ID` | `lib/auth.ts` | Identifiant client OAuth Google |
| `GOOGLE_CLIENT_SECRET` | `lib/auth.ts` | Secret client OAuth Google |
| `STRIPE_SECRET_KEY` | `lib/stripe.ts` | Clé serveur Stripe (mode test) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | composants de paiement | Clé publique Stripe (exposée au navigateur) |
| `STRIPE_WEBHOOK_SECRET` | `app/api/stripe/webhook/route.ts` | Secret de vérification de signature du webhook |
| `PUSHER_APP_ID` | `lib/pusher-server.ts` | Identifiant de l'application Pusher |
| `PUSHER_KEY` | `lib/pusher-server.ts` | Clé Pusher côté serveur |
| `PUSHER_SECRET` | `lib/pusher-server.ts` | Secret Pusher côté serveur |
| `PUSHER_CLUSTER` | `lib/pusher-server.ts` | Cluster Pusher côté serveur |
| `NEXT_PUBLIC_PUSHER_KEY` | `lib/pusher-client.ts` | Clé Pusher exposée au navigateur |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | `lib/pusher-client.ts` | Cluster Pusher exposé au navigateur |
| `ADMIN_PASSWORD` | `app/api/admin/auth/route.ts` | Mot de passe saisi sur `/admin/login` |
| `ADMIN_TOKEN` | `middleware.ts`, `lib/adminAuth.ts` | Valeur placée dans le cookie `admin_token` et comparée à chaque requête |
| `CRON_SECRET` | `app/api/cron/auto-confirm/route.ts` | Jeton attendu en `Authorization: Bearer <valeur>` |
| `NODE_ENV` | plusieurs | Bascule production / développement (attribut `secure` du cookie, singleton Prisma, mode debug NextAuth) |

Le préfixe `NEXT_PUBLIC_` signale les variables **volontairement exposées au navigateur** :
elles ne doivent contenir que des valeurs publiques (clé publiable Stripe, clé cliente Pusher).

### 1.2 Incohérences de nommage constatées

| Constat | Conséquence |
|---|---|
| Le fichier `.env` (production) déclare `GOOGLE_ID` et `GOOGLE_SECRET`, alors que `lib/auth.ts` lit `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` | La connexion Google échoue silencieusement si Vercel reprend ces noms |
| `RESEND_API_KEY` figure dans `.env.local` | Aucun code ne l'utilise ; vestige d'une fonctionnalité d'e-mail non implémentée |
| `.env` ne contient ni clés Stripe, ni `ADMIN_PASSWORD` / `ADMIN_TOKEN`, ni `CRON_SECRET` | Ces variables doivent impérativement être définies dans le tableau de bord Vercel. `ADMIN_TOKEN` manquant a des conséquences de sécurité : voir F1 dans `03_securite.md` |
| Aucune validation des variables au démarrage | Une variable absente ou mal nommée ne produit aucune erreur explicite |

### 1.3 Fichier `.env` d'exemple à fournir

Le dépôt ne contient **pas** de `.env.example`. Voici le gabarit à créer
(noms uniquement, valeurs à renseigner) :

```env
# Base de données
DATABASE_URL=postgresql://UTILISATEUR:MOT_DE_PASSE@HOTE/BASE?sslmode=require

# NextAuth v5
AUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Stripe (mode test)
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Pusher
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=
NEXT_PUBLIC_PUSHER_KEY=
NEXT_PUBLIC_PUSHER_CLUSTER=

# Administration
ADMIN_PASSWORD=
ADMIN_TOKEN=

# Cron Vercel
CRON_SECRET=
```

Génération d'un secret : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

## 2. Double environnement de base de données

Le projet utilise **deux bases PostgreSQL distinctes hébergées sur Neon**, toutes deux
dans la région `eu-west-2` (AWS Londres), base `neondb` :

| Environnement | Fichier | Point de terminaison Neon |
|---|---|---|
| **Production** (Vercel) | `.env` | `ep-winter-field-ab5ly6pv.eu-west-2.aws.neon.tech` |
| **Développement local** | `.env.local` | `ep-tiny-violet-abonxi1v-pooler.eu-west-2.aws.neon.tech` |

Le point de terminaison local est en mode **poolé** (suffixe `-pooler`, PgBouncer) ;
la production utilise le point de terminaison direct.

### 2.1 Priorité de chargement — piège à connaître

Next.js charge `.env.local` **en priorité sur** `.env`. En développement, l'application
travaille donc bien sur la base de développement.

**En revanche, la CLI Prisma ne suit pas cette règle** : `prisma db push`, `prisma migrate`
et `prisma studio` lisent `.env` par défaut, c'est-à-dire **la base de production**.
Exécuter `npx prisma db push` sans précaution modifie donc le schéma de la base de production.

### 2.2 Procédure pour cibler explicitement la base de développement

```powershell
# PowerShell — surcharge de la variable pour la durée de la commande
$env:DATABASE_URL = "<URL figurant dans .env.local>"
npx prisma db push --skip-generate
```

```bash
# Bash — équivalent
DATABASE_URL="<URL figurant dans .env.local>" npx prisma db push --skip-generate
```

Les deux fichiers `.env` et `.env.local` sont bien exclus du dépôt par
`my-app/.gitignore` (règles `.env` et `.env*.local`) : **aucun secret n'est versionné**,
ce qui a été vérifié par `git ls-files | grep env` (aucun résultat).

## 3. Installation du projet depuis zéro

Procédure vérifiée contre `package.json` et l'état réel du dépôt.

```bash
# 1. Récupérer le code
git clone https://github.com/LucasNGRE/FlipIt.git
cd FlipIt/my-app          # ATTENTION : l'application est dans le sous-dossier my-app

# 2. Installer les dépendances (Node 20+ requis ; testé sur Node 24.11.1, npm 11.6.2)
npm install

# 3. Créer le fichier d'environnement
#    Copier le gabarit du §1.3 dans un fichier .env.local et renseigner les valeurs

# 4. Créer le schéma dans la base de développement
$env:DATABASE_URL = "<URL de .env.local>"     # PowerShell
npx prisma db push --skip-generate

# 5. Générer le client Prisma
npx prisma generate

# 6. (Optionnel) Injecter un jeu de données de démonstration
npx prisma db seed

# 7. Lancer le serveur de développement
npm run dev                                    # http://localhost:3000

# 8. Lancer les tests
npm test                                       # 141 tests, aucun accès réseau ni base
```

### Écarts avec le README du dépôt

Le `README.md` présent dans le dépôt est **obsolète** et induirait en erreur :

| Affirmation du README | Réalité |
|---|---|
| « The database has not been migrated to the cloud… use your own local PostgreSQL instance » | La base est hébergée sur Neon depuis mars 2025 |
| `npx prisma migrate dev` | L'historique de migrations est figé à octobre 2024 et a divergé du schéma : cette commande détecterait une dérive. La procédure réelle est `prisma db push` |
| Le `.env` est « in the root directory » | Il se trouve dans `my-app/`, pas à la racine du dépôt |
| Fonctionnalités listées : « Shopping cart and checkout process » | Il n'y a pas de panier : l'achat se fait annonce par annonce |
| Aucune mention de Stripe, Pusher, du panel d'administration ni des variables d'environnement | Ces briques constituent pourtant l'essentiel du projet actuel |

Le README date de novembre 2024 (commits « add a readme », « Update README.md ») et n'a pas
été actualisé depuis. À reprendre — voir `99_manques.md`.

## 4. Contraintes connues de l'environnement de développement

| Contrainte | Détail |
|---|---|
| **Build sous Windows** | `npm run build` exécute `prisma generate`, qui réécrit le client dans `node_modules`. Le serveur de développement verrouille la DLL du moteur Prisma : il doit être **arrêté avant tout build**, sous peine d'échec `EPERM`. |
| **Binaires natifs bloqués** | La stratégie de contrôle d'application de Windows 11 bloque le chargement de certains `.node` (constaté sur `@rollup/rollup-win32-x64-msvc`). Contournement retenu : alias `"rollup": "npm:@rollup/wasm-node@^4.63.1"` en `devDependencies`. |
| **Cibles binaires Prisma** | `schema.prisma` déclare `binaryTargets = ["native", "rhel-openssl-1.0.x", "rhel-openssl-3.0.x"]` : les deux dernières sont indispensables au runtime Linux de Vercel. |
| **`bcryptjs` et non `bcrypt`** | `bcrypt` embarque un binaire natif incompatible avec l'environnement serverless. L'implémentation pure JavaScript `bcryptjs` a été retenue (visible dans l'historique de mars 2025). |
| **Runtime Edge proscrit** | Prisma n'est pas compatible avec le runtime Edge de Next.js ; les routes utilisent le runtime Node.js (commit « remove edge runtime incompatible with Prisma »). |
| **Routes forcées en dynamique** | La plupart des routes API déclarent `export const dynamic = 'force-dynamic'` pour empêcher la génération statique au build, qui échouerait faute de base accessible. |

## 5. Déploiement

### 5.1 Configuration Vercel

Le projet est lié au projet Vercel `my-app` (fichier `my-app/.vercel/project.json`,
non versionné). L'application se trouvant dans le sous-dossier `my-app/`, le paramètre
**Root Directory** du projet Vercel doit pointer sur `my-app`.

Commande de build exécutée par Vercel : `npm run build`, soit `prisma generate && next build`.

### 5.2 Contenu de `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/auto-confirm",
      "schedule": "0 8 * * *"
    }
  ]
}
```

Une seule tâche planifiée : la confirmation automatique des commandes, tous les jours
à 08:00 UTC. La fréquence quotidienne n'est pas un choix fonctionnel mais une contrainte
du plan gratuit Vercel (commit `fix: cron daily schedule for Vercel Hobby plan`).
**Conséquence à assumer :** une commande dont l'échéance de 48 h tombe à 08:05 ne sera
confirmée automatiquement que 24 h plus tard.

### 5.3 Configuration Next.js (`next.config.mjs`)

```js
const nextConfig = {
  reactStrictMode: false,
  eslint: { ignoreDuringBuilds: true },
  env: { DATABASE_URL: process.env.DATABASE_URL },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
}
```

Trois points à commenter dans le dossier :

- `eslint: { ignoreDuringBuilds: true }` **désactive l'analyse ESLint au build** : aucune
  erreur de lint ne peut faire échouer un déploiement. C'est précisément pourquoi
  `npm run lint` doit être exécuté séparément.
- `reactStrictMode: false` désactive le mode strict de React (double rendu de détection
  d'effets de bord en développement).
- `env: { DATABASE_URL }` est inutile — Prisma lit la variable à l'exécution — et fait
  entrer la chaîne de connexion dans le périmètre du build (voir F8 dans `03_securite.md`).

`remotePatterns` autorise le composant `next/image` à charger des images depuis Unsplash
(données de démonstration) et depuis les avatars Google (`lh3.googleusercontent.com`).
Les images d'annonces, stockées en base64 dans la base, ne passent pas par ce mécanisme.

### 5.4 Chaîne de déploiement actuelle

| Étape | État |
|---|---|
| Intégration continue | **Aucune** — pas de `.github/workflows` |
| Tests automatiques au push | **Aucun** |
| Analyse de lint bloquante | **Aucune** (désactivée au build) |
| Déploiement | Vercel, à partir du dépôt Git |
| Migrations de base au déploiement | **Aucune** — le build n'exécute pas `prisma migrate deploy` ; les évolutions de schéma sont appliquées manuellement |
| Variables d'environnement | Définies dans le tableau de bord Vercel, hors dépôt |

Le point le plus fragile est l'absence d'application automatique des migrations :
une modification de `schema.prisma` poussée sur `main` produit un client Prisma régénéré
qui ne correspond plus à la base de production, sans que le build n'échoue. L'erreur
n'apparaît qu'à l'exécution. Voir `99_manques.md`.
