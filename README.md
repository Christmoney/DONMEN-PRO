# DONMEN

## Développement local

1. Installer Node.js 20 LTS, pnpm et Docker Desktop (pour les tests Supabase locaux).
2. Installer les dépendances : `pnpm install`.
3. Copier `.env.example` vers `.env.local`, puis renseigner l’URL et la clé publique du projet Supabase.
4. Lancer l’application : `pnpm dev`.
5. Ouvrir `http://localhost:5173`. Vite affiche également l’adresse réseau; le port reste fixé à `5173`.

Sans configuration Supabase, les pages publiques restent consultables, mais l’authentification est désactivée. Aucun compte de démonstration ni mot de passe fictif n’est activé.

### Tester sur un téléphone du réseau local

- Utiliser l’adresse `Network` affichée par Vite, ou trouver l’adresse IPv4 de l’ordinateur avec `ipconfig`, puis ouvrir `http://<adresse-ip>:5173` sur un téléphone connecté au même réseau.
- Si Windows bloque la connexion, autoriser le port TCP `5173` dans le Pare-feu Windows uniquement sur le profil réseau privé. Ne pas exposer ce port sur un réseau public.
- Pour un test HTTPS (notamment installation PWA et GPS), transférer le port `5173` avec l’onglet **Ports** de VS Code, puis ouvrir l’URL HTTPS fournie par le tunnel.
- Le service worker est désactivé en développement pour éviter qu’un cache PWA masque les changements HMR.

## Authentification Supabase

Le flux actuellement présent dans l’application utilise l’e-mail et le mot de passe. Les fournisseurs sociaux dépendent aussi de leur configuration dans Supabase. Le cahier des charges cible un identifiant par nom d’utilisateur ou téléphone et un e-mail synthétique interne; cette transition relève de la phase 2 et ne doit pas être considérée comme déjà déployée.

Les Edge Functions reçoivent leurs secrets dans leur environnement Supabase. Ne mettez jamais la clé `service_role` dans `.env.local` ni dans le navigateur. Les migrations locales sont dans `supabase/migrations/`; l’application à un projet distant doit être faite après vérification de la cible et de l’état de ses migrations.

### Annuaire et réservations Client

L’espace Client affiche uniquement les profils Supabase approuvés, disponibles et complétés à au moins 50 %. Les prestations et photos proviennent du catalogue lié dans `public.services`; les créneaux et demandes de réservation passent par les fonctions serveur `get_available_slots` et `create_booking`. La migration `20261116090000_client_catalog_bookings.sql` doit être appliquée et validée localement avant tout déploiement. L’identité du client est déterminée par `auth.uid()` dans la base, jamais par un identifiant fourni par le navigateur.

L’inscription attribue uniquement les rôles `client` ou `hairdresser`. Pour attribuer le premier rôle admin à un utilisateur existant, exécuter manuellement dans l’éditeur SQL Supabase :

```sql
insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role
from auth.users
where id = '<UUID_UTILISATEUR_EXISTANT>'
on conflict (user_id, role) do nothing;
```

Remplacer l’UUID par celui de l’utilisateur existant. Cette attribution ne peut pas être effectuée depuis l’application.

## Vérification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm db:test` (nécessite Docker et les services locaux Supabase)
- `pnpm build`
- `pnpm size` (après le build)
- `pnpm test:e2e`
- `pnpm audit --audit-level high`
