# 05 — Plan de tests, exécution et résultats

> Campagne réalisée le **28 août 2026** sur la branche `tests/dossier-cda`.
> Aucun test n'accède au réseau ni à une base de données : la couche Prisma,
> Pusher et Stripe sont systématiquement remplacées par des doubles (`vi.mock`).

## 1. Situation de départ

Avant cette campagne, le projet ne comportait **aucun test automatisé** : ni exécuteur
de tests dans `package.json`, ni fichier de test, ni configuration. La seule vérification
automatique était le `next build` — et encore partiellement, puisque `next.config.mjs`
contient `eslint: { ignoreDuringBuilds: true }`, ce qui neutralise l'analyse ESLint
au moment du build.

## 2. Stratégie de test retenue

### 2.1 Choix de l'outillage

| Choix | Justification |
|---|---|
| **Vitest 2.1.9** | Prend en charge TypeScript sans transpilation manuelle, API de doublure intégrée (`vi.mock`), simulation d'horloge (`vi.useFakeTimers`), démarrage rapide. Version 2 retenue plutôt que 3 : Vite 6+ exige `@types/node >= 20.19` alors que le projet est figé sur `20.17.6`. |
| **Environnement `node`** | Le périmètre testé est la logique métier et les routes API serveur ; aucun rendu de composant React n'est nécessaire. |
| **Prisma systématiquement mocké** | Contrainte absolue de la campagne : aucun test ne doit écrire dans une base NeonDB ni dépendre du réseau. |
| **Alias `@/` reproduit manuellement** | `vitest.config.ts` définit `resolve.alias` plutôt que d'ajouter le plugin `vite-tsconfig-paths`, qui est ESM-only et incompatible avec le chargement CJS de la configuration. |

**Obstacle d'environnement rencontré.** Le premier lancement a échoué : le binaire natif
`@rollup/rollup-win32-x64-msvc` est bloqué par la stratégie de contrôle d'application de
Windows 11 (`ERR_DLOPEN_FAILED` — « Une stratégie de contrôle d'application a bloqué ce
fichier »). La solution retenue est le build WebAssembly officiel de Rollup, déclaré en
alias dans `devDependencies` : `"rollup": "npm:@rollup/wasm-node@^4.63.1"`. Cette
substitution n'affecte pas le build Next.js, qui n'utilise pas Rollup.

### 2.2 Refactoring préalable : extraction de la logique métier

La logique métier était enfouie dans les handlers de routes, mêlée aux appels Prisma,
Stripe et Pusher — donc non testable unitairement. Elle a été **extraite en fonctions pures**
dans `lib/domain/`, puis les routes ont été recâblées sur ces fonctions (refactoring à
fonctionnalités constantes, hors les trois corrections listées en §5).

| Module extrait | Contenu | Routes recâblées |
|---|---|---|
| `lib/domain/offers.ts` | `validateOfferInput`, `computeOfferExpiry`, `isOfferExpired`, `canRespondToOffer`, `resolveOfferDecision` | `/api/offer`, `/api/offer/[id]`, `/api/offer/status` |
| `lib/domain/orders.ts` | `ORDER_TRANSITIONS`, `canTransitionOrder`, `computeConfirmDeadline`, `canShipOrder`, `canConfirmOrder`, `canDisputeOrder`, `isAutoConfirmable`, `selectAutoConfirmable`, `formatTrackingNumber` | `/api/orders/[id]/ship`, `/confirm`, `/dispute`, `/api/cron/auto-confirm` |
| `lib/domain/products.ts` | `validateProductInput`, `canModifyProduct`, `isCondition`, `isCategory` | `/api/items`, `/api/items/[id]` |
| `lib/domain/pricing.ts` | `computeOrderAmounts`, `computeTransferAmountCents`, `resolveFinalPrice` | `/api/stripe/payment-intent`, `/api/orders/[id]/confirm`, `/api/cron/auto-confirm` |
| `lib/domain/access.ts` | `isValidAdminToken`, `isCronAuthorized` | les 18 handlers de `/api/admin/*` (via `lib/adminAuth.ts`), `/api/cron/auto-confirm` |

Ce découpage a un bénéfice au-delà du test : les règles métier (qui peut expédier, quand
une offre expire, comment se calcule la commission) sont désormais lisibles en un seul
endroit, indépendamment de la plomberie HTTP et des appels aux services tiers.

### 2.3 Typologie des tests

Chaque règle est éprouvée selon trois axes : **cas nominal**, **cas limite**, **cas invalide**.
Exemple sur la fenêtre de paiement de 24 h ouverte par l'acceptation d'une offre :

