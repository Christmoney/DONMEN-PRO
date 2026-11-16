# DONMEN — Prompt maître pour l'agent de code (VS Code)

> Dépose ce fichier à la racine du dépôt sous le nom `PROMPT-MAITRE.md`. Il fait foi pour tout le projet. Version 1.0 — alignée sur le cahier des charges v0.10 et sur les 10 maquettes.

---

## 0. Mode d'emploi pour l'agent

Tu es un développeur senior full-stack (React, TypeScript, PostgreSQL). Tu construis l'application DONMEN de façon professionnelle, précise et sans bug.

Règles de travail, sans exception :

1. Lis ce document EN ENTIER avant d'écrire une ligne. Les décisions de la section 2 sont figées : ne les remets pas en cause.
2. Travaille phase par phase (section 14). N'ouvre la phase N+1 que lorsque tous les critères de sortie de la phase N sont verts (commandes de la section 13).
3. N'invente rien. Si une information manque (écran sans maquette, valeur inconnue), applique le design system, note l'hypothèse dans `NOTES.md` et continue ; ne bloque pas.
4. Aucune fonctionnalité hors périmètre (section 15).
5. Tout bug découvert = d'abord un test qui échoue, ensuite la correction.
6. Aucun secret dans le dépôt (clés, mots de passe, jetons). Utilise `.env.example` et les secrets de Supabase.
7. Chaque phase se termine par un commit propre et un compte rendu au format de la section 16.
8. Avant d'écrire du code pour une phase, présente un plan court (fichiers à créer, tables à migrer, tests à écrire) et exécute-le sans attendre, sauf si une décision de la section 2 est en conflit : dans ce cas, arrête-toi et demande.
9. Le propriétaire suit la construction EN DIRECT : respecte la section 17 (aperçu toujours lançable, captures d'écran, `PROGRESS.md`).

---

## 1. Le produit en bref

DONMEN est un salon de coiffure au Cameroun. L'application permet de **réserver un coiffeur qui vient à domicile**. Slogan officiel : **« LE ROI DU LOOK »**. À terme, DONMEN deviendra une marque déposée de produits capillaires ; l'application recommandera alors des produits adaptés aux cheveux de chaque client grâce à sa « fiche cheveux ». La boutique n'est PAS dans cette version.

Utilisateurs : **client**, **coiffeur** (équipe du salon, sans commission), **admin**.

Priorité absolue : résoudre le vrai problème (réserver un coiffeur à domicile simplement) et la facilité d'usage. Test de référence : une personne qui n'a jamais vu l'application réserve un coiffeur sans aide en moins de 3 minutes.

Contexte : Cameroun, prix en FCFA, français par défaut + anglais, Android majoritaire, connexion souvent lente, téléphones d'entrée de gamme.

---

## 2. Décisions figées

1. **Marque** : nom « DONMEN », slogan « LE ROI DU LOOK » TOUJOURS affiché juste sous le nom DONMEN, sans jamais les séparer, dans l'en-tête de chaque écran.
2. **Titre honorifique « DON »** : « DON » n'est PAS un nom d'utilisateur. C'est un titre (comme « chef », « maître ») que l'application donne à tout utilisateur, client ou coiffeur. Salutation : première connexion « Bienvenue sur DONMEN, DON {prénom} ! », ensuite « Salut DON {prénom} ! ». Sans émoji. Prénom vide : « Salut DON ! ». Le titre vit dans une seule constante `HONORIFIC = "DON"` (`src/config/brand.ts`). Salutation affichée EN PERMANENT en haut de l'Accueil client et de `/pro` (composant `Greeting`), jamais seulement en notification.
3. **Parcours d'entrée** : écran « Bienvenue sur DONMEN » avec « Je suis client » / « Je suis coiffeur » / « Se connecter ». Seules 4 pages sont publiques : `/bienvenue`, `/connexion`, `/inscription/client`, `/inscription/coiffeur`. Tout le reste exige une session.
4. **Comptes** : nom d'utilisateur unique (connexion), prénom obligatoire, téléphone (+237) unique, mot de passe, genre. Connexion par nom d'utilisateur OU téléphone. Pas d'OTP ni d'e-mail au MVP. Mot de passe oublié : « Contactez l'équipe DONMEN ».
5. **Rôles** : `client`, `coiffeur`, `admin`, dans une table séparée `user_roles`. Impossible de s'inscrire comme admin. Le premier admin est créé manuellement par SQL documenté.
6. **Vérification des coiffeurs (KYC)** : REPORTÉE (décision du 16 novembre 2026), à faire après la création de la base de données. Aucune table, aucun bucket et aucune interface KYC pour l'instant. À la place : le paramètre `hairdresser_auto_approval` (section 8).
7. **Volet « coiffure entre femmes »** : colonnes préparées (`gender`, `serves`, `women_only`), aucune interface.
8. **Paiement** : espèces à la fin de la prestation. Pas de paiement en ligne.
9. **Prix** : entiers en FCFA, jamais de décimales. Format affiché : `15 000 FCFA`.
10. **Fuseau** : stockage en UTC (`timestamptz`), calculs et affichages en `Africa/Douala`.
11. **Langues** : FR (défaut) et EN, tous les textes dans des fichiers de traduction, jamais en dur. Le slogan n'est pas traduit.
12. **Budgets de performance** : chaque image < 100 Ko ; JavaScript initial < 200 Ko gzip ; 2 familles de polices ; jamais l'ancien logo de 2 Mo.
13. **Mot de passe** : minimum 6 caractères (valeur de la maquette), constante `MIN_PASSWORD_LENGTH` pour passer facilement à 8.

---

## 3. Stack et outils (versions à figer dans `package.json`)

Domaine
Choix

Runtime
Node 20 LTS, pnpm

Front
React 18, TypeScript en mode `strict`, Vite

Style
Tailwind CSS 3, shadcn/ui (Radix), `lucide-react` (imports nommés uniquement)

Routage
React Router 6

Données
TanStack Query 5, `@supabase/supabase-js` 2

Formulaires
react-hook-form + zod (schémas partagés front/serveur quand c'est possible)

i18n
i18next + react-i18next

PWA
`vite-plugin-pwa`

Polices
`@fontsource/playfair-display` (700) et `@fontsource/inter` (400, 600), sous-ensemble latin, auto-hébergées

Backend
Supabase : Auth, Postgres, Storage, Edge Functions (Deno), migrations via Supabase CLI

Qualité
ESLint (règles TypeScript + a11y) + Prettier, Vitest + React Testing Library, Playwright, pgTAP pour la base

CI
GitHub Actions

Interdits : `any` implicite, `// @ts-ignore`, bibliothèques lourdes (moment, lodash entier, UI kit complet), CSS en dur avec couleurs hexadécimales dans les composants.

---

## 4. Structure du dépôt

```
/
├─ PROMPT-MAITRE.md        (ce fichier)
├─ NOTES.md                (hypothèses et décisions prises par l'agent)
├─ .env.example            (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
├─ public/brand/           (logo et icônes fournis par le propriétaire)
├─ src/
│  ├─ app/                 (routes, garde de session, providers)
│  ├─ config/brand.ts      (HONORIFIC, SLOGAN, MIN_PASSWORD_LENGTH, TIMEZONE)
│  ├─ components/ui/       (shadcn/ui)
│  ├─ components/brand/    (BrandMark, Greeting, BottomNav, Stepper, Timeline…)
│  ├─ features/
│  │  ├─ auth/  hairdressers/  booking/  appointments/
│  │  ├─ hair-profile/  pro/  admin/  reviews/  notifications/
│  ├─ lib/                 (supabase client, format FCFA/dates, validators zod)
│  ├─ i18n/locales/fr.json, en.json
│  └─ styles/tokens.css
├─ supabase/
│  ├─ migrations/          (SQL numérotés, réversibles quand c'est possible)
│  ├─ functions/login, signup/  (Edge Functions)
│  ├─ seed.sql             (données de démonstration, JAMAIS en production)
│  └─ tests/               (pgTAP)
├─ e2e/                    (Playwright)
└─ .github/workflows/ci.yml
```

Fichiers fournis par le propriétaire à placer dans `public/brand/` : `donmen-logo-640.webp`, `donmen-couronne-160.webp`, `donmen-icon-512.png`, `donmen-icon-192.png`, `donmen-icon-180.png`, `donmen-icon-32.png`. S'ils sont absents, utilise un espace réservé et signale-le dans `NOTES.md`.

---

## 5. Design system

Tokens CSS (variables HSL pour shadcn/ui, dans `src/styles/tokens.css`) :

Rôle
Hex
HSL

fond de page
`#FAF8F2`
45 44% 96%

bleu royal (primaire)
`#00257C`
222 100% 24%

bleu foncé
`#001A57`
222 100% 17%

or (accent)
`#D9A62E`
42 69% 52%

or clair
`#F0D68A`
45 77% 74%

texte
`#0B0F1A`
224 41% 7%

texte secondaire
`#5B6270`
220 10% 40%

bordure champs
`#CFC8B6`
43 21% 76%

bordure légère
`#E8E2D4`
42 30% 87%

carte / surface
`#FFFFFF`
0 0% 100%

Règles :

- Mobile-first, base 390 px. Sur grand écran, l'application reste centrée dans une colonne de 480 px maximum sur fond neutre.
- Typographie : titres Playfair Display 700 (titre de page 22 px, de section 20 px, grand titre d'accueil 25 px) ; texte Inter 400/600 (courant 15-16 px, secondaire 13 px, aide 12 px). Les champs de saisie font au moins 16 px.
- Cibles tactiles ≥ 44 px. Contraste AA. Aucun émoji dans l'interface.
- L'or n'est jamais utilisé pour du petit texte sur fond clair.

Composants à créer (chacun testé) :

- **BrandMark** : fond `#00257C`, hauteur 56-64 px, couronne dorée à gauche, « DONMEN » en Playfair 22 px or `#D9A62E` (espacement 1 px), dessous « LE ROI DU LOOK » en Inter 9 px semi-gras, espacement 2,5 px, `#F0D68A`. Variante avec « ‹ Retour » (blanc, 15 px) à gauche et la marque alignée à droite.
- **BottomNav** : fixe, 72 px, fond blanc, bordure haute `#E8E2D4`, 5 onglets (Accueil, Coiffeurs, Mes cheveux, Mes RDV, Profil), icônes contour 22 px (maison, deux personnes, goutte, calendrier, utilisateur), libellé 11 px ; actif `#00257C` semi-gras, inactif `#5B6270`.
- **Button** : principal (fond or, texte `#001A57` semi-gras 16 px, 48 px de haut, rayon 12 px, pleine largeur) ; secondaire (fond blanc, bordure 1,5 px `#00257C`, texte `#00257C`) ; état chargement et désactivé.
- **Card** : fond blanc, rayon 16 px, padding 14 px, ombre `0 1px 4px rgba(0,26,87,.12)`, marges `0 20px 12px`.
- **Chip** : pastille (rayon 999 px), bordure `#CFC8B6`, fond blanc, 14 px, padding 10×14 ; sélectionnée : fond `#00257C`, texte blanc.
- **Field** : libellé visible 13 px au-dessus, champ 48 px, rayon 12 px, bordure `#CFC8B6`, aide 12 px dessous, message d'erreur sous le champ, `aria-describedby`.
- **Avatar** : cercle 44 px, fond `#00257C`, initiale en or.
- **Greeting**, **Stepper** (5 segments de 5 px), **Timeline** (points de 14 px : faits `#00257C`, restants `#CFC8B6`), **Badge de statut**, **Skeleton**, **EmptyState**, **ErrorState** (avec bouton « Réessayer »).

---

## 6. Écrans et routes

Les textes ci-dessous sont EXACTS (français). Les traductions anglaises sont à produire.

### Publics

**`/bienvenue`** — fond bleu `#00257C` plein écran, contenu centré. Logo complet (`donmen-logo-640.webp`, largeur max 80 %), puis « LE ROI DU LOOK » (Inter 13 px semi-gras, espacement 4 px, `#F0D68A`), puis « Bienvenue sur DONMEN » (Playfair 26 px, blanc), puis « Votre coiffeur, chez vous. » (15 px, `#F0D68A`). Boutons pleine largeur : « Je suis client » (principal) et « Je suis coiffeur » (fond transparent, bordure `#F0D68A`, texte blanc). En bas : « Déjà un compte ? » + lien « Se connecter ».

**`/inscription/client`** — en-tête avec « ‹ Retour ». Titre « Créer mon compte client », sous-titre « Cinq informations suffisent. ». Champs : Nom d'utilisateur (aide « 3 à 20 caractères. Il sert à vous connecter. »), Prénom (placeholder « Votre prénom », aide « Nous vous accueillerons par « Salut DON Christ ! » »), Téléphone (placeholder « +237 6 XX XX XX XX »), Mot de passe (« 6 caractères minimum »), Genre (chips Femme / Homme), case « J'accepte les conditions d'utilisation et la politique de confidentialité. » (obligatoire), bouton « Créer mon compte », note « Votre adresse et votre fiche cheveux vous seront demandées plus tard, au moment de réserver. ».

**`/inscription/coiffeur`** — même structure. Titre « Créer mon compte coiffeur », sous-titre « Pour que vos clients vous fassent confiance. ». Champs : Nom d'utilisateur, Prénom, Nom (placeholders « Comme sur votre pièce d'identité »), Téléphone, Mot de passe, Genre, Ville et quartiers couverts, Spécialités (chips multiples : Tresses, Tissage, Coupe, Soins, Coloration), Années d'expérience (nombre), case CGU, bouton « Créer mon compte », note « L'équipe DONMEN vérifie votre profil avant qu'il apparaisse aux clients. Vos services, prix et horaires se règlent juste après, dans votre espace. ».

**`/connexion`** — titre « Content de vous revoir », sous-titre « Connectez-vous pour continuer. ». Champs « Nom d'utilisateur ou téléphone », « Mot de passe », bouton « Me connecter », lien « Mot de passe oublié ? » (affiche « Contactez l'équipe DONMEN pour réinitialiser votre mot de passe. »), puis « Pas encore de compte ? Créer un compte » (vers `/bienvenue`). Une seule erreur possible : « Identifiants incorrects ».

### Client (session + rôle client)

**`/` (Accueil)** — BrandMark ; `Greeting` (« Salut DON {prénom} ! » Playfair 24 px `#001A57`, dessous « Prêt pour votre prochaine coiffure ? » 13 px secondaire) ; carte héros bleue (rayon 20 px, marges 10×20, padding 22) : « Votre coiffeur, chez vous. » (Playfair 25 px `#F0D68A`), « Réservez en moins de 3 minutes. » (blanc 14 px), bouton « Réserver un coiffeur » ; titre « Coiffeurs en vedette » puis 2 cartes coiffeur ; carte or clair « Votre fiche cheveux » + « Dites-nous quel type de cheveux vous avez : on vous conseille les bons soins. » + bouton secondaire « Compléter » ; BottomNav.

**`/coiffeurs`** — BrandMark ; champ de recherche (« Rechercher un coiffeur ou un service ») ; chips « Zone », « Prix », « Note », « Disponible » ; liste paginée (20) de cartes coiffeur : avatar, nom affiché « Prénom N. » (prénom + initiale du nom), spécialités · quartier (13 px secondaire), à droite « 4,8/5 » et « dès X FCFA » ; BottomNav.

**`/coiffeurs/:id`** (pas de maquette) — même style : en-tête avec retour, avatar, nom, note, bio, galerie (images ≤ 100 Ko, lazy), liste des services (nom, durée, prix), avis récents, bouton principal « Réserver ».

**`/reserver/:coiffeurId`** (SANS BottomNav) — étape 3 sur 5 : « Étape 3 sur 5 » (13 px), titre « Date et heure » (Playfair 22 px), Stepper à 5 segments, 5 jours en grille de 5 colonnes (chips), « Créneaux libres » puis grille de 3 colonnes de chips d'heures. Barre fixe en bas (fond blanc, bordure haute, padding 14×20) : résumé « Tresses · 2 h 30 » à gauche, prix en gras à droite, bouton « Continuer ». Les 5 étapes : 1 service(s), 2 date et heure, 3 adresse (saisie + GPS optionnel + indications d'accès, adresses enregistrées pré-remplies), 4 récapitulatif en FCFA, 5 confirmation. Note : l'écran maquetté est l'étape de date et d'heure ; applique le même gabarit aux autres étapes.

