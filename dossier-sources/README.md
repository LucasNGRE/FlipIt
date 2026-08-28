# Sources pour le dossier de projet CDA — FlipIt

Ensemble des éléments factuels extraits du dépôt **FlipIt**, destinés à la rédaction du
dossier de projet pour le **Titre Professionnel Concepteur Développeur d'Applications**
(TP-01281, niveau 6 RNCP).

**Date d'extraction :** 28 août 2026
**Branche :** `tests/dossier-cda`
**Dépôt :** `github.com/LucasNGRE/FlipIt`

---

## Contenu

| Fichier | Contenu | Sert à documenter |
|---|---|---|
| [`00_inventaire.md`](00_inventaire.md) | Arborescence, dépendances avec versions exactes et rôles, versions Node/npm, métriques et volume de code | Contexte technique, choix des technologies |
| [`01_schema_bdd.md`](01_schema_bdd.md) | Schéma Prisma intégral, SQL de création généré, MPD tabulaire, migrations, diagramme Mermaid | Conception et gestion de la base de données |
| [`02_code_extraits.md`](02_code_extraits.md) | Code source intégral de 40 fichiers représentatifs, groupés par domaine fonctionnel | Extraits de code pour toutes les compétences |
| [`03_securite.md`](03_securite.md) | Inventaire des mécanismes de sécurité avec fichier et fonction, puis 10 faiblesses constatées | Sécurité, veille technologique |
| [`04_git_historique.md`](04_git_historique.md) | Chiffres, branches, chronologie en 7 phases, conventions de commit | Gestion de projet, démarche |
| [`05_tests_resultats.md`](05_tests_resultats.md) | Stratégie de test, plan de tests, traçabilité exigences → tests, **sortie réelle de `vitest run`**, anomalies découvertes | Préparation et exécution des plans de tests |
| [`06_environnement.md`](06_environnement.md) | Variables d'environnement (noms uniquement), double base Neon, installation depuis zéro, contraintes, déploiement Vercel | Environnement de développement, déploiement |
| [`07_ui_parcours.md`](07_ui_parcours.md) | 31 pages décrites, 3 parcours en diagrammes Mermaid, ~50 cas d'utilisation par acteur, **liste des captures d'écran à prendre** | Conception front-end, cas d'utilisation, annexes |
| [`99_manques.md`](99_manques.md) | Ce qui manque au dépôt, classé par nature, avec recommandation « à produire » ou « à assumer », et récapitulatif de priorités | Préparation avant rédaction |
| [`captures/`](captures/) | **38 captures d'écran** générées automatiquement avec Playwright depuis l'application en fonctionnement, avec index détaillé | Annexes visuelles |

---

## Points saillants à connaître avant de rédiger

**Ce qui a été ajouté au projet pour ce dossier.** Le projet n'avait aucun test. Une
campagne complète a été menée : mise en place de Vitest, extraction de la logique métier
en modules purs (`lib/domain/`), écriture de **141 tests** couvrant cas nominaux, limites
et invalides, tous au vert. Détail en `05_tests_resultats.md`.

**Trois défauts réels découverts par ces tests, et corrigés.**

1. **Contournement de l'authentification administrateur** (critique) — la comparaison
   `cookie !== process.env.ADMIN_TOKEN` accordait l'accès quand la variable
   d'environnement était absente (`undefined !== undefined` vaut `false`). Le middleware
   ne couvrant pas `/api/admin/*`, toute l'API d'administration devenait publique.
2. **Suppression d'annonce sans authentification** (critique) — `DELETE /api/items/[id]`
   ne lisait aucune session : n'importe qui pouvait supprimer l'annonce de n'importe qui.
3. **Aucune validation à la création d'annonce** (moyen) — champs bruts transmis à Prisma
   avec `as any`.

**Un quatrième défaut découvert par la campagne de captures.** Le formulaire de connexion
administrateur écrasait le message renvoyé par l'API et affichait « Mot de passe
incorrect » même sur un `429` : le verrouillage anti-force brute fonctionnait côté
serveur mais restait invisible côté utilisateur. Corrigé, et la preuve visuelle figure
dans `captures/38_admin_rate_limit.png`.

Ces découvertes constituent la meilleure matière du dossier pour les sections sécurité,
tests et veille : elles montrent un plan de tests qui remplit son office plutôt qu'un
plan de tests décoratif. Le fait qu'unitaires et exploratoires aient trouvé des défauts
**différents** illustre en outre la complémentarité des deux approches.

**Ce qui reste à faire manuellement.** Les diagrammes UML de cas d'utilisation et de
séquence (matière complète en `07_ui_parcours.md` §6), une douzaine de captures liées au
paiement et aux commandes qui n'ont pas pu être automatisées (raisons détaillées en
`captures/README.md`), et l'arbitrage sur les points listés en `99_manques.md` §F.

---

## Garanties sur ces documents

- **Aucune valeur secrète** n'y figure : seuls les **noms** de variables d'environnement
  sont cités. Aucun fichier `.env` n'est versionné dans le dépôt, ce qui a été vérifié.
- **Rien n'est inventé.** Tout élément absent du dépôt est signalé comme tel dans
  `99_manques.md` plutôt que fabriqué.
- **La sortie de tests est authentique** : `05_tests_resultats.md` contient la sortie
  brute de `npx vitest run --reporter verbose`, y compris l'échec initial du test qui a
  révélé la faille d'authentification administrateur.
- **Aucune base de données n'a été modifiée.** Les tests mockent intégralement Prisma,
  Pusher et Stripe ; aucun n'accède au réseau. Le SQL de `01_schema_bdd.md` a été généré
  hors ligne, sans connexion.
