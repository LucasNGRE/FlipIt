# 04 — Historique Git et gestion de projet

> Relevé au 28 août 2026 sur le dépôt `github.com/LucasNGRE/FlipIt`.

## 1. Chiffres clés

| Indicateur | Valeur |
|---|---|
| Premier commit | **3 septembre 2024** (« Readme ») |
| Dernier commit sur `main` | **5 juin 2026** (`0019db1`) |
| Nombre total de commits | **175** |
| Durée du projet | ~21 mois, en trois campagnes distinctes |
| Branche par défaut | `main` |

## 2. Branches

| Branche | Nature |
|---|---|
| `main` | Branche de production, déployée par Vercel |
| `dev` | Branche d'intégration utilisée pendant la phase 2024 |
| `lucas` | Branche personnelle (développeur 1) |
| `hadrien` | Branche personnelle (développeur 2) |
| `tests` | Branche d'essai |
| `tests/dossier-cda` | Branche locale créée pour la campagne de tests (août 2026) |

Le projet a donc été mené **à deux développeurs** sur la première phase, avec un modèle
de branches par personne convergeant vers `dev` puis `main` — visible dans les commits
de fusion `Merge branch 'lucas' into dev` et `Merge branch 'hadrien' into dev` (novembre 2024).
Les phases 2025 et 2026 sont l'œuvre d'un seul contributeur, directement sur `main`.

## 3. Répartition des commits dans le temps

| Période | Commits | Nature dominante |
|---|---:|---|
| 2024-09 | 46 | Amorçage, modèle de données, authentification, premières pages |
| 2024-10 | 69 | Cœur fonctionnel : annonces, API produits, page d'accueil, messagerie |
| 2024-11 | 15 | Finitions d'interface, landing page, README |
| 2024-12 → 2025-02 | 0 | **Interruption** |
| 2025-03 | 28 | Mise en production : adaptation à Vercel, migrations de base |
| 2025-04 | 1 | Correctif isolé |
| 2025-05 → 2026-03 | 0 | **Interruption longue (11 mois)** |
| 2026-04 | 5 | Reprise : messagerie temps réel, profils, correctifs Prisma/Vercel |
| 2026-05 | 9 | Administration, modération, litiges, responsive |
| 2026-06 | 2 | Formulaires de connexion, composant Marquee |
| 2026-08 | (branche dédiée) | Campagne de tests et documentation du dossier |

## 4. Chronologie reconstituée par phases

### Phase 1 — Amorçage et modèle de données (sept. 2024)

Mise en place du projet Next.js, du schéma Prisma initial et de l'authentification.
Le modèle de données de départ était différent de l'actuel : il reposait sur des entités
`Item`, `cartItem` et `orderItem` avec une logique de panier, comme en atteste le commit
du 19 septembre 2024 :

> *« added fields for the negotiation price, original price and a boolean if the item is
> negociable in models Item cartItem and orderItem »*

La négociation de prix était donc pensée dès l'origine, mais portée par le modèle produit
lui-même avant d'être extraite dans une entité `Offer` dédiée.

Travaux : design des pages `register` / `login`, mise au `.gitignore` du `.env`,
premiers écrans.

### Phase 2 — Cœur fonctionnel (oct. – nov. 2024)

Mois le plus dense du projet (69 commits en octobre). Construction de l'API produits
(`api/products/create`), de la page d'accueil avec carrousel et tri par date de création,
des règles d'affichage selon la propriété de l'annonce
(*« removed message and acheter on products owned by the logged in user »*, 17 octobre),
et nettoyage des routes API devenues inutiles (16 octobre).

C'est aussi la phase des **trois seules migrations Prisma** du projet
(9 et 14 octobre 2024). Toutes les évolutions ultérieures du schéma passeront par
`prisma db push`, sans migration versionnée — point relevé dans `99_manques.md`.

Novembre : landing page, section « Plus de 100 euros », harmonisation des cartes de
paramètres utilisateur, rédaction du README. Fusions `lucas` → `dev` et `hadrien` → `dev`.

### Phase 3 — Mise en production (mars 2025)

Campagne de 28 commits sur une seule journée (21 mars 2025), consacrée au déploiement.
La séquence des messages raconte une mise en production laborieuse, par essais successifs :
tentative sur Railway (« deploy the db on railway »), puis bascule vers Vercel avec
adaptation route par route (`api/user`, `api/article`, `api/message`, `conversation/route.ts`),
ajustement du `tsconfig`, du `package.json`, ajout puis suppression du `vercel.json`
pour forcer l'usage de `bcryptjs` plutôt que `bcrypt` (incompatible avec l'environnement
serverless), et un retour arrière assumé (« return to an oldest version »).