- **nominal** — l'offre est encore valide à 23 h 59 ;
- **limite** — elle n'est pas expirée à l'instant exact de l'échéance (la comparaison est stricte) ;
- **invalide** — elle est expirée à 24 h 01, et une offre `pending` n'expire jamais.

Les tests dépendant du temps utilisent `vi.useFakeTimers()` et `vi.setSystemTime()` : ils sont
donc déterministes et ne dépendent ni de l'heure d'exécution ni de la durée réelle des délais.

## 3. Plan de tests

| Fichier | Périmètre | Tests |
|---|---|---:|
| `tests/offers.test.ts` | Validation d'offre, fenêtre de 24 h, droit de réponse, effet d'une décision | 25 |
| `tests/orders.test.ts` | Machine à états, délai de 48 h, droits vendeur/acheteur, sélection du cron, numéro de suivi | 33 |
| `tests/products.test.ts` | Validation d'annonce (titre, prix, énumérations), contrôle de propriété | 29 |
| `tests/pricing.test.ts` | Commission 10 %, livraison, arrondis au centime, montant reversé, prix retenu | 17 |
| `tests/access.test.ts` | Jeton administrateur, autorisation du cron | 11 |
| `tests/rateLimit.test.ts` | Limitation de débit, fenêtre glissante, verrouillage | 9 |
| `tests/api/offer-status.route.test.ts` | Route `POST /api/offer/status` de bout en bout, Prisma et Pusher mockés | 12 |
| `tests/api/admin-users.route.test.ts` | Contrôle d'accès de `GET /api/admin/users`, Prisma mocké | 5 |
| **Total** | | **141** |

### Traçabilité exigence métier → tests

| Exigence | Cas couverts |
|---|---|
| Une offre porte un montant strictement positif | montant négatif, nul, non numérique, absent, `NaN`, `Infinity` refusés ; 0,01 € accepté ; chaîne « 45.50 » convertie |
| Une offre acceptée expire au bout de 24 h | valide à 23 h 59 ; valide à l'échéance exacte ; expirée à 24 h 01 ; une offre `pending` ou `rejected` n'expire jamais ; absence d'échéance tolérée |
| Une offre déjà traitée ne peut plus être acceptée | statuts `accepted` et `rejected` refusés avec un 400 |
| On ne répond pas à sa propre offre | émetteur refusé avec un 403 ; utilisateur hors conversation refusé avec un 403 |
| Une commande suit paid → shipped → confirmed | transitions autorisées vérifiées ; `paid → confirmed` et `confirmed → shipped` refusées ; les 10 combinaisons sortant d'un état terminal refusées |
| Le délai de confirmation est de 48 h | échéance calculée exactement à +48 h ; constante vérifiée à 172 800 000 ms |
| La confirmation automatique se déclenche à échéance | échéance dépassée → confirmée ; atteinte pile → confirmée (`lte`) ; non atteinte → intacte ; commande non expédiée → ignorée ; vendeur sans compte Stripe → ignorée ; sélection d'un lot mixte → seule la commande éligible retenue |
| Seul le propriétaire modifie son annonce | propriétaire autorisé ; tiers 403 ; anonyme 401 ; identifiant non numérique 401 ; annonce inexistante 404 |
| Les énumérations Prisma sont respectées | les 5 états et 6 catégories acceptés ; valeur hors liste refusée ; casse incorrecte refusée ; charge d'injection SQL refusée ; erreurs cumulées sur champs multiples |
| La commission est de 10 %, payée en sus par l'acheteur | 100 € → 114 € débités et 100 € reversés ; arrondi au centime vérifié sur 5 montants ; jamais de centime fractionnaire |
| Le prix retenu est celui de l'offre acceptée | offre `accepted` retenue ; `pending` et `rejected` ignorées ; montant aberrant ignoré |
| L'API d'administration exige un cookie valide | sans cookie, cookie forgé, cookie vide → 403 ; cookie valide → 200 et requête base effectuée |
| Le cron n'est appelable qu'avec le bon secret | Bearer exact accepté ; secret erroné, en-tête absent, schéma incorrect, casse incorrecte, secret non configuré → refusés |
| La limitation de débit protège les signalements et le login admin | 5 requêtes autorisées puis blocage ; blocage persistant ; compteurs isolés par utilisateur et par IP ; réinitialisation après la fenêtre ; verrouillage maintenu 30 min puis levé |