**`/mes-rdv`** — chips « À venir » (actif) / « Passés » ; carte du prochain RDV : titre en gras, date en secondaire, badge de statut (« Accepté » : fond `#F0D68A`, texte `#001A57`, 12 px semi-gras) ; Timeline : « Demande envoyée », « Acceptée », « Coiffeur en route », « Prestation en cours », « Terminée » ; bouton secondaire « Annuler ». Section « Dernier rendez-vous » : carte « Terminé · avec {coiffeur} » + bouton principal « Réserver à nouveau » (rouvre `/reserver/:coiffeurId` avec mêmes services et adresse). « À venir » = pending, accepted, on_the_way, in_progress ; « Passés » = completed, cancelled, declined, expired.

**`/mes-cheveux`** — titre « Ma fiche cheveux », « Aide votre coiffeur et nous permet de vous conseiller. » ; groupes de chips : « Type de cheveux » (Lisses, Ondulés, Bouclés, Crépus), « Cuir chevelu » (Sec, Gras, Sensible), « Objectifs » (Hydratation, Pousse, Réparation, Protéger mes tresses) ; case « J'accepte que ces informations servent à mieux me conseiller. » ; bouton « Enregistrer ». Champs en plus de la maquette (même style) : porosité, longueur, coloration, allergies connues (texte libre). Historique des soins en dessous.

