# Lueur — Plan

> Agenda du sommeil local, sans compte, open source. iOS + Android.
> Ce document décrit l'architecture, le modèle de données, les écrans et les jalons.
> Les décisions tranchées en cours de route sont consignées dans `DECISIONS.md`.

## 1. Principes

1. **Tout reste sur l'appareil.** Aucune requête réseau, aucun SDK tiers de mesure. Sous Android, la permission `INTERNET` est retirée du build release.
2. **Consigner une nuit en moins de 15 secondes.** Écran unique, prérempli, un tap pour enregistrer si rien n'a changé.
3. **Rendre visible sans juger.** Fréquence, régularité, causes probables. Pas de score, pas de streak, pas de badge.
4. **Logique de calcul pure et testée.** Toute règle métier vit dans `src/domain/`, sans dépendance à React ni à la base.
5. **Pas un dispositif médical.** Inspiré de l'agenda du sommeil utilisé en TCC-I, sans diagnostic.

## 2. Stack (versions vérifiées le 2026-09-25)

| Rôle | Choix | Version |
|---|---|---|
| Framework | Expo SDK 57 (CNG, `expo prebuild`) | expo 57.0.x, RN 0.86, React 19.2 |
| Langage | TypeScript strict | 6.0 |
| Navigation | expo-router | 57.0.x |
| Données | expo-sqlite + drizzle-orm (migrations drizzle-kit) | 57.0.x / 0.45 |
| État | zustand | 5.0 |
| Animation / rendu | react-native-reanimated 4 + worklets, @shopify/react-native-skia | 4.5 / 2.6 |
| Gestes | react-native-gesture-handler | 2.32 |
| Notifications | expo-notifications (locales uniquement) | 57.0.x |
| Dates | date-fns | 4.x |
| i18n | expo-localization + i18next + react-i18next | 26 / 17 |
| Export | expo-file-system, expo-sharing, expo-print (PDF), expo-document-picker (import) | 57.0.x |
| Nuit | expo-brightness, expo-keep-awake, expo-haptics | 57.0.x |
| Qualité | ESLint (eslint-config-expo), Prettier, Jest (jest-expo), RNTL, Maestro | |
| Build | Gradle local, Xcode local, fastlane, GitHub Actions. **Pas d'EAS.** | |

## 3. Architecture

```
src/
  app/                 routes expo-router (écrans seulement, fins)
  domain/              logique pure : temps, métriques, insights, formats d'export (100 % testée)
  db/                  schéma drizzle, client, repositories, migrations générées
  store/               stores zustand (réglages, brouillon de saisie, nuits en mémoire)
  features/            composants et hooks par fonctionnalité (entry, calendar, reports, insomnia, …)
  ui/                  système de design : thème, typo, surfaces, grain, boutons, icônes
  brand/               logo Skia (statique + animé)
  i18n/                ressources FR/EN typées, init i18next
  notifications/       planification locale, catégories, canaux
  export/              JSON/CSV/PDF, import
assets/
  fonts/               Young Serif, Ysabeau Office (OFL, embarquées)
  brand/               sources SVG du logo, icônes générées, splash
plugins/               config plugins Expo maison (signature Android, retrait INTERNET)
e2e/                   parcours Maestro + captures
fastlane/              lanes beta/release, métadonnées stores FR/EN
site/                  politique de confidentialité (GitHub Pages)
scripts/               génération des icônes, cadrage des captures
```