## 4. Sortie réelle de l'exécution

Commande : `npx vitest run --reporter verbose`
Date : **28 août 2026, 10 h 56** — Node v24.11.1, npm 11.6.2, Windows 11.

```text
The CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.

 RUN  v2.1.9 D:/FlipIt/my-app

 ✓ tests/offers.test.ts > validateOfferInput — création d'une offre > accepte un montant et un produit valides (cas nominal)
 ✓ tests/offers.test.ts > validateOfferInput — création d'une offre > accepte un montant transmis sous forme de chaîne
 ✓ tests/offers.test.ts > validateOfferInput — création d'une offre > accepte le plus petit montant significatif (limite basse)
 ✓ tests/offers.test.ts > validateOfferInput — création d'une offre > refuse un montant négatif
 ✓ tests/offers.test.ts > validateOfferInput — création d'une offre > refuse un montant nul
 ✓ tests/offers.test.ts > validateOfferInput — création d'une offre > refuse un montant non numérique
 ✓ tests/offers.test.ts > validateOfferInput — création d'une offre > refuse un montant manquant
 ✓ tests/offers.test.ts > validateOfferInput — création d'une offre > refuse un identifiant de produit manquant ou invalide
 ✓ tests/offers.test.ts > validateOfferInput — création d'une offre > refuse Infinity et NaN
 ✓ tests/offers.test.ts > computeOfferExpiry — fenêtre de paiement de 24 h > place l'échéance exactement 24 h après l'acceptation
 ✓ tests/offers.test.ts > computeOfferExpiry — fenêtre de paiement de 24 h > utilise bien une constante de 24 heures
 ✓ tests/offers.test.ts > isOfferExpired — expiration de la fenêtre de 24 h > reste valide à 23 h 59 après acceptation
 ✓ tests/offers.test.ts > isOfferExpired — expiration de la fenêtre de 24 h > reste valide une seconde avant l'échéance (limite)
 ✓ tests/offers.test.ts > isOfferExpired — expiration de la fenêtre de 24 h > n'est pas expirée pile à l'échéance (comparaison stricte)
 ✓ tests/offers.test.ts > isOfferExpired — expiration de la fenêtre de 24 h > est expirée à 24 h 01 après acceptation
 ✓ tests/offers.test.ts > isOfferExpired — expiration de la fenêtre de 24 h > ne considère jamais une offre pending comme expirée
 ✓ tests/offers.test.ts > isOfferExpired — expiration de la fenêtre de 24 h > ne considère jamais une offre rejected comme expirée
 ✓ tests/offers.test.ts > isOfferExpired — expiration de la fenêtre de 24 h > ne plante pas si aucune date d'expiration n'est enregistrée
 ✓ tests/offers.test.ts > canRespondToOffer — droit de répondre à une offre > autorise le vendeur participant à la conversation (cas nominal)
 ✓ tests/offers.test.ts > canRespondToOffer — droit de répondre à une offre > refuse à l'émetteur de répondre à sa propre offre
 ✓ tests/offers.test.ts > canRespondToOffer — droit de répondre à une offre > refuse un utilisateur étranger à la conversation
 ✓ tests/offers.test.ts > canRespondToOffer — droit de répondre à une offre > refuse de traiter une offre déjà rejetée
 ✓ tests/offers.test.ts > canRespondToOffer — droit de répondre à une offre > refuse de traiter une offre déjà acceptée (donc potentiellement expirée)
 ✓ tests/offers.test.ts > resolveOfferDecision — effet d'une acceptation ou d'un refus > accepter ouvre une fenêtre de paiement de 24 h
 ✓ tests/offers.test.ts > resolveOfferDecision — effet d'une acceptation ou d'un refus > refuser ne pose aucune échéance
 ✓ tests/rateLimit.test.ts > rateLimit — signalements (5 par heure) > autorise les requêtes sous la limite
 ✓ tests/rateLimit.test.ts > rateLimit — signalements (5 par heure) > bloque la requête qui dépasse la limite
 ✓ tests/rateLimit.test.ts > rateLimit — signalements (5 par heure) > continue de bloquer les requêtes suivantes
 ✓ tests/rateLimit.test.ts > rateLimit — signalements (5 par heure) > isole les compteurs entre utilisateurs distincts
 ✓ tests/rateLimit.test.ts > rateLimit — remise à zéro de la fenêtre > réautorise après expiration de la fenêtre horaire
 ✓ tests/rateLimit.test.ts > rateLimit — lockout du login admin (5 tentatives / 15 min, blocage 30 min) > autorise 5 tentatives puis verrouille
 ✓ tests/rateLimit.test.ts > rateLimit — lockout du login admin (5 tentatives / 15 min, blocage 30 min) > maintient le verrou pendant 30 minutes après dépassement
 ✓ tests/rateLimit.test.ts > rateLimit — lockout du login admin (5 tentatives / 15 min, blocage 30 min) > isole le verrou par adresse IP
 ✓ tests/rateLimit.test.ts > rateLimit — lockout du login admin (5 tentatives / 15 min, blocage 30 min) > indique un délai d'attente exploitable par le client
 ✓ tests/orders.test.ts > canTransitionOrder — machine à états de la commande > autorise le parcours nominal paid → shipped → confirmed
 ✓ tests/orders.test.ts > canTransitionOrder — machine à états de la commande > autorise l'ouverture d'un litige depuis paid et shipped
 ✓ tests/orders.test.ts > canTransitionOrder — machine à états de la commande > interdit de confirmer une commande non expédiée (paid → confirmed)
 ✓ tests/orders.test.ts > canTransitionOrder — machine à états de la commande > interdit de revenir en arrière (confirmed → shipped)
 ✓ tests/orders.test.ts > canTransitionOrder — machine à états de la commande > interdit toute sortie d'un état terminal
 ✓ tests/orders.test.ts > canTransitionOrder — machine à états de la commande > interdit d'expédier une commande en litige
 ✓ tests/orders.test.ts > canTransitionOrder — machine à états de la commande > autorise le remboursement d'une commande en litige
 ✓ tests/orders.test.ts > computeConfirmDeadline — délai de 48 h > place l'échéance exactement 48 h après l'expédition
 ✓ tests/orders.test.ts > computeConfirmDeadline — délai de 48 h > utilise bien une constante de 48 heures
 ✓ tests/orders.test.ts > canShipOrder — expédition réservée au vendeur > autorise le vendeur sur une commande payée (cas nominal)
 ✓ tests/orders.test.ts > canShipOrder — expédition réservée au vendeur > refuse l'acheteur
 ✓ tests/orders.test.ts > canShipOrder — expédition réservée au vendeur > refuse un tiers
 ✓ tests/orders.test.ts > canShipOrder — expédition réservée au vendeur > refuse d'expédier deux fois
 ✓ tests/orders.test.ts > canShipOrder — expédition réservée au vendeur > refuse d'expédier une commande en litige
 ✓ tests/orders.test.ts > canConfirmOrder — confirmation réservée à l'acheteur > autorise l'acheteur sur une commande expédiée (cas nominal)
 ✓ tests/orders.test.ts > canConfirmOrder — confirmation réservée à l'acheteur > refuse le vendeur (il ne peut pas se libérer les fonds lui-même)
 ✓ tests/orders.test.ts > canConfirmOrder — confirmation réservée à l'acheteur > refuse de confirmer une commande simplement payée
 ✓ tests/orders.test.ts > canConfirmOrder — confirmation réservée à l'acheteur > refuse de confirmer deux fois
 ✓ tests/orders.test.ts > canDisputeOrder — litige réservé à l'acheteur > autorise l'acheteur sur une commande expédiée
 ✓ tests/orders.test.ts > canDisputeOrder — litige réservé à l'acheteur > autorise l'acheteur sur une commande payée non expédiée
 ✓ tests/orders.test.ts > canDisputeOrder — litige réservé à l'acheteur > refuse le vendeur
 ✓ tests/orders.test.ts > canDisputeOrder — litige réservé à l'acheteur > refuse un litige sur une commande déjà confirmée
 ✓ tests/orders.test.ts > canDisputeOrder — litige réservé à l'acheteur > refuse un second litige sur une commande déjà disputée
 ✓ tests/orders.test.ts > isAutoConfirmable — logique du cron auto-confirm > confirme une commande expédiée dont l'échéance est dépassée (cas nominal)
 ✓ tests/orders.test.ts > isAutoConfirmable — logique du cron auto-confirm > confirme pile à l'échéance (le cron utilise lte)
 ✓ tests/orders.test.ts > isAutoConfirmable — logique du cron auto-confirm > laisse intacte une commande dont l'échéance n'est pas atteinte
 ✓ tests/orders.test.ts > isAutoConfirmable — logique du cron auto-confirm > ignore une commande non expédiée
 ✓ tests/orders.test.ts > isAutoConfirmable — logique du cron auto-confirm > ignore une commande sans échéance enregistrée
 ✓ tests/orders.test.ts > isAutoConfirmable — logique du cron auto-confirm > ignore un vendeur sans compte Stripe (aucun transfert possible)
 ✓ tests/orders.test.ts > selectAutoConfirmable — sélection du lot traité par le cron > ne retient que les commandes réellement éligibles
 ✓ tests/orders.test.ts > selectAutoConfirmable — sélection du lot traité par le cron > renvoie un lot vide quand rien n'est éligible
 ✓ tests/orders.test.ts > formatTrackingNumber — format du numéro de suivi > produit le format FLT-AAAAMMJJ-NNNNN-XXXX
 ✓ tests/orders.test.ts > formatTrackingNumber — format du numéro de suivi > complète le mois et le jour sur deux chiffres
 ✓ tests/pricing.test.ts > computeOrderAmounts — montant débité à l'acheteur > additionne prix, livraison et commission de 10 % (cas nominal)
 ✓ tests/pricing.test.ts > computeOrderAmounts — montant débité à l'acheteur > applique les frais de livraison par défaut si non fournis
 ✓ tests/pricing.test.ts > computeOrderAmounts — montant débité à l'acheteur > arrondit la commission au centime
 ✓ tests/pricing.test.ts > computeOrderAmounts — montant débité à l'acheteur > ne produit jamais de centimes fractionnaires
 ✓ tests/pricing.test.ts > computeOrderAmounts — montant débité à l'acheteur > accepte des frais de livraison nuls (remise en main propre)
 ✓ tests/pricing.test.ts > computeOrderAmounts — montant débité à l'acheteur > retombe sur la livraison par défaut si la valeur est aberrante
 ✓ tests/pricing.test.ts > computeOrderAmounts — montant débité à l'acheteur > refuse un prix final invalide
 ✓ tests/pricing.test.ts > computeOrderAmounts — montant débité à l'acheteur > applique bien le taux de commission documenté
 ✓ tests/pricing.test.ts > computeTransferAmountCents — montant reversé au vendeur > reverse le prix produit entier, commission non déduite
 ✓ tests/pricing.test.ts > computeTransferAmountCents — montant reversé au vendeur > convertit correctement les montants à décimales
 ✓ tests/pricing.test.ts > computeTransferAmountCents — montant reversé au vendeur > refuse un montant invalide
 ✓ tests/pricing.test.ts > computeTransferAmountCents — montant reversé au vendeur > reste cohérent avec le montant encaissé (le reste couvre livraison + commission)
 ✓ tests/pricing.test.ts > resolveFinalPrice — prix retenu pour la commande > retient le prix produit en l'absence d'offre
 ✓ tests/pricing.test.ts > resolveFinalPrice — prix retenu pour la commande > retient le montant d'une offre acceptée
 ✓ tests/pricing.test.ts > resolveFinalPrice — prix retenu pour la commande > ignore une offre encore en attente
 ✓ tests/pricing.test.ts > resolveFinalPrice — prix retenu pour la commande > ignore une offre rejetée ou expirée
 ✓ tests/pricing.test.ts > resolveFinalPrice — prix retenu pour la commande > ignore une offre acceptée au montant aberrant
 ✓ tests/products.test.ts > validateProductInput — cas nominal > accepte une annonce complète et valide
 ✓ tests/products.test.ts > validateProductInput — cas nominal > accepte une annonce sans catégorie (champ optionnel côté schéma Prisma)
 ✓ tests/products.test.ts > validateProductInput — cas nominal > normalise les espaces superflus du titre
 ✓ tests/products.test.ts > validateProductInput — cas nominal > convertit un prix transmis sous forme de chaîne
 ✓ tests/products.test.ts > validateProductInput — cas nominal > ramène les champs optionnels vides à null
 ✓ tests/products.test.ts > validateProductInput — titre > refuse un titre manquant
 ✓ tests/products.test.ts > validateProductInput — titre > refuse un titre vide ou composé d'espaces
 ✓ tests/products.test.ts > validateProductInput — titre > accepte un titre à la longueur maximale (limite)
 ✓ tests/products.test.ts > validateProductInput — titre > refuse un titre dépassant la longueur maximale
 ✓ tests/products.test.ts > validateProductInput — prix > refuse un prix manquant
 ✓ tests/products.test.ts > validateProductInput — prix > refuse un prix négatif
 ✓ tests/products.test.ts > validateProductInput — prix > refuse un prix nul
 ✓ tests/products.test.ts > validateProductInput — prix > refuse un prix non numérique
 ✓ tests/products.test.ts > validateProductInput — prix > accepte le plus petit prix significatif (limite basse)
 ✓ tests/products.test.ts > validateProductInput — prix > refuse un prix hors plage haute
 ✓ tests/products.test.ts > validateProductInput — énumérations > accepte toutes les valeurs d'état du schéma Prisma
 ✓ tests/products.test.ts > validateProductInput — énumérations > accepte toutes les catégories du schéma Prisma
 ✓ tests/products.test.ts > validateProductInput — énumérations > refuse un état hors énumération
 ✓ tests/products.test.ts > validateProductInput — énumérations > refuse un état manquant
 ✓ tests/products.test.ts > validateProductInput — énumérations > refuse une catégorie hors énumération
 ✓ tests/products.test.ts > validateProductInput — énumérations > refuse une tentative d'injection dans un champ énuméré
 ✓ tests/products.test.ts > validateProductInput — énumérations > cumule les erreurs de plusieurs champs invalides
 ✓ tests/products.test.ts > isCondition / isCategory — gardes de type > reconnaît les valeurs valides
 ✓ tests/products.test.ts > isCondition / isCategory — gardes de type > rejette les valeurs invalides et les types non chaîne
 ✓ tests/products.test.ts > canModifyProduct — contrôle de propriété d'une annonce > autorise le propriétaire (cas nominal)
 ✓ tests/products.test.ts > canModifyProduct — contrôle de propriété d'une annonce > refuse un utilisateur non propriétaire avec un 403
 ✓ tests/products.test.ts > canModifyProduct — contrôle de propriété d'une annonce > refuse un visiteur non authentifié avec un 401
 ✓ tests/products.test.ts > canModifyProduct — contrôle de propriété d'une annonce > refuse un identifiant de session non numérique (cas OAuth Google)
 ✓ tests/products.test.ts > canModifyProduct — contrôle de propriété d'une annonce > renvoie 404 pour une annonce inexistante
 ✓ tests/access.test.ts > isValidAdminToken — session administrateur > autorise un jeton identique au secret configuré (cas nominal)
 ✓ tests/access.test.ts > isValidAdminToken — session administrateur > refuse un jeton différent
 ✓ tests/access.test.ts > isValidAdminToken — session administrateur > refuse une requête sans cookie
 ✓ tests/access.test.ts > isValidAdminToken — session administrateur > refuse l'accès quand le secret n'est pas configuré (faille undefined === undefined)
 ✓ tests/access.test.ts > isValidAdminToken — session administrateur > refuse tout jeton lorsque le secret est absent, même non vide
 ✓ tests/access.test.ts > isValidAdminToken — session administrateur > est sensible à la casse et aux espaces
 ✓ tests/access.test.ts > isCronAuthorized — appel du cron Vercel > autorise un en-tête Bearer exact (cas nominal)
 ✓ tests/access.test.ts > isCronAuthorized — appel du cron Vercel > refuse un secret erroné
 ✓ tests/access.test.ts > isCronAuthorized — appel du cron Vercel > refuse un en-tête absent
 ✓ tests/access.test.ts > isCronAuthorized — appel du cron Vercel > refuse un en-tête mal formé (schéma manquant ou incorrect)
 ✓ tests/access.test.ts > isCronAuthorized — appel du cron Vercel > refuse l'appel quand CRON_SECRET n'est pas configuré
 ✓ tests/api/admin-users.route.test.ts > GET /api/admin/users — accès refusé > refuse une requête sans cookie admin_token
 ✓ tests/api/admin-users.route.test.ts > GET /api/admin/users — accès refusé > refuse un cookie admin_token invalide
 ✓ tests/api/admin-users.route.test.ts > GET /api/admin/users — accès refusé > refuse un cookie vide
 ✓ tests/api/admin-users.route.test.ts > GET /api/admin/users — accès autorisé > autorise un cookie admin_token valide et interroge la base
 ✓ tests/api/admin-users.route.test.ts > GET /api/admin/users — régression de sécurité > refuse l'accès lorsque ADMIN_TOKEN n'est pas configuré et qu'aucun cookie n'est fourni
 ✓ tests/api/offer-status.route.test.ts > POST /api/offer/status — authentification > refuse un visiteur non authentifié avec un 401
 ✓ tests/api/offer-status.route.test.ts > POST /api/offer/status — validation des paramètres > refuse un identifiant manquant
 ✓ tests/api/offer-status.route.test.ts > POST /api/offer/status — validation des paramètres > refuse un booléen `accepted` mal typé
 ✓ tests/api/offer-status.route.test.ts > POST /api/offer/status — règles métier > renvoie 404 si l'offre n'existe pas
 ✓ tests/api/offer-status.route.test.ts > POST /api/offer/status — règles métier > refuse de traiter une offre déjà traitée
 ✓ tests/api/offer-status.route.test.ts > POST /api/offer/status — règles métier > interdit à l'émetteur de répondre à sa propre offre
 ✓ tests/api/offer-status.route.test.ts > POST /api/offer/status — règles métier > interdit à un utilisateur hors conversation de répondre
 ✓ tests/api/offer-status.route.test.ts > POST /api/offer/status — acceptation (cas nominal) > accepte l'offre et ouvre une fenêtre de paiement de 24 h
 ✓ tests/api/offer-status.route.test.ts > POST /api/offer/status — acceptation (cas nominal) > invalide les autres offres du même produit
 ✓ tests/api/offer-status.route.test.ts > POST /api/offer/status — acceptation (cas nominal) > notifie les participants via Pusher
 ✓ tests/api/offer-status.route.test.ts > POST /api/offer/status — refus > rejette l'offre sans poser d'échéance
 ✓ tests/api/offer-status.route.test.ts > POST /api/offer/status — refus > n'invalide pas les autres offres lors d'un refus

 Test Files  8 passed (8)
      Tests  141 passed (141)
   Start at  10:56:03
   Duration  5.03s (transform 5.91s, setup 0ms, collect 8.56s, tests 3.36s, environment 16ms, prepare 14.65s)
```

