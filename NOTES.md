# Notes et hypothèses

- Les actifs officiels de la marque sont installés dans `public/brand/`. Ne pas recolorer ni remplacer ces actifs; les composants doivent réutiliser les couleurs de `src/styles/tokens.css`.
- Les écrans d’authentification et leurs validations sont traduits en FR/EN. L’authentification actuelle utilise l’e-mail, tandis que le cahier des charges cible un identifiant par nom d’utilisateur ou téléphone et un e-mail synthétique interne. Cette migration est prévue en phase 2 et n’a pas été appliquée au projet Supabase distant.
- L’espace Client lit uniquement `public_hairdressers` et le catalogue relationnel `services`; la réservation est validée et créée par les RPC Supabase `get_available_slots` et `create_booking`. Le profil public doit être approuvé, disponible et complété à au moins 50 %. L’espace Pro synchronise profil, photos, catalogue, disponibilité et horaires, mais ses demandes et revenus restent un prototype local.
- `.env.local` contient la configuration locale Supabase et ne doit jamais être suivi par Git. Aucune clé secrète ne doit être placée dans le navigateur.
- L’environnement actuel est Windows avec Node.js 26 et pnpm 12.18.0. Docker n’est pas installé; `pnpm db:test` ne peut donc pas s’exécuter localement.
- Playwright est installé, mais Windows Application Control bloque le DLL Chromium téléchargé. Le test navigateur est configuré pour CI Linux; la navigation publique a été vérifiée manuellement dans le navigateur intégré.
- Le worktree contient le travail d’intégration de l’espace Pro; préserver `src/features/pro/` et ses tests. La migration `20261116090000_client_catalog_bookings.sql` doit être testée localement avant déploiement; aucune migration distante n’a été appliquée.
