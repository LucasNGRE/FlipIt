# Captures d'écran — annexes du dossier

38 captures générées automatiquement le **28 août 2026** avec Playwright (Chromium),
depuis l'application réelle en fonctionnement sur la base de **développement**
(`ep-tiny-violet`, 11 utilisateurs, 19 annonces, 6 conversations, 3 commandes,
3 signalements).

Script : [`my-app/scripts/captures.mjs`](../../my-app/scripts/captures.mjs)
Reproduction : `npm run dev` dans un terminal, puis `node scripts/captures.mjs`.
Le filtre `ONLY=1,4,17` permet de ne rejouer que certaines captures.

**Résolutions :** desktop 1440 × 900 et mobile 390 × 844, en densité ×2 (rendu net à
l'impression). Les vues marquées « page entière » capturent le document complet,
au-delà de la fenêtre visible.

---

## Pages publiques

| # | Fichier | Vue | Ce qu'elle démontre |
|---|---|---|---|
| 01 | `01_accueil.png` | Desktop, page entière | Page d'accueil complète : bannière, bandeau de statistiques, grille de 17 annonces, catégories, marquee, pied de page |
| 02 | `02_accueil_filtre_categorie.png` | Desktop | Catalogue filtré sur la catégorie *Deck*, avec filtres d'état et compteur de résultats |
| 03 | `03_accueil_mobile.png` | Mobile, page entière | Adaptation responsive de l'accueil |
| 04 | `04_article_detail.png` | Desktop, page entière | Fiche annonce : images, prix, état, encart vendeur, actions, bouton de signalement |
| 05 | `05_article_mobile.png` | Mobile, page entière | Fiche annonce en mobile |
| 06 | `06_profil_vendeur.png` | Desktop, page entière | Profil public d'un vendeur et ses annonces |
| 07 | `07_login.png` | Desktop | Connexion : identifiants, Google, bascule de visibilité du mot de passe |
| 08 | `08_register.png` | Desktop, page entière | Formulaire d'inscription |
| 09 | `09_register_erreur_validation.png` | Desktop, page entière | Inscription avec entrées invalides — validation côté client |
| 10 | `10_about.png` | Desktop, page entière | Page À propos |
| 11 | `11_privacy.png` | Desktop, page entière | Politique de confidentialité (élément RGPD) |
| 12 | `12_contact.png` | Desktop, page entière | Page Contact |
| 13 | `13_accueil_theme_sombre.png` | Desktop, page entière | Accueil en thème sombre — gestion du thème |
| 14 | `14_article_theme_sombre.png` | Desktop, page entière | Fiche annonce en thème sombre |
| 15 | `15_modal_portfolio.png` | Desktop | Modal d'avertissement « site de démonstration, paiements fictifs » |

## Espace membre (session `lucas@flipit.com`)

| # | Fichier | Vue | Ce qu'elle démontre |
|---|---|---|---|
| 16 | `16_signalement_modal.png` | Desktop | Modal de signalement ouverte — modération côté utilisateur |
| 17 | `17_inbox_conversation.png` | Desktop | Messagerie : liste des conversations et fil de discussion temps réel |
| 18 | `18_inbox_mobile.png` | Mobile | Messagerie en mobile |
| 19 | `19_offre_dialog.png` | Desktop | Dialogue « Proposer un prix » ouvert dans la conversation — négociation |
| 20 | `20_add_item_etape1.png` | Desktop, page entière | Création d'annonce, étape 1 du formulaire multi-étapes |
| 21 | `21_likes.png` | Desktop, page entière | Annonces mises en favori |
| 22 | `22_orders.png` | Desktop, page entière | Suivi des commandes |
| 23 | `23_settings.png` | Desktop, page entière | Paramètres du compte, dont suppression (RGPD) |
| 24 | `24_seller_onboarding.png` | Desktop, page entière | Activation du compte vendeur Stripe Connect |
| 25 | `25_header_menu_mobile.png` | Mobile | Menu de navigation mobile déployé |

## Espace d'administration

| # | Fichier | Vue | Ce qu'elle démontre |
|---|---|---|---|
| 26 | `26_admin_login.png` | Desktop | Connexion administrateur — session distincte de NextAuth |
| 27 | `27_admin_dashboard.png` | Desktop, page entière | Tableau de bord et statistiques |
| 28 | `28_admin_users.png` | Desktop, page entière | Gestion des utilisateurs, suspension |
| 29 | `29_admin_products.png` | Desktop, page entière | Gestion des annonces |
| 30 | `30_admin_reports.png` | Desktop, page entière | Signalements regroupés par cible |
| 31 | `31_admin_orders.png` | Desktop, page entière | Commandes et actions financières |
| 32 | `32_admin_disputes.png` | Desktop, page entière | Litiges |
| 33 | `33_admin_chargebacks.png` | Desktop, page entière | Impayés remontés par Stripe |
| 34 | `34_admin_finances.png` | Desktop, page entière | Vue financière et export |
| 35 | `35_admin_logs.png` | Desktop, page entière | Journal des actions d'administration — traçabilité |
| 36 | `36_admin_search.png` | Desktop, page entière | Recherche globale |
| 37 | `37_admin_mobile_drawer.png` | Mobile | Navigation d'administration en mobile |
| 38 | `38_admin_rate_limit.png` | Desktop | **Blocage après 5 tentatives** : « Trop de tentatives. Réessayez dans 15 min. » — limitation de débit anti-force brute |

---

## Notes importantes

**La capture 38 a révélé un bug, désormais corrigé.** Au premier passage, elle affichait
« Mot de passe incorrect » alors que l'API renvoyait bien un `429`. Le handler de
`app/admin/login/page.tsx` écrasait le message de l'API par un texte générique : un
administrateur bloqué ne pouvait pas savoir qu'il l'était et continuait à ressaisir son
mot de passe. La capture actuelle montre l'état après correction. Détail en
[`../05_tests_resultats.md`](../05_tests_resultats.md) §5, anomalie A4.

**Aucune donnée n'a été écrite en base.** Les formulaires de création d'annonce, de
signalement et d'offre ont été ouverts et renseignés mais **jamais soumis**.

**Avant de joindre ces captures au dossier**, relire celles de la messagerie (17, 18, 19)
et de l'administration (28, 30, 31) : elles affichent des noms et messages de comptes de
test (« Tyler Durden », « Lucas Test », « salut bg ») qu'il peut être préférable de
remplacer par des échanges plus présentables.

## Ce qui n'a pas pu être capturé automatiquement

| Vue attendue | Raison |
|---|---|
| Tunnel de paiement (adresse, Stripe Elements) | Aucun vendeur de la base de développement n'a terminé l'onboarding Stripe Connect (`stripeOnboarded = false` pour les 11 comptes). L'API `payment-intent` répond « Le vendeur n'a pas encore configuré son compte de paiement » |
| Page de remerciement après achat | Dépend du tunnel de paiement |
| Commande au statut `paid` avec bouton « Expédier » | Les 3 commandes de la base sont `confirmed` ou `refunded` ; aucune n'est `paid` ni `shipped` |
| Commande `shipped` avec échéance de 48 h | Idem |
| Formulaire d'ouverture de litige | Nécessite une commande `paid` ou `shipped` |
| Offre acceptée avec compte à rebours de 24 h | Les 8 offres de la base sont toutes `rejected` |
| Onboarding Stripe Connect au-delà de l'écran d'accueil | Redirige vers le domaine Stripe, hors du périmètre de l'application |
| Étape 6 (récapitulatif) de la création d'annonce | Nécessite de parcourir les 6 étapes avec upload de photos ; capturable manuellement en quelques minutes |

Ces vues restent à prendre **manuellement**, en jouant un parcours complet avec un compte
vendeur réellement onboardé sur Stripe en mode test. Voir
[`../07_ui_parcours.md`](../07_ui_parcours.md) §7 pour la liste complète.