## 5. Anomalies découvertes par les tests

Trois défauts réels ont été mis au jour pendant l'écriture des tests. Aucun n'a été masqué :
le test a d'abord été écrit et vu échouer, puis le code a été corrigé, puis le test revérifié.

### A1 — Contournement de l'authentification administrateur (critique, corrigé)

**Symptôme observé.** Le test « refuse l'accès lorsque ADMIN_TOKEN n'est pas configuré et
qu'aucun cookie n'est fourni » a échoué à la première exécution :

```text
FAIL  tests/api/admin-users.route.test.ts > GET /api/admin/users — régression de sécurité
      > refuse l'accès lorsque ADMIN_TOKEN n'est pas configuré et qu'aucun cookie n'est fourni
AssertionError: expected 200 to be 403 // Object.is equality

- Expected
+ Received

- 403
+ 200

 ❯ tests/api/admin-users.route.test.ts:81:24
```

**Cause.** Les 18 handlers de `app/api/admin/*` s'appuyaient sur
`cookies().get('admin_token')?.value !== process.env.ADMIN_TOKEN`. Lorsque la variable
d'environnement est absente et qu'aucun cookie n'est envoyé, l'expression évaluée est
`undefined !== undefined`, soit `false` : la garde ne se déclenche pas et l'accès est accordé.
Le middleware ne couvrant que les **pages** `/admin/*` (matcher `/admin/:path*`, qui ne
correspond pas à `/api/admin/*`), toute l'API d'administration — liste des utilisateurs,
suspension de comptes, remboursements, données financières — devenait publique.

