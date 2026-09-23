# 99 — Manques, dette technique et recommandations

> Ce fichier recense **ce qui n'existe pas dans le dépôt** mais qui est attendu par le
> référentiel CDA (TP-01281) ou par une lecture critique du projet. Chaque entrée précise
> ce qui manque, pourquoi c'est attendu, et une recommandation : **à produire** avant de
> rendre le dossier, ou **à assumer comme limite** en le documentant honnêtement.

---

## A. Documents et livrables attendus par le référentiel

### A1 — Maquettes et travail de conception d'interface

**État : ABSENT du dépôt.** Aucun fichier de maquette (Figma, Adobe XD, image, PDF),
aucune wireframe, aucun dossier `design/` ou `maquettes/`. Le seul artefact visuel versionné
est `my-app/public/flipit.png`, une capture d'écran utilisée dans le README.

**Pourquoi c'est attendu.** L'activité type 2 du référentiel (« Concevoir et développer la
partie front-end d'une application ») demande de démontrer le maquettage d'une interface
et la prise en compte de la charte graphique et de l'accessibilité.

**Recommandation : à produire.** Deux options :

1. **Reconstituer a posteriori** 3 à 4 maquettes des écrans principaux (accueil, fiche
   annonce, formulaire de création, messagerie) à partir de l'existant, en assumant dans
   le dossier qu'elles ont été formalisées après coup pour documenter le projet.
2. **Documenter le design system réellement en place** à la place des maquettes : les
   variables CSS de `app/globals.css` (`--ink`, `--acid`, `--paper`, `--snow`,
   `--concrete-3`, `--concrete-4`, rayons `--r-lg`, `--r-xl`), les quatre polices
   (Inter, Bricolage Grotesque, Space Mono, Anton) et la bibliothèque de composants
   shadcn/ui. C'est factuel et vérifiable, contrairement à une maquette antidatée.

L'option 2 est plus honnête et plus solide en soutenance ; l'option 1 la complète bien.

### A2 — Diagrammes UML

**État : PARTIEL.** Le dépôt contient `my-app/ERD/diagram.svg` (entité-association) et
`my-app/prisma/schema.mmd` (schéma Mermaid). Il manque :

| Diagramme | État | Source disponible |
|---|---|---|
| Cas d'utilisation | Absent | Matière complète en `07_ui_parcours.md` §6 (4 acteurs, ~50 cas) |
| Séquence | Absent | À produire sur le tunnel de paiement ou le cycle de commande |
| Classes | Absent | Dérivable du schéma Prisma (`01_schema_bdd.md`) |
| Entité-association | **Présent** | `ERD/diagram.svg` |
| Modèle physique de données | **Présent** | Tableau récapitulatif en `01_schema_bdd.md` §1 |

**Recommandation : à produire.** Le diagramme de cas d'utilisation et un diagramme de
séquence sont attendus. Le meilleur candidat pour la séquence est le **paiement avec
séquestre** : navigateur → `POST /api/stripe/payment-intent` → Stripe → webhook
`payment_intent.succeeded` → création de l'`Order` → notification Pusher au vendeur →
expédition → confirmation → `stripe.transfers.create`. Il fait intervenir cinq acteurs
techniques et illustre bien la complexité réelle du projet.

### A3 — Spécifications fonctionnelles et cahier des charges

**État : ABSENT.** Aucun document de spécification, aucun backlog, aucune user story
formalisée dans le dépôt.

**Pourquoi c'est attendu.** Le dossier demande de présenter le contexte du projet, les
besoins et la démarche de conception.

**Recommandation : à produire**, en s'appuyant sur `07_ui_parcours.md` §6 qui contient
déjà les cas d'utilisation dérivés du code réel — donc vérifiables, contrairement à des
spécifications réécrites de mémoire.

### A4 — Gestion de projet et suivi

**État : ABSENT.** Aucun outil de suivi rattaché au dépôt : pas d'issues GitHub, pas de
pull request, pas de tableau Kanban, pas de tags de version, aucune référence de ticket
dans les messages de commit.

**Recommandation : à assumer comme limite**, en s'appuyant sur ce qui existe réellement :
le modèle de branches par développeur (`lucas`, `hadrien` → `dev` → `main`) documenté en
`04_git_historique.md`, les 175 commits répartis en 7 phases, et l'adoption des
Conventional Commits à partir d'avril 2026. Présenter cette évolution comme une montée
en maturité est plus crédible que de reconstituer un backlog fictif.

### A5 — Jeu d'essai documenté

**État : PARTIEL.** `my-app/prisma/seed.ts` existe et crée 5 utilisateurs et des produits,
mais les données sont **écrites en dur** dans le fichier — alors que `@faker-js/faker` est
déclaré en dépendance et jamais importé.

**Recommandation : à assumer**, en documentant le jeu de données du seed comme jeu d'essai.
Le fichier est lisible et suffit à illustrer la compétence.

---

## B. Fonctionnalités annoncées mais non implémentées

### B1 — Réinitialisation de mot de passe

**État : NON IMPLÉMENTÉE — dossiers vides supprimés le 28/08/2026.**

> Les dossiers `forgot-password/` et `reset-password/` ont été retirés du dépôt, ainsi que
> la clé `RESEND_API_KEY` inutilisée. La fonctionnalité est désormais présentée en
> perspective d'évolution plutôt qu'en chantier inachevé. Description conservée ci-dessous.

**État initial :** Les dossiers `app/api/auth/forgot-password/` et
`app/api/auth/reset-password/` existent mais **ne contiennent aucun fichier `route.ts`**.
Une clé `RESEND_API_KEY` figure dans `.env.local`, mais aucune bibliothèque d'envoi
d'e-mail n'est installée et aucun code ne lit cette variable.

**Impact.** Un utilisateur ayant perdu son mot de passe n'a aucun moyen de récupérer son
compte. Sur une marketplace avec des paiements, c'est une lacune fonctionnelle notable.

**Recommandation : arbitrage à faire.**
- Si le temps le permet : l'implémenter est un bon sujet de démonstration (jeton à durée
  limitée, envoi d'e-mail, invalidation après usage) et comblerait un manque visible.
- Sinon : **supprimer les deux dossiers vides et la clé `RESEND_API_KEY`** avant de rendre
  le dossier, et mentionner la fonctionnalité en perspective d'évolution. Laisser des
  dossiers vides dans le dépôt donne l'impression d'un travail inachevé plutôt que d'un
  périmètre assumé.

### B2 — Vérification d'adresse e-mail

**État : ABSENT.** La colonne `User.emailVerified` existe au schéma Prisma mais n'est
jamais alimentée par le code. N'importe quelle adresse, valide ou non, permet de créer un
compte.

**Recommandation : à assumer**, en le citant comme évolution, au même titre que B1.

### B3 — Notifications par e-mail

**État : ABSENT.** Aucune notification e-mail : ni confirmation de commande, ni alerte
d'expédition, ni message de modération. Toutes les notifications passent par Pusher
(temps réel, donc uniquement si l'utilisateur est connecté au moment de l'événement) ou
par la table `AdminMessage` consultable dans l'application.

**Recommandation : à assumer**, en expliquant le choix : Pusher couvre le besoin temps réel,
l'e-mail transactionnel n'a pas été jugé prioritaire pour un projet de démonstration.

---

## C. Défauts du code à corriger ou à documenter

### C1 — Identifiant de session incohérent pour les comptes Google

**Gravité : élevée. État : CORRIGÉ le 28/08/2026.**

> `resolveTokenSubject()` (`lib/domain/session.ts`) résout désormais l'identifiant en base
> par e-mail pour les connexions Google, et conserve tel quel celui des connexions par
> identifiants. 21 tests ajoutés. Description du défaut conservée ci-dessous.

`lib/auth.ts` place `token.sub = user.id` : pour un compte Credentials c'est l'identifiant
numérique en base, pour un compte Google c'est le `sub` OAuth. Or toutes les routes font
`Number(session.user.id)`, qui vaut `NaN` pour un utilisateur Google. **Un utilisateur
connecté via Google ne peut donc pas gérer ses annonces ni ses commandes.**

Seule exception : `app/api/pusher/auth/route.ts`, qui résout l'utilisateur par e-mail et
fonctionne correctement dans les deux cas — ce qui montre la solution à généraliser.

**Recommandation : à corriger si le temps le permet.** Dans le callback `jwt`, récupérer
l'identifiant en base à partir de l'e-mail pour les connexions Google et le placer dans le
jeton. C'est une correction ciblée avec un impact fonctionnel fort. Si elle n'est pas faite,
**il faut absolument la documenter** : un jury qui testera la connexion Google la découvrira.

### C2 — Page `/Item_summary/[id]` avec une URL en dur

**Gravité : moyenne. État : SUPPRIMÉE le 28/08/2026** (aucun lien n'y menait).
`app/Item_summary/[id]/page.tsx` appelle `fetch('http://localhost:3000/api/items/…')`.
La page est cassée en production. Le nom du dossier viole en outre la convention de nommage
du reste du projet.

**Recommandation : supprimer la page** si elle n'est plus utilisée (aucun lien du reste de
l'application n'y mène), ou corriger l'appel en chemin relatif.

### C3 — Page `/items` fantôme

**Gravité : faible. État : NON CORRIGÉ.**
`app/items/page.tsx` retourne littéralement `<div>page</div>`. Route publiquement
accessible affichant un contenu vide.

**Recommandation : supprimer.**

### C4 — Absence de validation sur `PUT /api/items/[id]`

**Gravité : moyenne. État : NON CORRIGÉ.**
La création d'annonce valide désormais ses entrées (`validateProductInput`), mais la
**modification** ne valide rien : prix négatif accepté, titre vide accepté, et
`images.map()` lève une exception si `images` n'est pas un tableau (500 au lieu de 400).
Incohérence directe avec la route de création.

**Recommandation : à corriger** — la fonction de validation existe déjà, il suffit de
l'appliquer. Correction de quelques lignes, cohérence immédiate.

### C5 — Canal Pusher `private-admin` non contrôlé

**Gravité : moyenne. État : NON CORRIGÉ.** Détaillé en F9 de `03_securite.md`.
Tout utilisateur authentifié peut s'abonner au canal `private-admin` et recevoir les
événements de litige et d'impayé (avec `orderId`, `buyerId`, `sellerId`, `paymentIntentId`).

**Recommandation : à corriger** — ajouter une branche explicite pour `private-admin` et
terminer la chaîne de conditions par un refus par défaut plutôt qu'une autorisation
par défaut.

### C6 — Limitation de débit inopérante en production serverless

**Gravité : moyenne. État : NON CORRIGÉ — limite structurelle.**
`lib/rateLimit.ts` stocke ses compteurs en mémoire de processus. Sur Vercel, chaque instance
de fonction a sa propre mémoire et les instances sont recyclées : la protection anti-force
brute est bien plus faible en production qu'en développement.

**Recommandation : à assumer comme limite documentée.** C'est un excellent sujet de
discussion en soutenance : expliquer pourquoi une `Map` en mémoire fonctionne en
développement et échoue en serverless, et ce qu'il faudrait (Redis / Upstash, ou une table
dédiée) démontre une compréhension réelle de l'architecture de déploiement.

