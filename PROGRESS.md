# Progression DONMEN

Le statut **Terminé** est réservé aux critères de sortie de phase du `PROMPT-MAITRE.md`, tests compris. Les routes et écrans existants qui utilisent encore des données fictives ne sont pas considérés comme des fonctionnalités terminées.

| Écran ou fonction | Statut (À faire, En cours, Terminé) | Route à ouvrir pour le voir | Date |
|---|---|---|---|
| Phase 0 — Fondations, outillage et CI | En cours | `/bienvenue` | 2026-11-16 |
| Phase 1 — Design system et écrans d’entrée | En cours | `/bienvenue`, `/connexion`, `/inscription/client` | 2026-11-16 |
| Phase 2 — Comptes réels selon le cahier des charges (nom d’utilisateur/téléphone) | En cours | `/connexion`, `/inscription/client`, `/pro` | 2026-11-16 |
| Phase 3 — Coiffeurs, créneaux et réservations réels | En cours | `/coiffeurs`, `/reserver/:coiffeurId`, `/mes-rdv` | 2026-11-16 |
| Phase 4 — Espace coiffeur et gestion des rendez-vous | En cours | `/pro` | 2026-11-16 |
| Phase 5 — Back-office administrateur | À faire | `/admin` | 2026-11-16 |
| Phase 6 — Fiche cheveux et historique des soins persistants | En cours | `/mes-cheveux` | 2026-11-16 |
| Phase 7 — Notifications et avis | À faire | `/notifications` | 2026-11-16 |
| Phase 8 — Durcissement, accessibilité et performance | À faire | `/bienvenue` | 2026-11-16 |

## Dernier état vérifié — 2026-11-16

- `pnpm typecheck`, `pnpm lint`, `pnpm test` et `pnpm build` réussissent; 7 fichiers de tests et 22 tests passent.
- Le contrôle `pnpm size` mesure 81,86 Ko gzip pour l’entrée JavaScript (budget : moins de 200 Ko).
- La CI, les tests Playwright, `db:test` et `size` sont configurés. La CI n’a pas encore été exécutée.
- Le test Playwright ne peut pas lancer Chromium sur ce poste : Windows Application Control bloque le DLL téléchargé. La navigation `/bienvenue` → `/inscription/client` a été vérifiée dans le navigateur partagé.
- `pnpm db:test` reste à valider : la commande échoue faute de base Supabase locale joignable sur `127.0.0.1:54322`.
- Le code d’entrée, l’authentification, l’accueil et l’espace Pro sont chargés à la demande; les autres écrans restent à découper en routes dédiées.
- L’espace Client ne fusionne plus de données fictives : l’annuaire utilise la projection Supabase filtrée (profil complété à 50 % minimum et disponibilité active), le catalogue et les photos viennent de `services`, les créneaux sont calculés côté serveur et les demandes sont enregistrées par RPC dans `bookings`.
- La migration SQL et ses tests pgTAP sont ajoutés mais doivent encore être exécutés sur une base Supabase locale avant tout déploiement. L’espace Pro synchronise maintenant profil, catalogue, disponibilité et horaires; ses demandes et revenus restent un prototype local. L’authentification existante utilise l’e-mail; la migration vers le modèle du cahier des charges reste à faire en phase 2.