**Correction.** Création de `isValidAdminToken()` (`lib/domain/access.ts`), qui refuse
explicitement lorsque le secret attendu est vide ou absent, et de `isAdminRequest()`
(`lib/adminAuth.ts`). Les 18 occurrences ont été remplacées. Test repassé au vert.

### A2 — Suppression d'annonce sans authentification ni contrôle de propriété (critique, corrigé)

**Cause.** Le handler `DELETE` de `app/api/items/[id]/route.ts` ne lisait aucune session et
supprimait le produit directement à partir de l'identifiant d'URL :

```ts
export async function DELETE(request, { params }) {
  const productId = parseInt(params.id, 10)
  if (isNaN(productId)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  const deletedProduct = await prisma.product.delete({ where: { id: productId } })
```

N'importe quel visiteur, authentifié ou non, pouvait supprimer l'annonce de n'importe qui
par un simple appel HTTP, avec cascade sur les images, offres, messages, favoris et
commandes associés.

**Correction.** Récupération de la session et contrôle `canModifyProduct()` : 401 sans
session, 404 si l'annonce n'existe pas, 403 si l'utilisateur n'est pas propriétaire.

### A3 — Aucune validation à la création d'annonce (moyen, corrigé)

**Cause.** `app/api/items/route.ts` transmettait les champs bruts du formulaire à Prisma avec
`condition as any` et `category as any` : titre vide accepté, `parseFloat` renvoyant `NaN`
sur un prix non numérique, valeurs d'énumération non contrôlées — soit une erreur Prisma 500
au lieu d'un 400 explicite.