### C7 — Encodage corrompu dans les messages d'erreur

**Gravité : cosmétique. État : NON CORRIGÉ.**
`app/api/admin/products/route.ts` contient des chaînes mal encodées : `'AccÃ¨s refusÃ©'`
au lieu de `'Accès refusé'` (double encodage UTF-8), et le fichier commence par un BOM.

**Recommandation : à corriger** — visible par un jury qui lit le code, coût nul.

### C8 — `DATABASE_URL` exposée dans la configuration de build

**Gravité : faible. État : NON CORRIGÉ.** Détaillé en F8 de `03_securite.md`.

**Recommandation : à corriger**, mais dans une modification isolée et vérifiée sur un
déploiement de prévisualisation avant de toucher à la production.

---

## D. Dette technique et code mort

### D1 — Composants et routes jamais référencés

Vérifié par recherche d'imports dans l'ensemble du code applicatif :

| Élément | Nature |
|---|---|
| `components/TestButtonApi.tsx` | Composant de test |
| `components/FooterBanner.tsx` | Composant abandonné |
| `components/Articles/CheapItems.tsx` | Composant abandonné |
| `components/Articles/ExpensiveItems.tsx` | Composant abandonné |
| `components/ui/homepage-carousel.tsx` | Composant abandonné |
| `components/chat/chat-component.tsx` | Ancienne messagerie, remplacée par `MessageThread` |
| `components/chat/conversation-list.tsx` | Doublon minuscule de `ConversationList.tsx` |
| `app/api/conversation/route.ts` | Ancienne API de conversation |
| `app/api/conversation/[userId]/route.ts` | Ancienne API de conversation |
| `app/api/messages/route.ts` | Ancienne API de messages — **de plus, elle ne vérifie aucune session** : elle accepte un `senderId` fourni par le client et crée un message en son nom |
| `app/landing-page/page.tsx` | Page d'accueil alternative non reliée (488 lignes) |
| `prisma-heroku/` | Dossier vide |
| `infos.txt` | Notes d'installation obsolètes (mentionnent multer et PostgreSQL local) |