**`/profil`** (pas de maquette) — prénom modifiable, nom d'utilisateur et téléphone en lecture seule, adresses enregistrées (ajout/modif/suppression), langue FR/EN, « Se déconnecter », « Demander la suppression de mon compte » (enregistre une demande traitée par l'admin).

### Coiffeur (rôle coiffeur)

**`/pro`** — BrandMark ; `Greeting` (« Salut DON {prénom} ! », dessous « Voici votre espace DONMEN. »). Quand `hairdresser_auto_approval` est vrai, le profil est `approved` dès l'inscription et l'écran d'attente n'apparaît pas. Si le profil est `pending` : carte or clair « Profil en cours de vérification » + « L'équipe DONMEN vérifie votre profil. Vous serez visible par les clients dès qu'il sera validé. » + bouton secondaire « Se déconnecter ». Si le profil est `approved` : tableau de bord (RDV du jour, demandes en attente, gains du mois). Sous-pages (même style, sans maquette) : `/pro/demandes` (accepter/refuser), `/pro/agenda`, `/pro/services`, `/pro/disponibilites`, `/pro/profil`, `/pro/gains`.

### Admin (rôle admin, interface sobre, utilisable sur ordinateur)

`/admin` : coiffeurs à valider (approuver / suspendre), liste des RDV (filtres, annulation en cas de litige), utilisateurs (lecture), paramètres (`app_settings`).

