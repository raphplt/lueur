# Lueur — Feuille de route

## Idées différenciantes : évaluation

Échelle : intérêt pour la question centrale (« à quelle fréquence, depuis quand, pourquoi mes nuits sont cassées »), coût d'implémentation, risque (vie privée, anxiété, dérive médicale).

| Idée | Intérêt | Coût | Risque | Décision |
|---|---|---|---|---|
| **Dérive des horaires** (coucher qui recule de semaine en semaine) | Élevé : la dérive lente est invisible au jour le jour | Faible : régression linéaire sur 28 jours, fonction pure | Faible si formulée comme observation | **V1** — `bedtimeDrift`, seuils : ≥ 10 nuits, ≥ 15 min/semaine, R² ≥ 0,3 |
| **Journal de l'environnement** (ventilateur, moustiquaire, bouchons, matelas) avec avant/après | Élevé : répond directement à « qu'est-ce qui aide ? » pour les nuits cassées par le bruit ou les insectes | Faible : une table, une comparaison 14 j / 14 j | Moyen : confusion possible avec une preuve → mention « deux semaines, c'est court » | **V1** |
| **Écart semaine / week-end** (jet lag social) | Moyen à élevé : cause fréquente de lundis difficiles | Faible : milieu de sommeil moyen semaine vs week-end | Faible | **V1** — signalé à partir d'1 h d'écart |
| **Phrases de contexte bienveillantes** après une nuit | Élevé pour le ton, réduit l'anxiété | Faible : banque de textes rédigés, choix déterministe | Faible si relues (pas de conseil médical, pas de culpabilisation) | **V1** — 7 catégories, 26 phrases par langue, dont une qui oriente vers un médecin après plusieurs nuits difficiles d'affilée |
| **Repère « Heure regardée »** | Élevé : regarder l'heure entretient l'éveil, c'est un problème du propriétaire | Nul | Nul | **V1** — repère proposé par défaut. Le mode nuit n'affiche jamais l'heure |
| **Réveils du mode nuit importés dans la saisie** | Élevé : mesure réelle de l'éveil sans effort le matin | Faible | Faible | **V1** |
| **Rappel qui se tait** (pas de rappel si la nuit est notée, arrêt après 14 jours sans ouverture) | Moyen : cohérent avec « pas de streak, pas de pression » | Faible : planification glissante sur 14 jours | Nul | **V1** |
| **Rattrapage doux** des nuits oubliées (jusqu'à 14 jours, jamais avant la première nuit notée) | Moyen | Faible | Faible | **V1** |
| **PDF « pour mon médecin »** avec bandes de nuit | Élevé (objectif « préparer un rendez-vous ») | Moyen | Faible | **V1** |
| Raccourci d'icône (Android shortcut / iOS Quick Action) vers le mode nuit | Moyen : un geste depuis l'écran d'accueil du téléphone | Faible à moyen (module natif ou lib tierce) | Faible | **V1.1** |
| Fenêtre de sommeil suggérée (restriction du temps au lit) | Élevé en TCC-I | Faible techniquement | **Élevé** : c'est un geste thérapeutique qui doit être encadré | **Non.** Hors périmètre « pas un dispositif médical » |
| Détection du bruit par le micro | Tentant pour le bruit | Élevé | **Élevé** : vie privée, batterie, permission micro | **Non** |
| Bilan hebdomadaire en notification | Moyen | Faible | Moyen : peut créer de l'attente ou de l'anxiété | Plus tard, désactivé par défaut |
| Saisonnalité (durée du jour, heure d'été) | Faible à moyen | Moyen | Faible | Plus tard |

## V2 — préparée, non implémentée

### 1. Serveur MCP local

Objectif : interroger ses nuits avec une IA (« est-ce que la moustiquaire a changé quelque chose ? »), **sans que l'app n'accède jamais au réseau**.

Approche :

- L'app ne change pas : l'utilisateur exporte sa sauvegarde JSON (`DATA_FORMAT.md`) vers son ordinateur (AirDrop, câble, dossier partagé).
- Un paquet séparé `tools/lueur-mcp/` (Node, TypeScript) implémente un serveur [Model Context Protocol](https://modelcontextprotocol.io) en **stdio**, lancé localement par le client IA (Claude Desktop, etc.) avec le chemin du fichier en argument : `npx lueur-mcp ~/Documents/lueur-2026-09-25.json`.
- Il réutilise **tel quel** `src/domain/` (TypeScript pur, sans React ni Expo) : `parseExport`, `summarize`, `difficultFrequency`, `tagCorrelations`, `bedtimeDrift`, `weekendGap`, `environmentComparison`. Mise en place prévue : workspaces npm, `src/domain` exposé comme paquet interne `@lueur/domain`.
- Outils MCP envisagés (lecture seule) :
  - `list_nights(from?, to?)` : nuits avec leurs grandeurs dérivées ;
  - `summary(period: week|month|range)` : moyennes, régularité, nuits difficiles ;
  - `difficult_frequency(days)` : la question centrale, avec comparaison ;
  - `tag_effects()` : corrélations, avec les mêmes seuils et la même prudence que l'app ;
  - `environment_changes()` : comparaisons avant/après ;
  - `search_notes(query)`.
- Ressource MCP `lueur://export/schema` qui expose `DATA_FORMAT.md` pour que le modèle comprenne les champs.
- Garde-fous : lecture seule, aucun appel réseau, rappel « pas un avis médical » dans la description des outils.

Conséquence pour la V1 : le format d'export est **versionné et stable** (`schemaVersion`), les heures portent leur décalage, et les champs `derived` évitent au serveur de recalculer.

### 2. Widgets d'écran d'accueil

Objectif : noter son ressenti en un tap, depuis le widget.

- **iOS (WidgetKit + App Intents, iOS 17+)** : cible widget générée par un config plugin (par ex. `@bacons/apple-targets`), cinq boutons « lueur » interactifs. L'intent écrit le ressenti dans un **App Group** partagé (petit fichier JSON). Au lancement suivant, l'app l'importe dans le brouillon de la nuit. Le widget affiche la bande de la dernière nuit, rendue par l'app dans l'App Group.
- **Android (Jetpack Glance)** : module Expo en Kotlin, widget Glance avec les mêmes cinq niveaux, `ActionCallback` qui écrit dans les `SharedPreferences` de l'app, importées au lancement.
- La saisie complète reste dans l'app : le widget prépare, l'app enregistre (une seule source de vérité, la base SQLite).

### 3. Apple Santé / Health Connect (optionnel, désactivé par défaut)

- **Écriture** des nuits (au lit / endormi) : Apple Health `HKCategoryTypeIdentifierSleepAnalysis` (`inBed`, `asleepUnspecified`), Health Connect `SleepSessionRecord` avec étapes `AWAKE` pour les éveils.
- **Lecture** optionnelle pour préremplir la saisie à partir d'une montre. L'agenda déclaratif reste la référence, c'est le principe de l'agenda du sommeil.
- Bibliothèques candidates : `@kingstinct/react-native-healthkit`, `react-native-health-connect` (config plugins disponibles).
- Impact conformité : Privacy Manifest et étiquettes App Store (« Health & Fitness », données non collectées par le développeur mais accès HealthKit), déclaration Health Connect sur Google Play, mise à jour de `docs/STORE.md` et de la politique de confidentialité. Toujours aucun réseau.

## Autres pistes

- iPad et tablettes Android (mise en page à deux colonnes : tissage + détail).
- Thème « haut contraste » en plus des deux ambiances.
- Traductions supplémentaires (le typage de `src/i18n` guide les contributions).
- Chiffrement de la sauvegarde JSON par phrase de passe.
