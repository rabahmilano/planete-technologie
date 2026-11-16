# Analyse du projet Planète Technologie (lecture seule, 16 nov. 2026)

Copie locale : `~/workspace/planete-technologie`, branche locale `zcode/ameliorations` (snapshot de main). Rien modifié, rien commité, rien installé.

## 1. Stack et architecture

- **Monorepo à 2 dossiers** : `backend/` (Express) + `frontend/` (Next.js). Pas de README, pas de `.env.example`, pas de `vercel.json` / Dockerfile.
- **Backend** : Node ESM (`"type": "module"`), Express 4.19.2, Prisma 5.16.2, MySQL (`datasource db { provider = "mysql" }`, `backend/prisma/schema.prisma`), JWT (`jsonwebtoken` 9.0.3), bcrypt 6, helmet, express-rate-limit, express-validator. Point d'entrée `backend/server.js`.
- **Frontend** : Next.js 13.3.2 (pages router, `trailingSlash: true`, `reactStrictMode: false`), React 18.2, MUI 5.12.2, template Vuexy (`vuexy-nextjs-admin-template` 1.2.0), Redux Toolkit, CASL (ACL), ApexCharts/Recharts. `.nvmrc` = `lts/*`.
- **Communication** : le frontend appelle le backend en REST via axios (`frontend/src/configs/axiosConfig.js`, `baseURL: process.env.NEXT_PUBLIC_BASE_URL`). Le token JWT est stocké en `localStorage` (`accessToken` / `refreshToken`) et envoyé en `Authorization: Bearer`. Intercepteur axios : sur 403, tentative de refresh via `POST {BASE_URL}auth/refresh-token`, sinon redirection `/login`.
- **CORS** : manuel dans `server.js` (le paquet `cors` est installé mais jamais utilisé). Origines autorisées : `localhost:3000`, `127.0.0.1:3000`, `localhost:3001`, `https://ptech-six.vercel.app`. Les requêtes `OPTIONS` d'une autre origine reçoivent 403.
- **Déploiement** : frontend sur Vercel (`ptech-six.vercel.app`, confirmé par le CORS). L'hébergement du backend n'est documenté nulle part dans le repo (pas de config de déploiement). `backend/request.rest` vise `http://localhost:3001`.
- **Variables d'environnement requises** :
  - Backend : `DATABASE_URL` (MySQL — base TiDB Cloud de RABAH), `JWT_SECRET`, `JWT_REFRESH_SECRET`, `PORT` (défaut 3000).
  - Frontend : `NEXT_PUBLIC_BASE_URL` (doit se terminer par `/` et inclure `/api/`, ex. `http://localhost:3001/api/` — les appels concatènent directement `commandes/stats`, `auth/login`…).

## 2. Modèle de données Prisma (`backend/prisma/schema.prisma`)

