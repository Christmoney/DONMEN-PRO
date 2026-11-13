# Notes et hypothèses

- Les actifs de marque fournis par le propriétaire ne sont pas présents dans `public/brand/` ; le design utilise un placeholder jusqu'à leur ajout.
- Les fichiers de traduction FR et EN sont présents. Les nouveaux écrans publics d’authentification seront progressivement raccordés à l’ensemble du contenu i18n.
- Les écrans publics d’authentification et leurs validations sont traduits en FR/EN.
- La phase 2 contient les migrations SQL et les Edge Functions. Il reste à l’appliquer et à la valider sur un projet Supabase configuré dans `.env.local`; le dépôt n’a pas de secrets ni de clés.
- La Supabase CLI, Deno, PostgreSQL et Docker ne sont pas installés dans l’environnement courant; les Edge Functions et la migration n’ont donc pas pu être exécutées localement.
- Le dépôt n’est pas initialisé comme dépôt Git. La commande `pnpm` est bloquée par Device Guard sur cette machine; les commandes npm sont utilisées en attendant.
- Les comptes de démonstration statiques ont été supprimés ; aucun accès fictif n’est autorisé.
