# Lueur — conventions du projet

Agenda du sommeil local, open source (MIT), Expo SDK 57 + React Native + TypeScript strict. iOS + Android. Aucune donnée ne quitte l'appareil.

Lire d'abord : `docs/PLAN.md` (architecture), `docs/DESIGN.md` (système de design, **à respecter strictement**), `docs/DECISIONS.md`.

## Commandes

```bash
npm run typecheck      # tsc --noEmit
npm run lint           # eslint (expo config + prettier)
npm test               # jest
npm run check          # les trois
npm run db:generate    # drizzle-kit generate après modification de src/db/schema.ts
npm run android        # build debug + lancement (expo run:android)
npm run build:android  # prebuild + AAB release local (voir docs/RELEASE.md)
npm run e2e            # Maestro (émulateur lancé, build installé)
```

Toujours `npx expo install <pkg>` pour ajouter une dépendance (versions compatibles SDK). Vérifier la doc versionnée : https://docs.expo.dev/versions/v57.0.0/ — l'API Expo change à chaque SDK, ne pas se fier à la mémoire.

## Règles

- **Pas de réseau.** Aucune lib d'analytics, de crash reporting, de fonts distantes, de fetch. Pas d'EAS, pas de service cloud Expo.
- **CNG** : `ios/` et `android/` sont générés (`expo prebuild`) et ignorés par git. Toute modification native passe par `app.config.ts` ou un plugin dans `plugins/`.
- **Logique pure dans `src/domain/`** : aucun import React, Expo ou DB. Chaque fonction exportée a des tests dans `src/domain/__tests__/`. Durées = différences d'instants epoch ms ; heures murales = instant + décalage stocké (voir PLAN §4).
- Les routes (`src/app/`) restent fines : elles composent des composants de `src/features/` et `src/ui/`.
- **Aucune couleur, taille ou durée en dur dans les composants** : passer par `useTheme()` et `src/ui/tokens.ts`.
- Textes : **toujours** via i18n (`src/i18n/fr.ts` est la source, `en.ts` doit avoir exactement les mêmes clés : c'est vérifié par le typage). Ton : voir DESIGN §13.
- Accessibilité : tout élément interactif a un `accessibilityLabel` et une zone de 44 pt minimum. Décor Skia : `accessible={false}`.
- Animations : Reanimated uniquement, respecter `useReducedMotion()` via `src/ui/motion.ts`. Jamais de ressort qui dépasse.
- Nommage : fichiers en kebab-case, composants en PascalCase, hooks `useX`. Code et commentaires en anglais, docs en français.
- Commits conventionnels (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `build:`, `ci:`). À la fin de chaque jalon : `npm run check` vert puis commit.
- Décision non triviale : l'ajouter dans `docs/DECISIONS.md`.