> **Point de vigilance sur `app/api/messages/route.ts` :** bien que non appelée par
> l'interface, cette route restait **déployée et accessible publiquement**. Elle permettait
> de créer un message au nom de n'importe quel utilisateur en passant simplement son
> `senderId` dans le corps de la requête. La supprimer était une correction de sécurité,
> pas seulement du nettoyage.

**État : TRAITÉ le 28/08/2026.** L'ensemble de ces éléments a été supprimé, ainsi que
`app/Item_summary/` (page cassée) et les dossiers vides `forgot-password/` et
`reset-password/`. Chaque suppression a été précédée d'une recherche de références
(imports, `fetch`, `href`, configuration) : aucune n'a été trouvée. Détail complet en
`00_inventaire.md` §9.

`prisma-heroku` s'est révélé n'être pas un dossier vide mais un **gitlink de sous-module
orphelin** (mode `160000`) pointant vers un commit inaccessible, sans `.gitmodules`.

Effet mesuré : 45 → 38 composants, 50 → 47 routes API, 17 431 → 16 791 lignes de code.

### D2 — Dépendances déclarées mais jamais importées

**État : TRAITÉ le 28/08/2026.** Désinstallation de `talkjs`, `@talkjs/react`, `multer`,
`formidable`, `next-connect`, `@tabler/icons-react`, `@faker-js/faker`,
`@auth/prisma-adapter`, `babel-eslint`, `@babel/eslint-parser`, `@babel/core`,
`@babel/preset-react`, `@types/multer`, `@types/formidable`, `@types/uuid`.
`@types/canvas-confetti` déplacé en `devDependencies`.