Flux de données : écran → hook de feature → store zustand → repository drizzle → SQLite.
Les écrans calculent les statistiques en appelant `src/domain` sur les nuits chargées (quelques centaines de lignes au plus : pas besoin d'agrégation SQL).

## 4. Modèle de données

### Conventions temporelles

- Chaque instant est stocké en **millisecondes epoch UTC** (`integer`).
- Chaque nuit stocke aussi le **décalage UTC (minutes)** au coucher et au réveil. L'heure « murale » affichée est reconstruite avec ce décalage, pas avec le fuseau actuel du téléphone : une nuit passée à New York reste lisible en heure de New York après le retour.
- Les durées se calculent par différence d'instants : une nuit de changement d'heure dure réellement 1 h de plus ou de moins.
- Une nuit est identifiée par sa **date de réveil** (`wakeDate`, `YYYY-MM-DD` locale). Affichage : « nuit du 24 au 25 ». Unicité : une nuit par `wakeDate`.
- Les régularités (heures de coucher/lever) se calculent en **minutes depuis midi** (22:00 → 600, 01:30 → 810) pour éviter le passage de minuit.

### Tables

`nights`
| colonne | type | note |
|---|---|---|
| id | text pk | uuid |
| wake_date | text unique | `YYYY-MM-DD` |
| bedtime_at | integer | coucher (au lit) |
| sleep_latency_min | integer | délai d'endormissement |
| awakenings | text (JSON) | `[{ offsetMin, durationMin }]`, offset depuis le coucher |
| final_wake_at | integer | réveil final |
| out_of_bed_at | integer | lever |
| quality | integer 1–5 | ressenti |
| note | text null | |
| bed_offset_min / wake_offset_min | integer | décalage UTC au coucher / au réveil |
| created_at / updated_at | integer | |

`tags` — id, key (tag par défaut, clé i18n) ou label (tag perso), enabled, sort_order, created_at.
`night_tags` — night_id, tag_id (pk composite, cascade).
`wake_events` — éveils enregistrés par le mode « je n'arrive pas à dormir » : id, started_at, ended_at, night_id null.
`environment_changes` — journal de l'environnement : id, date (`YYYY-MM-DD`), label, note, created_at.
`settings` — key/value JSON (réglages, réponses d'onboarding).

Migrations : `drizzle-kit generate` → `src/db/migrations/*.sql` + `migrations.js`, appliquées au démarrage via `useMigrations`.

### Grandeurs dérivées (`src/domain/metrics.ts`)

- Temps au lit (TIB) = lever − coucher.
- Endormissement = coucher + délai.
- Éveil intra-nuit (WASO) = somme des durées d'éveil.
- Temps de sommeil estimé (TST) = (réveil final − endormissement) − WASO, borné à ≥ 0.
- Efficacité = TST / TIB.
- **Nuit difficile** = ressenti ≤ 2, **ou** endormissement > 30 min, **ou** éveils cumulés > 30 min. Seuils usuels des agendas du sommeil en recherche, expliqués dans l'app (« Comment c'est compté »).
- Régularité = écart-type des heures de coucher et de lever (minutes).

## 5. Écrans

| Route | Rôle |
|---|---|
| `/onboarding` | 6 étapes passables : bienvenue, horaires, gêne principale, objectif, rappel du matin, facteurs suivis |
| `/(tabs)/index` | Accueil : logo animé, dernière nuit, bouton de saisie (matin) ou « je n'arrive pas à dormir » (nuit), fréquence des nuits difficiles, phrase de contexte |
| `/(tabs)/calendar` | Tissage du mois : une bande par nuit sur un axe horaire commun, tap = édition |
| `/(tabs)/reports` | Semaine / mois : TST, TIB, efficacité, endormissement, éveils, régularité, fréquence, corrélations par tag, dérive, écart semaine/week-end, journal de l'environnement |
| `/(tabs)/settings` | Thème, 12/24 h, langue, 1er jour de semaine, tags, notifications, données, à propos |
| `/entry` (modal) | Saisie/édition d'une nuit, `?date=YYYY-MM-DD` |
| `/insomnia` | Mode nuit : écran très sombre, respiration guidée par la lueur, règle des 20 minutes |
| `/tags` | Gestion des tags |
| `/environment` | Journal de l'environnement (avant/après) |
| `/data` | Export JSON/CSV/PDF, import, suppression totale |
| `/about` | Mention « pas un dispositif médical », confidentialité, licences |

## 6. Jalons

| # | Jalon | Contenu | Critère de sortie |
|---|---|---|---|
| M0 | Fondations | Scaffold, docs PLAN/DESIGN/CLAUDE, outillage lint/format/tests | `typecheck`, `lint`, `test` verts |
| M1 | Domaine | Fonctions pures (temps, métriques, insights, export) + tests | couverture > 90 % sur `src/domain` |
| M2 | Données | Schéma, migrations, repositories, stores | migrations appliquées au boot |
| M3 | Système de design | Thème matin/nuit, typo, grain, bande de nuit, logo, icônes | écran de démonstration interne conforme à DESIGN.md |
| M4 | Écrans | Onboarding, accueil, saisie, calendrier, rapports, réglages, mode nuit, données | parcours complets FR/EN |
| M5 | Notifications | Rappels locaux, actions, canaux, fuseaux | tests unitaires de planification |
| M6 | Marque et natif | Icônes, splash, plugins, prebuild, AAB release local | AAB signé, manifeste sans `INTERNET` |
| M7 | QA | Émulateur, revue visuelle, Maestro e2e, captures | 5 parcours verts |
| M8 | Publication | fastlane, GitHub Actions, fiches, site, RELEASE.md, README | DoD remplie |