**Correction.** `validateProductInput()` appliquée en entrée de route avec réponse 400
détaillée, suppression des `as any`, plafonnement du nombre d'images à 5 côté serveur.
Un `console.log('photosBase64:', …)` qui journalisait le contenu binaire des images à chaque
création a également été supprimé.

### A4 — Le message de limitation de débit n'atteignait jamais l'utilisateur (moyen, corrigé)

Découverte lors de la **génération des captures d'écran** (voir `captures/`), et non par
les tests unitaires — ce qui illustre la complémentarité des deux approches.

**Symptôme observé.** La capture censée montrer le blocage après 5 tentatives de connexion
administrateur affichait « Mot de passe incorrect » au lieu du message de limitation.
Vérification directe contre l'API :

```text
appel 1 status 429 -> {"error":"Trop de tentatives. Réessayez dans 30 min."}
...
appel 8 status 429 -> {"error":"Trop de tentatives. Réessayez dans 30 min."}
```

Le serveur bloquait donc correctement : le défaut était côté interface.

**Cause.** Le gestionnaire de soumission de `app/admin/login/page.tsx` ignorait le corps
de la réponse et affichait un message générique quel que soit le code HTTP :

```ts
if (res.ok) { router.push('/admin/disputes') }
else { setError('Mot de passe incorrect'); setPassword('') }
```