Résultat : 51 → 41 dépendances de production, et `npm audit` passe de **50 à 47**
vulnérabilités (critiques 6 → 5). Détail en `00_inventaire.md` §5 et §8.

> **Reste à arbitrer :** `framer-motion` et `react-intersection-observer` ne sont plus
> importés nulle part depuis la suppression de `app/landing-page/`, qui était leur unique
> point d'usage. Ils ont été conservés volontairement — leur retrait est une décision
> à prendre selon que ces bibliothèques doivent resservir pour des animations.

### D3 — Modèle `Transaction` quasi inutilisé

La table `Transaction` existe au schéma avec ses trois relations, mais le seul code qui la
touche est `prisma.transaction.count()` dans `app/api/stats/route.ts`. Aucune transaction
n'est jamais créée : c'est le modèle `Order` qui porte l'historique des ventes.

**Recommandation : à assumer et à expliquer** — vestige de la première modélisation
(phase 2024), rendu obsolète par l'arrivée d'`Order` en 2026.

### D4 — README obsolète

Le `README.md` (novembre 2024) affirme que la base n'est pas hébergée dans le cloud,
recommande `prisma migrate dev`, situe le `.env` à la racine et liste un « shopping cart »
qui n'existe pas. Détail en `06_environnement.md` §3.

**Recommandation : à réécrire.** C'est le premier fichier que lira un jury.

### D5 — `.gitignore` racine trop large

Le `.gitignore` de la racine contient `*.json` avec la seule exception `!vercel.json`.
Les fichiers JSON déjà suivis restent versionnés, mais **tout nouveau fichier `.json`
serait silencieusement absent du dépôt** — donc absent du build Vercel.

**Recommandation : à corriger** — remplacer par des règles ciblées.

---

## E. Absence d'intégration continue et de migrations versionnées

### E1 — Aucune CI

**État : ABSENT.** Pas de `.github/workflows`. Rien ne vérifie automatiquement le code
à la publication de modifications : ni tests, ni types, ni lint (ce dernier étant en outre
désactivé au build par `eslint: { ignoreDuringBuilds: true }`).

**Pourquoi c'est attendu.** L'activité type 3 du référentiel aborde la préparation et
l'exécution des plans de tests ainsi que le déploiement. Une chaîne d'intégration continue
est le prolongement naturel des 141 tests désormais disponibles.

**Recommandation : à produire si le temps le permet.** Un unique fichier
`.github/workflows/ci.yml` exécutant `npm ci`, `prisma generate`, `tsc --noEmit`,
`npm run lint` et `npm test` sur chaque publication et chaque pull request suffirait à
démontrer la compétence. Le coût est faible et le gain en soutenance élevé, puisque les
tests existent déjà.

