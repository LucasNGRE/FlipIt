# Brief de passation — rédaction du dossier de projet CDA

> À coller en premier message de la conversation de rédaction, accompagné des
> 10 fichiers de `dossier-sources/`.

---

## Contexte

Je prépare mon **dossier de projet pour le Titre Professionnel Concepteur Développeur
d'Applications** (TP-01281, niveau 6 RNCP). Tu vas m'aider à le rédiger.

Le projet s'appelle **FlipIt** : une marketplace de revente de matériel de skate entre
particuliers. C'est un projet **portfolio / démonstration** — les paiements sont en mode
test Stripe, aucune transaction réelle n'a lieu. Il est déployé sur
`https://flip-it-iota.vercel.app`.

Stack : Next.js 14 (App Router), TypeScript, Prisma 5.20, PostgreSQL (Neon), NextAuth v5
(identifiants + Google OAuth), Stripe Connect en mode test, Pusher pour le temps réel,
hébergement Vercel.

Le projet a été mené **à deux développeurs** sur une première phase (sept. 2024 – mars
2025), puis repris **seul** (avril – juin 2026), pour un total de 175 commits. Une
campagne de qualité a été menée en août 2026.

## Ce que je te fournis

Dix fichiers Markdown extraits **directement du code**, pas de mémoire. Ils sont factuels
et vérifiables. Commence par lire `README.md`, qui les indexe.

| Fichier | Ce qu'il contient |
|---|---|
| `README.md` | Index et points saillants |
| `00_inventaire.md` | Arborescence, dépendances avec versions et rôles, métriques, volume de code, contraintes d'installation, campagne de nettoyage |
| `01_schema_bdd.md` | Schéma Prisma intégral, SQL de création généré, modèle physique tabulaire, migrations |
| `02_code_extraits.md` | Code source **intégral** de 40 fichiers représentatifs, groupés par domaine |
| `03_securite.md` | Chaque mécanisme de sécurité avec fichier et fonction, puis 11 faiblesses constatées |
| `04_git_historique.md` | 175 commits en 7 phases datées, branches, conventions |
| `05_tests_resultats.md` | Stratégie de test, plan, traçabilité exigence→test, **sortie brute réelle** de la suite, anomalies découvertes |
| `06_environnement.md` | Variables d'environnement (noms uniquement), double base Neon, installation, déploiement Vercel |
| `07_ui_parcours.md` | 31 pages décrites, 3 parcours en Mermaid, ~50 cas d'utilisation par acteur |
| `99_manques.md` | Ce qui manque au projet vs le référentiel, avec recommandations |

Des **captures d'écran** existent également (38, générées avec Playwright). Je les
intégrerai moi-même aux annexes ; tu n'en as pas besoin pour écrire, `07_ui_parcours.md`
les décrit.

## Le fil narratif le plus fort du dossier

Le projet **n'avait aucun test**. Une campagne a été menée : mise en place de Vitest,
extraction de la logique métier en modules purs (`lib/domain/`), puis **162 tests**
couvrant cas nominaux, limites et invalides.

Cette campagne a révélé **5 défauts réels**, tous corrigés et **vérifiés en production** :

1. **Contournement de l'authentification administrateur** (critique) — la comparaison
   `cookie !== process.env.ADMIN_TOKEN` accordait l'accès quand la variable était absente
   de l'environnement, `undefined !== undefined` valant `false`. Le middleware ne couvrant
   pas `/api/admin/*`, toute l'API d'administration devenait publique.
2. **Route de messagerie sans authentification** (critique) — elle acceptait un `senderId`
   fourni par le client et créait un message au nom de cet utilisateur. Non appelée par
   l'interface, mais déployée en production.
3. **Suppression d'annonce sans contrôle de propriété** (critique) — n'importe qui pouvait
   supprimer l'annonce de n'importe qui.
4. **Identifiant de session incohérent pour les comptes Google** — le JWT portait le `sub`
   OAuth au lieu de l'identifiant en base ; un utilisateur Google se connectait mais ne
   pouvait gérer ni ses annonces ni ses commandes.
5. **Message de limitation de débit masqué** — le verrouillage anti-force brute
   fonctionnait côté serveur mais l'interface affichait « Mot de passe incorrect » même
   sur un `429`.

**Point à exploiter :** les défauts 1 à 4 ont été trouvés par les tests unitaires, le
défaut 5 par une campagne exploratoire Playwright. Les deux niveaux de test ont trouvé des
choses **différentes** — c'est l'argument attendu sur la complémentarité des niveaux de
test, et il est ici démontré par les faits plutôt qu'affirmé.

## Règles de travail que je te demande de respecter

1. **N'invente rien.** Si un élément n'est pas dans les fichiers, ne le fabrique pas.
   `99_manques.md` fait autorité sur ce qui est absent du projet. Signale-moi les manques
   plutôt que de les combler par de la plausibilité.
2. **Aucune valeur secrète** ne doit apparaître : uniquement les noms de variables
   d'environnement.
3. **Ne minimise pas les faiblesses.** Le dossier assume des limites documentées
   (limitation de débit inopérante en serverless, images en base64 sans pagination,
   historique de migrations Prisma divergent). Les présenter lucidement vaut mieux que de
   les masquer — un jury les trouvera.
4. **Demande-moi ce que tu ne peux pas savoir.** Les fichiers décrivent le code, pas mes
   intentions : pourquoi tel choix technique, ce que j'ai appris, les difficultés
   rencontrées. Interroge-moi plutôt que de supposer.

## Ce qu'il reste à produire, et où je veux ton aide

Par ordre de priorité :

| | Quoi | État |
|---|---|---|
| 1 | **Diagramme de cas d'utilisation** (UML) | À produire — matière complète en `07_ui_parcours.md` §6 (4 acteurs, ~50 cas) |
| 2 | **Diagramme de séquence** | À produire — meilleur candidat : le paiement avec séquestre (navigateur → PaymentIntent → Stripe → webhook → création de commande → notification Pusher → expédition → confirmation → transfert) |
| 3 | **Maquettes ou design system documenté** | Aucune maquette n'existe. Deux options dans `99_manques.md` A1 |
| 4 | **Rédaction du dossier** | Non commencée |
| 5 | **Réécriture du README** du dépôt | L'actuel date de nov. 2024 et est faux sur presque tout |

Des points techniques mineurs restent également ouverts, listés en `99_manques.md` §F.

## Précision de datation

Les fichiers sont un **instantané du 28 août 2026**. Les correctifs ont été déployés en
production le **21 septembre 2026** et vérifiés à cette date. Les métriques et la sortie
de tests correspondent à l'état actuel du code.

---

## Par où commencer

Lis `README.md` puis `99_manques.md` — ils te donnent la carte du terrain et ce qui manque.
Ensuite, propose-moi un **plan de dossier** structuré selon les activités types du
référentiel CDA, en indiquant pour chaque section quels fichiers l'alimentent et ce qu'il
me reste à fournir. On rédigera section par section à partir de ce plan.