Un administrateur verrouillé 30 minutes croyait donc s'être trompé de saisie et
continuait à essayer — ce qui prolongeait d'autant le verrouillage.

**Correction.** Lecture du corps de la réponse et affichage du message renvoyé par l'API,
avec repli sur le message générique. La capture `38_admin_rate_limit.png` montre l'état
après correction : « Trop de tentatives. Réessayez dans 15 min. »

### Anomalies détectées mais non corrigées

Documentées dans `03_securite.md` (F4 à F10) et `99_manques.md` : identifiant de session
incohérent pour les comptes Google, limitation de débit inopérante en serverless, canal
Pusher `private-admin` non contrôlé, absence de validation sur `PUT /api/items/[id]`.

## 6. Vérifications complémentaires exécutées

| Vérification | Commande | Résultat |
|---|---|---|
| Types | `npx tsc --noEmit` | **Aucune erreur** |
| Tests | `npx vitest run` | **141 / 141 réussis**, 8 fichiers |
| Dépendances | `npm audit` | 50 vulnérabilités (6 critiques, 25 hautes, 15 modérées, 4 faibles) — détail en `03_securite.md` |
| Parcours réels | `node scripts/captures.mjs` (Playwright) | **38 / 38 vues capturées** sur l'application en fonctionnement — voir `captures/` |

