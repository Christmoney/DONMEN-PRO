# DONMEN

## Développement local

1. Installer Node.js 20 LTS, npm et la Supabase CLI.
2. Installer les dépendances : `npm install`.
3. Copier `.env.example` vers `.env.local`, puis renseigner l’URL et la clé publique du projet Supabase.
4. Lancer l’application : `npm run dev`.
5. Ouvrir `http://localhost:5173`. Vite affiche également l’adresse réseau.

Sans configuration Supabase, les pages publiques restent consultables, mais l’authentification est désactivée. Aucun compte de démonstration ni mot de passe fictif n’est activé.

## Authentification Supabase

1. Créer un projet Supabase et activer le fournisseur téléphone / mot de passe. Désactiver la confirmation du téléphone pour le MVP sans OTP.
2. Appliquer la migration `supabase/migrations/20261113000000_auth_foundation.sql` (par exemple avec `supabase db push` après liaison du projet).
3. Déployer les fonctions : `supabase functions deploy signup --no-verify-jwt` et `supabase functions deploy login --no-verify-jwt`.
4. Les fonctions utilisent `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` fournis dans l’environnement Edge Functions. Ne mettez jamais la clé de service dans `.env.local` ni dans le navigateur.

L’inscription attribue uniquement les rôles `client` ou `hairdresser`. Pour attribuer le premier rôle admin à un utilisateur existant, exécuter manuellement dans l’éditeur SQL Supabase :

```sql
insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role
from auth.users
where phone = '+237600000000'
on conflict (user_id, role) do nothing;
```

Remplacer le numéro par celui de l’utilisateur existant. Cette attribution ne peut pas être effectuée depuis l’application.

## Vérification

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
