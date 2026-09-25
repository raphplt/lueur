# Contributing to Lueur

Thank you for helping. Lueur is small on purpose; please read this first.

## Principles (non-negotiable)

1. **No network.** No analytics, crash reporting, remote fonts, remote config or any request. CI checks it; the Android release build has no `INTERNET` permission.
2. **No added anxiety.** No scores, streaks, badges or guilt. Wording follows [`docs/DESIGN.md`](docs/DESIGN.md) §13.
3. **Not a medical device.** No diagnosis, no treatment advice, no claims.
4. **Design system first.** Colours, type, spacing and motion come from `src/ui/tokens.ts`. No default-looking UI.

## Workflow

```bash
npm ci
npm run check      # must stay green
npm run android    # or npm run ios
```

- Logic goes in `src/domain/` as pure, tested functions (no React, Expo or database imports).
- Every user-facing string goes through `src/i18n/fr.ts` (source) and `src/i18n/en.ts` (typed mirror).
- Schema change: edit `src/db/schema.ts`, then `npm run db:generate` and commit the migration. If the export format changes, update `docs/DATA_FORMAT.md` and bump `schemaVersion` only for breaking changes.
- Interactive elements need an `accessibilityLabel`, a 44 pt target, and a `testID` if an e2e flow uses them.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/).

## Adding a language

Copy `src/i18n/en.ts`, translate every key (TypeScript tells you what is missing), add the locale to `src/i18n/index.ts` and `app.config.ts` (`locales`), and add store texts under `fastlane/metadata/`.

## Reporting a problem

Open an issue with the steps, the platform and OS version. Please never attach an export containing your real sleep data.