C'est la phase la moins soignée du dépôt en matière de messages de commit
(« modify », « test », « modify this page »), mais la plus instructive sur les
contraintes réelles d'un déploiement serverless : binaires natifs proscrits,
runtime Edge incompatible avec Prisma, routes à rendre dynamiques.

### Phase 4 — Temps réel et refonte (avril 2026)

Reprise après onze mois d'interruption, avec des messages de commit structurés :

- `feat: real-time messaging, chat UI redesign, profile pages` — messagerie Pusher,
  refonte du chat, pages de profil ;
- `fix: add Prisma binaryTargets for Vercel Linux runtime` — ajout des cibles binaires
  `rhel-openssl-1.0.x` et `rhel-openssl-3.0.x` au générateur Prisma ;
- `remove edge runtime incompatible with Prisma` ;
- `fix: trustHost NextAuth v5 + seed script` ;
- `allow unsplash and google images in Next.js config`.

### Phase 5 — Administration, modération et paiement (mai 2026)

Phase la plus riche fonctionnellement :

- *« admin dashboard, reports, chargebacks, portfolio modal, rate limiting »* (27 mai) —
  arrivée du panel d'administration complet, des signalements, des litiges Stripe,
  de la modal d'avertissement portfolio et de la limitation de débit ;
- `fix: cron daily schedule for Vercel Hobby plan` — le cron de confirmation automatique
  a dû être ramené à une exécution quotidienne, seule fréquence autorisée par le plan
  gratuit de Vercel ;
- `fix: force-dynamic on all admin routes and api/products` puis
  `fix: force-dynamic on all dynamic API routes` — résolution des erreurs de génération
  statique au build ;
- `fix: build errors - stripe api version, suspense, dynamic routes` ;
- `Huge work on responsive` (28 mai) — adaptation mobile de l'ensemble de l'interface ;
- `feat: report grouping, product suspension, persistent report state` — regroupement
  des signalements par cible et suspension d'annonces ;
- `fix: replace spread Set with Array.from for TS compat`.

### Phase 6 — Finitions (juin 2026)

- `feat: enhance login and registration forms with Google sign-in, password visibility
  toggle, and validation rules` ;
- `feat: implement Marquee component and update animations for improved performance`.

### Phase 7 — Qualité et documentation (août 2026, branche `tests/dossier-cda`)

Mise en place de l'outillage de test, extraction de la logique métier en modules purs,
écriture de 141 tests, correction de trois défauts découverts par ces tests
(dont deux failles critiques), et constitution du présent dossier de sources.

## 5. Conventions de commits observées

Le dépôt présente **deux régimes nettement distincts** :

| Période | Convention | Exemples |
|---|---|---|
| 2024 – mars 2025 | Aucune convention. Messages libres, souvent en anglais approximatif, parfois non descriptifs | « modify », « test », « updated files », « pushing changes before pull », « modifu the video from the landing page » |
| Avril 2026 → | **Conventional Commits** (`type: description`) | `feat: real-time messaging…`, `fix: trustHost NextAuth v5…`, `chore: trigger vercel deployment` |

Répartition des préfixes conventionnels sur l'ensemble de l'historique :

| Préfixe | Occurrences |
|---|---:|
| `fix:` | 15 |
| `feat:` | 4 |
| `test:` | 2 |
| `chore:` | 1 |
| Sans préfixe | 153 |

**Lecture pour le dossier.** Cette évolution est un indicateur de montée en maturité du
projet et peut être présentée comme telle : la phase 2024 relève d'un travail
d'apprentissage à deux, sans processus formalisé ; la reprise de 2026 adopte une
convention de nommage, des messages descriptifs et une séparation nette entre
fonctionnalités et correctifs. La prédominance de `fix:` sur `feat:` dans la seconde
période reflète une phase de stabilisation plutôt que de construction.

## 6. Ce que l'historique ne montre pas

À signaler honnêtement dans le dossier, car un jury peut le relever :

- **Aucune pull request** : les fusions sont locales (`git merge`), il n'y a pas de trace
  de revue de code entre pairs.
- **Aucun tag ni release** : les versions successives ne sont pas jalonnées.
- **Aucun outil de suivi de tickets** rattaché au dépôt (pas de référence `#123` dans
  les messages, pas d'issues GitHub liées).
- **Aucune intégration continue** : pas de `.github/workflows`, donc aucune vérification
  automatique déclenchée par les commits.
- Les deux interruptions longues (déc. 2024 – févr. 2025, puis mai 2025 – mars 2026)
  correspondent à des périodes sans activité sur le dépôt.