### E2 — Historique de migrations Prisma divergent

**État : PROBLÉMATIQUE.** Le dossier `prisma/migrations/` contient trois migrations,
toutes d'octobre 2024. Depuis, le schéma a gagné `Order`, `OrderDisputeImage`, `Report`,
`Chargeback`, `AdminLog`, `AdminMessage`, ainsi que les champs `suspended`,
`stripeAccountId`, `stripeOnboarded` — toutes appliquées par `prisma db push`, qui ne
génère aucune migration.

**Conséquences.**
- L'historique versionné ne permet plus de reconstruire la base depuis zéro.
- `prisma migrate dev` et `prisma migrate deploy` échoueraient ou détecteraient une dérive.
- Le déploiement Vercel n'applique aucune migration (`build` = `prisma generate && next build`) :
  une évolution de schéma poussée sur `main` produit un client Prisma désaligné de la base
  de production, sans échec de build. L'erreur n'apparaît qu'à l'exécution.

**État : RÉSOLU EN DÉVELOPPEMENT le 23/09/2026 — application en production encore à faire.**

Le rebaselinage a été mené après un contrôle de dérive en lecture seule sur les deux bases :
`prisma migrate diff --from-url <base> --to-schema-datamodel prisma/schema.prisma` renvoie
une **migration vide** en développement **comme en production**. Les deux bases étaient donc
parfaitement alignées sur `schema.prisma`, et la table `_prisma_migrations` n'existait sur
aucune des deux — conséquence de l'usage exclusif de `db push`, donc aucun enregistrement
contradictoire à réconcilier.

Les trois migrations obsolètes ont été remplacées par une baseline unique `0_init`
(382 lignes, 20 `CREATE TABLE`, générée hors ligne depuis un schéma vide), enregistrée sur
la base de développement par `prisma migrate resolve --applied 0_init`. Cette commande
n'écrit que dans la table de métadonnées `_prisma_migrations` : aucune donnée applicative
n'est touchée. `prisma migrate status` confirme *« 1 migration found — Database schema is
up to date! »*.

**Reste à faire :** la même commande `migrate resolve --applied 0_init` sur la base de
production. Opération de métadonnées, sans `DROP` ni `ALTER`, mais qui doit être lancée
explicitement. Procédure détaillée en `01_schema_bdd.md` §4.

Le SQL complet de création de la base figure par ailleurs intégralement en
`01_schema_bdd.md` §3 — c'est désormais le contenu même de la baseline.

---

## F. Récapitulatif des priorités

### Traité le 28 août 2026

| Action | Référence |
|---|---|
| ~~Supprimer `app/api/messages/route.ts`~~ (création de message au nom d'autrui) | D1, F3 ter de `03_securite.md` |
| ~~Corriger l'identifiant de session Google~~ | C1, F4 de `03_securite.md` |
| ~~Supprimer le code mort et les dossiers vides~~ | D1, B1 |
| ~~Désinstaller les dépendances inutilisées~~ | D2 |
| ~~Supprimer la page `/Item_summary/[id]`~~ (URL localhost en dur) | C2 |

### Reste à faire

| Priorité | Action | Coût | Risque |
|---|---|---|---|
| **1** | Réécrire le README (D4) | Faible | Nul |
| **2** | Diagramme de cas d'utilisation + diagramme de séquence (A2) | Moyen | Nul |
| **3** | Appliquer la validation sur `PUT /api/items/[id]` (C4) | Minime | Nul |
| **4** | Contrôler le canal Pusher `private-admin` (C5) | Faible | Nul |
| **5** | Ajouter `.github/workflows/ci.yml` (E1) | Faible | Nul |
| **6** | Documenter le design system en guise de conception d'interface (A1) | Moyen | Nul |
| **7** | Corriger l'encodage des messages d'erreur (C7) | Minime | Nul |
| **8** | Supprimer la page fantôme `app/items/page.tsx` (C3) | Minime | Nul |
| **9** | Arbitrer sur `framer-motion` et `react-intersection-observer`, devenus orphelins (D2) | Minime | Nul |
| — | Rebaseliner les migrations Prisma (E2) | Élevé | **Touche la production — à ne pas faire dans l'urgence** |

Les points 1, 3, 4, 7, 8 et 9 représentent moins d'une demi-journée de travail cumulée.