### Tests exploratoires automatisés (Playwright)

En complément des tests unitaires, un script Playwright parcourt l'application réelle et
capture 38 vues (pages publiques, espace membre authentifié, administration, thème sombre,
rendus mobiles). Il ne s'agit pas de tests assertifs mais d'une **campagne de vérification
visuelle reproductible** : chaque exécution rejoue les mêmes parcours et signale les pages
qui ne se chargent plus.

Cette campagne a immédiatement révélé l'anomalie A4 ci-dessous, invisible pour les tests
unitaires puisqu'elle se situe dans le rendu du message d'erreur et non dans la règle
métier — laquelle est correctement couverte par `tests/rateLimit.test.ts`.

## 7. Limites de la campagne

- **Pas de tests de composants React** : ni `@testing-library/react` ni environnement DOM
  n'ont été mis en place. Le rendu et les interactions de l'interface ne sont pas couverts.
- **Pas de tests de bout en bout** (Playwright / Cypress) : aucun parcours utilisateur complet
  n'est rejoué dans un navigateur.
- **Pas de tests d'intégration base de données** : la contrainte de ne pas toucher à NeonDB a
  conduit à mocker Prisma. Les requêtes elles-mêmes (clauses `where`, `include`, cascades
  `onDelete`) ne sont donc pas vérifiées contre un vrai moteur PostgreSQL.
- **Couverture non mesurée globalement** : `npm run test:coverage` est disponible mais
  l'instrumentation est volontairement restreinte à `lib/` ; routes et composants en sont exclus.
- **Aucune intégration continue** : les tests doivent être lancés manuellement, rien ne les
  déclenche à la publication de modifications.