---

## 7. Authentification et comptes (détail technique)

- **Supabase Auth** avec « inscriptions publiques » DÉSACTIVÉES : seuls les Edge Functions créent des comptes.
- Identifiant technique interne : e-mail synthétique dérivé du téléphone normalisé (par exemple `2376XXXXXXXX@phone.donmen.app`), jamais affiché, jamais utilisé pour envoyer un message. Confirmations par e-mail désactivées.
- **Edge Function `signup`** (clé de service) : valide avec zod, vérifie les unicités (nom d'utilisateur sans tenir compte de la casse, téléphone), crée l'utilisateur avec `auth.admin.createUser` (`email_confirm: true`) en plaçant le rôle demandé dans **`app_metadata`** (jamais modifiable par l'utilisateur) ; seuls `client` et `coiffeur` sont acceptés. Le rôle dépend de la route d'inscription utilisée.
- **Edge Function `login`** : reçoit `identifier` + `password`, retrouve le compte (nom d'utilisateur sans tenir compte de la casse, ou téléphone normalisé), appelle `signInWithPassword` côté serveur et renvoie la session. Toute erreur renvoie le même message « Identifiants incorrects » avec le même délai de réponse. **Limitation de débit** : table `auth_attempts`, blocage temporaire après 10 échecs en 15 minutes par identifiant et par IP.
- Trigger `handle_new_user` : crée `profiles`, `user_roles` et, pour un coiffeur, `hairdresser_profiles` (`validation_status = 'approved'` si `hairdresser_auto_approval` est vrai, sinon `'pending'`), à partir de `app_metadata` uniquement, avec liste blanche des rôles.
- Validation côté client ET serveur :

- nom d'utilisateur : `^[A-Za-z0-9_.]{3,20}$`, mots réservés refusés (admin, donmen, support, root, etc.) ;
- prénom et nom : 1 à 40 caractères, lettres Unicode, espaces, tirets, apostrophes (`^[\p{L}][\p{L}\s'’-]{0,39}$` avec le drapeau `u`) ;
- téléphone : saisie libre acceptée (espaces, `+237`, `237`), normalisé en `+2376XXXXXXXX` ; seuls les numéros mobiles `6XXXXXXXX` (9 chiffres) sont acceptés au MVP ;
- mot de passe : minimum `MIN_PASSWORD_LENGTH`.
- Session persistante, rafraîchissement automatique. Garde de routes : sans session, redirection vers `/bienvenue` puis retour à la page demandée après connexion ; avec session, `/bienvenue` redirige vers `/` (client), `/pro` (coiffeur) ou `/admin` (admin). Écran de chargement léger pendant la vérification de session, sans clignotement.
- `has_seen_welcome` : mis à jour uniquement via la fonction `mark_welcome_seen()` (SECURITY DEFINER), jamais par un `UPDATE` direct.

---

## 8. Base de données

Toutes les tables : `id uuid` par défaut `gen_random_uuid()`, `created_at`, `updated_at` (trigger), RLS activée. Extensions : `btree_gist`, `pgcrypto`.

### Tables

- `profiles` : `id` (= `auth.users.id`, cascade), `username`, `first_name`, `phone`, `gender` (F/M), `has_seen_welcome` (défaut faux). Index uniques sur `lower(username)` et `phone`.
- `app_role` (enum) : `client`, `coiffeur`, `admin`. `user_roles` : `user_id`, `role`, unique(`user_id`, `role`).
- `hairdresser_profiles` : `user_id` (pk), `last_name`, `bio`, `years_experience`, `specialties text[]`, `zones text[]`, `travel_fee_fcfa` (défaut 0, ≥ 0), `serves` (`all` | `women_only`, défaut `all`), `validation_status` (`pending`, `approved`, `suspended`), `rating_avg`, `rating_count`, `avatar_path`.
- `hairdresser_gallery` : `hairdresser_id`, `image_path`.
- `services` : `hairdresser_id`, `name`, `description`, `price_fcfa` (entier ≥ 0), `duration_min` (entier > 0), `is_active`.
- `availabilities` : `hairdresser_id`, `weekday` (ISO : 1 = lundi … 7 = dimanche), `start_time`, `end_time` (contrainte `end_time > start_time`).
- `time_off` : `hairdresser_id`, `starts_at`, `ends_at`, `reason`.
- `addresses` : `user_id`, `label`, `address_text`, `latitude`, `longitude`, `access_notes`.
- `bookings` : `client_id`, `hairdresser_id`, `status` (enum `pending`, `accepted`, `on_the_way`, `in_progress`, `completed`, `declined`, `cancelled`, `expired`), `scheduled_at timestamptz`, `ends_at timestamptz` (= début + durée totale + temps de trajet, calculé par la fonction), `total_duration_min`, `services_total_fcfa`, `travel_fee_fcfa`, `total_price_fcfa`, `women_only` (faux), `payment_method` (`cash`), `expires_at`, `late_cancellation` (faux), `cancelled_by` (`client`, `hairdresser`, `admin`, `system`), `cancel_reason`.

- **Contrainte anti-double-réservation au niveau de la base** :
`EXCLUDE USING gist (hairdresser_id WITH =, tstzrange(scheduled_at, ends_at) WITH &&) WHERE (status IN ('pending','accepted','on_the_way','in_progress'))`.
- `booking_items` : `booking_id`, `service_id`, `name`, `price_fcfa`, `duration_min` (copies figées).
- `booking_addresses` (séparée pour la confidentialité) : `booking_id` (pk), `address_text`, `latitude`, `longitude`, `access_notes`.
- `reviews` : `booking_id` (unique), `client_id`, `hairdresser_id`, `rating` (1 à 5), `comment` ; un trigger met à jour `rating_avg` et `rating_count`.
- `hair_profiles` : `client_id` (pk), `hair_type`, `porosity`, `scalp`, `length`, `colored`, `goals text[]`, `allergies`, `consent_at` (obligatoire).
- `care_notes` : `booking_id`, `hairdresser_id`, `client_id`, `products_used`, `remarks`.
- `notifications` : `user_id`, `type`, `title`, `body`, `data jsonb`, `read_at`.
- `app_settings` (clé/valeur) avec valeurs par défaut : `pending_expiry_minutes = 30`, `free_cancel_hours = 2`, `travel_buffer_min = 30`, `slot_step_min = 30`, `min_notice_min = 60`, `hairdresser_auto_approval = true` (à passer à `false` avant l'ouverture au public).
- `auth_attempts` : `identifier_hash`, `ip`, `succeeded`, `created_at`.
- `account_deletion_requests` : `user_id`, `status`.

### Vue publique

`public_hairdressers` (accessible aux utilisateurs connectés uniquement) : `id`, nom affiché (« Prénom N. »), `avatar_path`, `bio`, `specialties`, `zones`, `serves`, `rating_avg`, `rating_count`, `years_experience`, prix minimum des services actifs. Elle ne contient QUE les coiffeurs `approved`. Jamais de téléphone ni de nom d'utilisateur.

### Fonctions (SECURITY DEFINER, `search_path` fixé, `EXECUTE` limité aux rôles nécessaires)

1. `has_role(_user_id, _role)` : stable, utilisée dans toutes les policies.
2. `get_available_slots(p_hairdresser_id, p_date, p_service_ids)` :

- durée totale = somme des durées des services actifs demandés (erreur si un service est inconnu, inactif ou appartient à un autre coiffeur) ;
- pour chaque plage de `availabilities` du jour de la semaine (en `Africa/Douala`), génère des débuts au pas de `slot_step_min` tant que début + durée totale ≤ fin de plage ;
- exclut les débuts passés ou antérieurs à `now() + min_notice_min`, ceux qui chevauchent un `time_off`, et ceux dont l'intervalle [début, début + durée + `travel_buffer_min`) chevauche une réservation active du coiffeur ;
- renvoie des `timestamptz` triés.
3. `create_booking(...)` (client uniquement) : vérifie le rôle client, que le coiffeur est `approved`, recalcule TOUS les prix et durées depuis `services` (ne jamais faire confiance au client), vérifie que le créneau figure dans `get_available_slots`, insère `bookings`, `booking_items`, `booking_addresses`, calcule `ends_at` et `expires_at`. En cas de violation de la contrainte d'exclusion (`23P01`), renvoie l'erreur métier `SLOT_TAKEN` (« Ce créneau vient d'être pris. »). Crée la notification du coiffeur.
4. `update_booking_status(p_booking_id, p_new_status, p_reason)` — transitions autorisées, toute autre est refusée avec une erreur claire :

- coiffeur propriétaire : `pending → accepted`, `pending → declined`, `accepted → on_the_way`, `on_the_way → in_progress`, `in_progress → completed`, `accepted → cancelled` ;
- client propriétaire : `pending → cancelled`, `accepted → cancelled` ; si l'annulation d'un RDV `accepted` a lieu moins de `free_cancel_hours` avant `scheduled_at`, elle est acceptée et `late_cancellation = true` ;
- admin : `pending|accepted → cancelled` ;
- système : `pending → expired`.
Chaque transition crée la notification de l'autre partie.
5. `expire_pending_bookings()` : passe en `expired` les `pending` dont `expires_at < now()`. Planifiée toutes les minutes (pg_cron si disponible) ET appelée au début des lectures de réservations.
6. `mark_welcome_seen()`, `create_review(...)` (seulement pour un RDV `completed` du client, une fois), `is_username_available(p_username)`.

### RLS (résumé, à implémenter intégralement et à tester)

Table
Lecture
Écriture

`profiles`
sa propre ligne ; admin : tout
sa propre ligne, sans rôle

`user_roles`
sa propre ligne ; admin : tout
AUCUNE depuis l'application

`hairdresser_profiles`, `services`, `availabilities`, `gallery`
via la vue publique (approuvés) ; le coiffeur lit les siens ; admin : tout
le coiffeur écrit les siens ; jamais `validation_status` ; admin : tout

`bookings`, `booking_items`
le client ses réservations, le coiffeur les siennes, admin : tout
AUCUNE écriture directe : uniquement les fonctions

`booking_addresses`
le client la sienne ; le coiffeur seulement si le statut est `accepted`, `on_the_way`, `in_progress` ou `completed` ; admin : tout
via `create_booking`

`hair_profiles`
le client ; le coiffeur ayant un RDV `accepted` à `completed` avec ce client ; admin : lecture
le client

`care_notes`
le client concerné ; le coiffeur auteur ; admin
le coiffeur auteur, RDV `completed` uniquement

`notifications`
le destinataire
le destinataire (`read_at` seulement)

`app_settings`
utilisateurs connectés
admin

`auth_attempts`, `account_deletion_requests`
le propriétaire (sauf `auth_attempts` : personne) ; admin
selon fonction dédiée

### Stockage

Buckets : `avatars` (lecture publique, écriture dans son propre dossier `{uid}/`), `gallery` (idem). Images redimensionnées côté client avant envoi (≤ 100 Ko).

### Premier admin

Fournis un script SQL documenté dans `README.md` pour attribuer le rôle `admin` à un utilisateur existant. Aucune route de l'application ne peut accorder ce rôle.

---

## 9. Sécurité (liste de contrôle obligatoire)

- RLS activée sur CHAQUE table, policies minimales, testées avec pgTAP (un client ne voit jamais les données d'un autre).
- Aucune clé secrète côté navigateur : seule la clé publique (anon) est exposée. La clé de service reste dans les secrets des Edge Functions.
- Prix, durées, statuts et rôles décidés côté serveur.
- Messages d'erreur génériques à la connexion ; pas d'énumération de comptes.
- Aucune donnée personnelle dans les logs. Téléphones jamais publics.
- Entrées validées avec zod côté client ET serveur ; requêtes paramétrées uniquement.
- En-têtes de sécurité et CSP stricte dans la configuration d'hébergement.
- Pièces d'identité : aucune n'est demandée ni stockée pour l'instant (KYC reporté). Le jour où il sera mis en place : bucket privé, accès journalisé, jamais dans le code ni en clair dans une table.
- Dépendances : lance `pnpm audit` en CI et corrige les failles élevées.

---

## 10. Performance et PWA

- Pages chargées à la demande (`React.lazy` + `Suspense`, une route = un chunk). Découpage `manualChunks` pour les dépendances volumineuses.
- JavaScript initial < 200 Ko gzip, vérifié en CI avec `size-limit` (échec du build au-delà). Aucune image > 100 Ko, formats WebP, `width`/`height` définis, `loading="lazy"` hors du premier écran.
- Polices auto-hébergées, sous-ensemble latin, `font-display: swap`.
- TanStack Query : `staleTime` adapté, requêtes en parallèle (pas en cascade), colonnes nécessaires seulement, listes paginées, aucun abonnement temps réel inutile (rafraîchir au focus).
- Index SQL sur les colonnes filtrées : `bookings(hairdresser_id, scheduled_at)`, `bookings(client_id, status)`, `services(hairdresser_id)`, `availabilities(hairdresser_id, weekday)`, `notifications(user_id, read_at)`, `lower(username)`, `phone`.
- Squelettes de chargement à la place des écrans blancs.
- PWA : manifeste (`name` « DONMEN — Le roi du look », `short_name` « DONMEN », `theme_color` et `background_color` `#00257C`, `display: standalone`, `lang: fr`, icônes 192 et 512 dont une « maskable »), service worker qui met en cache les fichiers statiques, message clair hors connexion.
- Objectifs mesurés (Lighthouse mobile, 3G rapide simulé) : LCP < 2,5 s sur `/bienvenue`, score Performance ≥ 85, changement de page < 1 s dès la 2e visite.

---

## 11. Internationalisation, formats, accessibilité

- Fichiers `fr.json` et `en.json` complets ; langue par défaut FR ; choix mémorisé localement et modifiable dans `/profil`. Test automatique qui échoue si une clé manque dans une langue.
- Prix : `Intl.NumberFormat('fr-FR')` + « FCFA » (par exemple « 15 000 FCFA »). Dates et heures : `Intl.DateTimeFormat` avec `timeZone: 'Africa/Douala'`.
- Accessibilité : libellés de champs visibles et liés, boutons réels (`button`, `a`), focus visible, noms accessibles sur les icônes, contraste AA, navigation au clavier, `lang` sur `<html>`.

---

## 12. Gestion des erreurs et cas limites

- Chaque requête a des états : chargement (squelette), vide (message utile), erreur (message clair + « Réessayer »).
- Empêche le double envoi des formulaires (bouton désactivé pendant l'envoi).
- Session expirée : redirection propre vers `/connexion` avec retour à la page.
- Conflit de réservation : message « Ce créneau vient d'être pris. » et rechargement des créneaux.
- Perte de connexion : message « Vous êtes hors connexion » ; aucune perte de saisie dans les formulaires longs.
- Aucun `console.error` non géré en production ; les erreurs inattendues sont journalisées proprement (sans données personnelles).

---

## 13. Qualité : commandes, tests et définition de « terminé »

Scripts obligatoires : `pnpm dev`, `build`, `preview`, `typecheck`, `lint`, `test`, `test:e2e`, `db:test`, `size`.

**Tests unitaires et composants (Vitest + RTL)** : validateurs (nom d'utilisateur, prénom, téléphone, mot de passe), formatage FCFA et dates, `Greeting` (4 cas : première connexion, suivantes, prénom vide, chargement), garde de session, composants du design system, clés i18n.

**Tests de base (pgTAP)** : `handle_new_user` (liste blanche des rôles, impossible d'obtenir `admin`), contrainte `bookings` anti-chevauchement, `get_available_slots` (plages, congés, buffer, préavis, fuseau), `create_booking` (prix recalculé, service d'un autre coiffeur refusé, coiffeur non approuvé refusé), matrice complète de `update_booking_status`, `expire_pending_bookings`, annulation tardive, RLS (un client ne lit pas les réservations d'un autre ; le coiffeur ne lit pas l'adresse avant acceptation ; `user_roles` non modifiable).

**Tests de bout en bout (Playwright)** :

- E1 : ouvrir `/coiffeurs` sans session ramène à `/bienvenue`.
- E2 : inscription client « Christ » → « Bienvenue sur DONMEN, DON Christ ! » ; déconnexion puis connexion → « Salut DON Christ ! ».
- E3 : connexion par nom d'utilisateur (casse différente) et par téléphone ; mauvais mot de passe → « Identifiants incorrects ».
- E4 : inscription coiffeur. Avec `hairdresser_auto_approval` à faux : `/pro` « en cours de vérification » et absent de `/coiffeurs`. Avec la valeur à vrai : visible tout de suite.
- E5 : (valeur à faux) l'admin approuve ; le coiffeur apparaît ; il crée services et disponibilités.
- E6 : réservation complète par un client ; le coiffeur accepte ; la timeline avance jusqu'à « Terminée » ; l'avis est possible.
- E7 : deux clients tentent le même créneau en même temps : un seul réussit.
- E8 : annulation tardive correctement marquée.
- E9 : expiration d'une demande non acceptée.

**CI (GitHub Actions)** à chaque push : installation, `typecheck`, `lint`, `test`, `db:test`, `build`, `size`, `pnpm audit`, `test:e2e`. Une branche n'est fusionnable que si tout est vert.

**Définition de « terminé » pour une phase** : fonctionnalités complètes ; tests de la phase écrits et verts ; `typecheck` et `lint` sans erreur ni avertissement ; budgets respectés ; textes FR et EN ; RLS testées pour toute nouvelle table ; migrations appliquées depuis zéro sans erreur ; `README.md` et `NOTES.md` à jour ; commit propre (messages au format « type(portée) : description »).

---

## 14. Plan par phases (critères de sortie à respecter)

**Phase 0 — Fondations.** Dépôt, Vite + TypeScript strict, Tailwind, shadcn/ui, ESLint/Prettier, Vitest, Playwright, Supabase CLI, i18n, CI, `size-limit`, PWA de base, tokens, polices auto-hébergées. *Sortie* : CI verte sur un écran « Bienvenue » minimal ; budgets mesurés.

**Phase 1 — Design system et écrans d'entrée (données fictives).** Composants de la section 5, écrans `/bienvenue`, inscriptions, `/connexion` conformes aux maquettes. *Sortie* : tests de composants verts ; rendu correct à 360, 390 et 430 px ; aucun défilement horizontal.

**Phase 2 — Comptes réels.** Migrations `profiles`, rôles, trigger, `auth_attempts`, `app_settings` ; Edge Functions `signup` et `login` ; garde de session ; `Greeting` ; `/pro` en attente. *Sortie* : E1 à E4 verts ; pgTAP sur `handle_new_user` et RLS ; impossible d'obtenir `admin`.

**Phase 3 — Coiffeurs, services, créneaux, réservation.** Tables de la section 8, vue publique, `get_available_slots`, `create_booking`, contrainte d'exclusion, écrans Accueil, Coiffeurs, fiche coiffeur, Réserver, Mes RDV. *Sortie* : E7 vert ; tous les tests pgTAP de réservation verts.

**Phase 4 — Espace coiffeur.** `/pro` complet : demandes, agenda, services, disponibilités, profil, galerie, gains ; `update_booking_status`. *Sortie* : E5 et E6 (côté coiffeur) verts.

**Phase 5 — Back-office admin.** Validation des coiffeurs, suivi des RDV, paramètres, demandes de suppression ; bannière d'alerte visible tant que `hairdresser_auto_approval` est actif. *Sortie* : l'admin approuve et suspend ; un coiffeur suspendu disparaît de la liste.

**Phase 6 — Fiche cheveux et historique des soins.** `hair_profiles`, `care_notes`, écran `/mes-cheveux`, notes du coiffeur. *Sortie* : visibilité testée (le coiffeur ne voit la fiche qu'après acceptation).

**Phase 7 — Notifications dans l'application et avis.** Création des notifications par les fonctions, page `/notifications` (icône cloche discrète à droite de la salutation, ajout minimal non maquetté à signaler dans `NOTES.md`), avis après prestation. *Sortie* : E6 complet vert (avis inclus).

**Phase 8 — Durcissement.** Audit de performance (Lighthouse mobile), accessibilité, revue de sécurité complète, E8 et E9, nettoyage, documentation de déploiement. Liste de contrôle de lancement : demander au propriétaire de choisir la valeur finale de `hairdresser_auto_approval` (recommandation : faux, avec validation manuelle). *Sortie* : tous les budgets tenus, aucune alerte de sécurité, CI verte.

---

## 15. Hors périmètre (ne rien construire)

Boutique et produits, paiement Mobile Money ou carte, messagerie et appels (le propriétaire les veut ; la spécification est en cours de validation : ne rien construire avant son feu vert), OTP et SMS, WhatsApp, e-mails, interface KYC, volet « coiffure entre femmes » (colonnes seulement), « premier disponible », abonnements, fidélité, parrainage, application native, multi-pays.

---

## 16. Format du compte rendu de fin de phase

1. **Ce qui a été fait** (liste courte).
2. **Fichiers créés ou modifiés** (chemins).
3. **Commandes à exécuter** pour reproduire (installation, migrations, tests).
4. **Résultats des tests et mesures** (collés, avec les chiffres de performance).
Ajoute les chemins des captures d'écran de la phase (`docs/screens/phase-N/`) et la mise à jour de `PROGRESS.md`.
5. **Hypothèses et écarts** (renvoi vers `NOTES.md`).
6. **Problèmes connus**.
7. **Prochaine phase**.

Termine toujours par : « Phase N terminée : critères de sortie verts » ou la liste de ce qui bloque.

---

## 17. Visibilité en direct (le propriétaire regarde l'application se construire)

Le propriétaire veut voir l'application prendre forme pendant que tu travailles. Donc :

1. **L'application est toujours lançable.** Ne laisse jamais le code dans un état qui ne démarre pas. Travaille sur des branches courtes (`phase-N-sujet`) et ne fusionne dans `main` que lorsque tout est vert.
2. **Serveur de développement visible** : `pnpm dev` écoute sur le réseau local (`vite --host`, port 5173) et affiche les adresses « Local » et « Network ». Le rechargement à chaud (HMR) doit fonctionner : chaque fichier enregistré met l'écran à jour sans recharger la page. Dans `vite.config.ts` : `server: { host: true, port: 5173, strictPort: true }` (le port ne change jamais), et le service worker de la PWA est DÉSACTIVÉ en développement (`devOptions.enabled: false`) pour que le téléphone ne serve jamais une ancienne version. Documente dans `README.md` les adresses, la façon de trouver l'adresse IP de l'ordinateur, la règle de pare-feu à autoriser et la méthode par tunnel de VS Code (onglet « Ports ») pour tester le GPS et l'installation PWA en HTTPS.
3. **Écrans jamais vides** : fournis `supabase/seed.sql` (usage LOCAL uniquement) avec des données de démonstration (coiffeurs, services, disponibilités, un client, un coiffeur, un admin). Documente les comptes de démonstration dans `README.md`. Jamais de ces comptes en production.
4. **`PROGRESS.md`** à la racine, mis à jour à chaque étape : tableau « Écran ou fonction / Statut (À faire, En cours, Terminé) / Route à ouvrir pour le voir / Date ».
5. **Captures d'écran** à chaque phase : génère avec Playwright (taille 390 × 844) une capture de chaque écran réalisé dans `docs/screens/phase-N/`.
6. **Commits petits et fréquents**, avec des messages clairs : l'historique Git montre l'avancement.
7. **Lien de prévisualisation** : si un déploiement de prévisualisation est relié au dépôt (Vercel ou Netlify), indique le lien de chaque branche dans le compte rendu.
8. **Messages d'avancement en cours de phase** : à chaque étape importante, écris en trois lignes (a) ce qui vient d'être terminé, (b) la route à ouvrir dans l'aperçu pour le voir, (c) ce que tu fais ensuite.