Base MySQL, 20 modèles, IDs `Int` manuels (pas d'`autoincrement`, génération par `max+1` via `getMaxValue` dans `backend/config/utils.js`).

- **Cœur achat/stock/vente** : `produit` (id_prd, désignation, `qte_dispo`) ; `categorie` ; `colis` (un lot acheté : prix devise/DZD, PU HT/TTC, qté achetée/stockée, compte payeur, catégorie, produit) avec 2 extensions 1-1 : `colis_classique` (droits de timbre, commission bancaire) et `colis_voyage` (lié à une `transaction_voyage`, prix en devise de destination) ; `commande` + `ligne_commande` (clé composite cde+prd, PU de vente) + `ligne_commande_colis` (traçabilité FIFO : quelle ligne de vente a consommé quel colis, en quelle quantité).
- **Argent** : `compte` (devise, type, solde actuel/bloqué, commission %, taux de change) ; `devise` ; `transfert` (source/dest, montants, taux) ; `crediter` (crédit d'un compte) ; `ajustement_compte` (corrections manuelles, annulables) ; `emprunt` + `remboursement` (statuts EN_COURS/SOLDE).
- **Dépenses** : `depense` (compte, nature, montants devise/DZD, voyage optionnel, annulable) ; `nature_dep` (contexte GLOBAL ou VOYAGE).
- **Voyages** : `voyage` (destination, dates, statut EN_PREPARATION/EN_COURS/CLOTURE, devise dest. défaut CNY, taux, coeff d'approche, compte par défaut) ; `transaction_voyage` (fournisseur, devise, taux, montant facturé, commissions paiement/banque).
- **Exceptions** : `sortie_exceptionnelle` (motifs : utilisation personnelle, perte livraison, casse/défectueux, vente à crédit, saisie douane ; statut de remboursement NON_APPLICABLE/EN_ATTENTE/REMBOURSE/REFUSE, liée à un crédit) + `ligne_sortie_colis`.
- **Utilisateurs** : `Utilisateur` (email unique, mot de passe hashé, rôle ADMIN/MANAGER/USER, statut ACTIF/SUSPENDU, refresh_token stocké en base, dernier login).
- Pas de dossier `prisma/migrations` : le schéma n'est pas versionné en migrations. `web_shop_it.sql` (77 Ko) est un dump phpMyAdmin (MySQL 8.4.7, 11 tables, généré 24 janv. 2026) — un instantané, pas une migration.

## 3. Routes API backend (toutes sous `/api/`, sauf `/api/auth/*` protégées par `verifyToken`)

| Base | Méthodes |
|---|---|
| `/api/auth` | POST `/register`, POST `/login`, POST `/refresh-token`, GET `/me` |
| `/api/devises` | POST `/addDevise`, GET `/allDevises` |
| `/api/comptes` | POST `/addCompte`, POST `/crediterCompte`, DELETE `/annuler-credit/:id`, GET `/allComptes`, GET `/historique-credit/:id`, GET `/bilan-global` |
| `/api/depenses` | POST `/addDepense`, GET `/` (filtrées), GET `/stats/global`, PATCH `/:id`, DELETE `/:id`, POST `/addNatDepense`, GET `/allNatDepense` |
| `/api/produits` | POST `/addCategorie`, GET `/allCategories`, GET `/search`, POST `/addProduit`, GET `/allProduitDisponible`, GET `/allMarchandiseDisponible`, GET `/search-autocomplete`, GET `/colisEnRoute` + `/stats`, PATCH/DELETE `/colis/:id`, GET `/historique` + `/stats`, PATCH `/historique/:id`, GET `/historique/charts/by-category|by-year|by-account|top-products`, GET `/historique-prix` + `/stats`, GET `/historique-prix/:id` et `/:id/colis`, GET `/dashboard/chart-transactions`, `/chart-articles`, `/analytics-all`, `/rolling-kpis`, `/ventes-recentes-top-produits` |
| `/api/commandes` | GET `/stats`, GET `/`, POST `/createCommande`, DELETE `/:id` |
| `/api/emprunts` | GET `/allEmprunts`, POST `/addEmprunt`, DELETE/PUT `/:id`, POST `/addRemboursement`, DELETE/PUT `/remboursement/:id` |
| `/api/voyages` | GET `/`, GET `/:id`, POST `/`, PUT `/:id`, DELETE `/:id`, PUT `/:id/statut`, POST `/:id/addTransaction`, DELETE `/transaction/:id` |
| `/api/transferts` | POST `/createTransfert`, GET `/getAllTransferts`, DELETE `/deleteTransfert/:id` |
| `/api/ajustements` | POST `/`, GET `/`, DELETE `/:id` |
| `/api/sorties-exceptionnelles` | GET `/getSorties`, POST `/declarerSortie`, POST `/rembourserSortie/:id`, PATCH `/refuserRemboursement/:id`, `/modifierSortie/:id`, `/annulerDecision/:id`, DELETE `/supprimerSortie/:id` |

Bon point : les écritures sensibles (commandes, transferts, dépenses, comptes…) utilisent `prisma.$transaction` (34 occurrences, 9 contrôleurs) — soldes et stocks sont mis à jour atomiquement. Le plus gros contrôleur est `produitController.js` (1 747 lignes), suivi de `voyageController.js` (824 lignes).

## 4. Pages frontend et fonctionnalités existantes

Navigation (`frontend/src/navigation/vertical/index.js`) :

- **/home** — tableau de bord : KPI (cartes, KPI glissants), graphiques transactions et articles, états hebdo/mensuel, top produits, dernières commandes (`src/views/pages/home/`).
- **/produits/liste** — 6 onglets : Produits en Stock (cartes + jauge de stock), Produits Vendus, Statistiques des Ventes, Historique des achats (tableau + graphiques + KPI), À Recevoir (colis en route), Historique des Prix (fiches produit, graphiques de prix, détail colis par produit).
- **/produits/ajouter** — ajout d'un colis/produit (+ ajout de catégorie). **/produits/declarerSortie** et **/produits/sorties-exceptionnelles** — sorties exceptionnelles (déclaration, remboursement, refus, modification).
- **/commandes/liste** — liste + filtres + KPI ; **/commandes/ajouter** — création avec panier, ajout rapide, dernières commandes.
- **/depenses/mesDepenses** — tableau, graphiques, stats globales ; **/depenses/ajouter** — formulaire + types de dépense.
- **/emprunts/mesEmprunts**, **/emprunts/ajouter**, **/emprunts/rembourser** — emprunts, remboursements, KPI.
- **/voyages/liste** (démarrer/clôturer/rouvrir), **/voyages/ajouter**, **/voyages/[id]** — détail très complet : infos globales, transactions fournisseurs, dépenses du voyage, articles achetés, récapitulatif financier.
- **/settings/comptes** — comptes, créditer, transferts, ajustements, historiques ; **/settings/devises** — devises et taux de change.
- **/login**, **/register**, **/forgot-password** (page présente ; pas de route backend de réinitialisation — à vérifier), pages d'erreur 401/404/500.
- Authentification : `AuthContext` + gardes `AuthGuard`/`GuestGuard`/`AclGuard`, rôles CASL (`src/configs/acl.js` : ADMIN = manage all, les autres = read only).

## 5. Lancer le projet en local

```bash
# Backend
cd backend
npm install
# créer .env : DATABASE_URL="mysql://user:pass@host:4000/web_shop_it?sslaccept=strict"
#              JWT_SECRET=...  JWT_REFRESH_SECRET=...  PORT=3001
npx prisma generate
npm start            # node server.js (port 3000 par défaut, 3001 si PORT=3001)

# Frontend (autre terminal)
cd frontend
npm install
# créer .env.local : NEXT_PUBLIC_BASE_URL=http://localhost:3001/api/
npm run dev          # Next.js sur http://localhost:3000
```

Prérequis : Node LTS (`.nvmrc` = `lts/*`), accès à la base MySQL/TiDB Cloud. Aucun `node_modules` ni `.env` n'est présent dans la copie locale.

## 6. Problèmes, risques et dettes techniques repérés

1. **Faille de sécurité — inscription publique avec rôle libre** : `POST /api/auth/register` est public (`server.js` : pas de `verifyToken` sur `/api/auth`) et `authController.js` accepte `role` dans le corps (`role: role || "USER"`). N'importe qui peut créer un compte **ADMIN** avec un simple curl. À corriger en priorité (forcer `USER` côté serveur ou protéger la route).
2. **`requireRole` jamais utilisé** : défini dans `middlewares/authMiddleware.js`, importé nulle part. Les rôles MANAGER/USER ne sont donc pas appliqués côté API — seul le token est vérifié ; un USER peut appeler toutes les routes d'écriture. Côté frontend, l'ACL CASL ne donne que `read` aux non-admin, mais ce n'est qu'une protection d'interface.
3. **IDs générés par `max+1`** (`getMaxValue`, `backend/config/utils.js`) sur tous les modèles : risque de collision en cas de créations simultanées (pas d'autoincrement, pas de séquence). Préférer l'autoincrement MySQL ou des IDs générés par la base.
4. **`npm run dev` backend cassé** : le script utilise `nodemon`, qui n'est ni dans `dependencies` ni dans `devDependencies` de `backend/package.json`.
5. **Aucun test** : aucun fichier de test, aucun script de test, ni backend ni frontend.
6. **Onglets factices** : dans `frontend/src/pages/produits/liste/index.js` (lignes 19-20), « Produits Vendus » et « Statistiques des Ventes » affichent seulement « Contenu pour Produits Vendus / Statistiques des Ventes » — ce sont des placeholders.
7. **Code mort** : `frontend/src/@fake-db/` (base fictive Vuexy, jamais importée), `frontend/src/pages/second-page/` (page démo, présente dans la nav horizontale), `frontend/src/views/pages/produits/toutColis/` (vue jamais importée). Route commentée `// router.get("/dashboard/sales-purchases-chart", ...)` dans `produitRouter.js`.
8. **Rate limit très permissif** : 10 000 requêtes / 15 min par IP sur `/api/` (`server.js`).
9. **Pas de README ni `.env.example`, pas de migrations Prisma** : impossible de recréer la base proprement depuis le repo seul (seul le dump `web_shop_it.sql` existe). `ptech.txt` est ignoré à la racine (`.gitignore`) sans explication.
10. **Dépendances anciennes** : Next 13.3.2 (2023), MUI 5.12, `@mui/lab` alpha, `react-credit-cards` 0.8.3, `babel-eslint` ; `cors` installé mais inutilisé (CORS manuel) ; `body-parser` redondant avec `express.json()`.
11. **Refresh token en base mais pas de révocation côté `logout`** : pas de route de déconnexion ; le refresh token reste valide 7 jours jusqu'à écrasement par une nouvelle connexion.
12. **Pas de page « mot de passe oublié » fonctionnelle côté API** : la page `/forgot-password` existe, aucune route backend correspondante.

## 7. Propositions d'améliorations (par valeur pour ce business)

1. **Corriger la faille d'inscription + appliquer les rôles côté API** (priorité absolue) : forcer `role: "USER"` dans `register`, brancher `requireRole` sur les routes d'écriture/suppression (ADMIN seul pour supprimer/annuler), ajouter une route `POST /api/auth/logout` qui révoque le refresh token.
2. **Tableau de bord « Marge & rentabilité »** : marge réelle par produit (prix de vente − coût TTC du colis consommé, via `ligne_commande_colis`), marge par catégorie et par voyage, top/flop produits — les données existent déjà, il manque la vue. C'est le chiffre que RABAH suit déjà dans sa base (47,7 % de marge globale).
3. **Alertes stock dormant et réassort** : page/liste des produits en stock depuis plus de X mois (valeur immobilisée), avec coût et prix de vente suggéré ; alerte « rupture imminente » (qte_dispo faible) et « colis en route » à relancer. Reprend directement l'analyse du stock dormant (24 produits, ~186 000 DZD immobilisés).
4. **Fiche produit unifiée « historique des prix » enrichie** : la page existe déjà, mais ajouter le coût moyen pondéré, l'évolution du coût d'achat (ex. FENVI MT7922 +17,4 %), et une alerte quand le coût d'un nouveau colis dépasse le coût moyen historique.
5. **Module Sourcing / comparaison d'offres** (nouvelle partie) : enregistrer des offres fournisseurs (AliExpress/Temu/Chine, prix livré, lien, date) par produit, comparer automatiquement au coût historique et au prix de vente, et calculer la marge prévisionnelle — exactement le travail de vérification fait à la main aujourd'hui (FENVI 20,59 $, AX1800 7,73 $…).
6. **Module Vente locale / Marketplace** (nouvelle partie) : suivi des annonces (produit, prix publié, plateforme, statut vendu/en ligne), relié au stock pour déduire automatiquement les quantités vendues — remplace le suivi manuel des lots à publier.
7. **Remplir les deux onglets vides** (« Produits Vendus », « Statistiques des Ventes ») en réutilisant les endpoints existants (`/commandes/stats`, `/produits/dashboard/*`) : gain visible immédiat, sans nouvelle API.
8. **Hygiène et fiabilité** : ajouter un README + `.env.example`, générer les migrations Prisma, passer les IDs en autoincrement, réparer `npm run dev` (ajouter nodemon en devDependency ou utiliser `node --watch`), supprimer le code mort (fake-db, second-page, toutColis), resserrer le rate limit, et ajouter quelques tests sur les calculs critiques (marges, soldes de comptes, FIFO des colis).

## Limites de cette analyse

Analyse statique uniquement (fichiers lus, code non exécuté, base non connectée, app déployée non testée). Les montants et chiffres business cités viennent du contexte connu de RABAH, pas du code. Le lien entre ce projet et ZCode : le projet est prêt à être ouvert dans ZCode (dossier local sur la branche `zcode/ameliorations`), mais le quota ZCode n'a pas pu être consommé depuis la VM au moment de l'analyse (erreur 1113 / « Could not load plans »).
