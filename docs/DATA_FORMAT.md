# Format d'export Lueur

> Référence du fichier produit par **Réglages → Vos données → Sauvegarde complète**, et relu par **Restaurer une sauvegarde**.
> Implémentation : `src/domain/export-format.ts` (construction, validation) et ses tests `src/domain/__tests__/export-format.test.ts`.

Ce format est **public et stable**. Il sert à la sauvegarde, au changement de téléphone, et à tout outil externe qui voudrait lire ses nuits (tableur, script, futur serveur MCP local, voir `ROADMAP.md`).

## Principes

- Un seul fichier JSON UTF-8, nommé `lueur-AAAA-MM-JJ.json`.
- `format` vaut toujours `"lueur.export"`. `schemaVersion` est un entier.
- **Compatibilité** : une version de l'app sait lire toutes les versions de schéma antérieures ou égales à la sienne. Un changement incompatible incrémente `schemaVersion` et s'accompagne d'une fonction de migration testée. Un champ ajouté de façon optionnelle ne change pas la version.
- **Heures locales avec décalage** : chaque instant d'une nuit est écrit en ISO 8601 **avec le décalage UTC en vigueur à ce moment-là** (`2026-09-24T23:10:00+02:00`). L'heure affichée reste celle vécue, même en voyage ou lors d'un changement d'heure. Les durées se calculent par différence d'instants.
- Les horodatages techniques (`exportedAt`, `createdAt`, `updatedAt`, éveils du mode nuit) sont en UTC (`…Z`).
- Les champs `derived` sont **informatifs** : recalculés à chaque export, ignorés à l'import. Ils évitent aux outils externes de réimplémenter les calculs.

## Schéma v1

```jsonc
{
  "format": "lueur.export",
  "schemaVersion": 1,
  "exportedAt": "2026-09-25T08:00:00.000Z",
  "app": { "name": "Lueur", "version": "1.0.0" },

  "tags": [
    // Repère proposé : `key` est l'identifiant stable, le libellé dépend de la langue.
    { "id": "5d1c…", "key": "noise", "label": null, "enabled": true, "sortOrder": 0 },
    // Repère personnel : `key` vaut null, `label` porte le texte saisi.
    { "id": "a9e2…", "key": null, "label": "Le chat", "enabled": true, "sortOrder": 12 }
  ],

  "nights": [
    {
      "id": "0f3b…",
      "wakeDate": "2026-09-25",                  // date locale du réveil : identifie la nuit (unique)
      "bedtime": "2026-09-24T23:10:00+02:00",    // au lit
      "sleepLatencyMin": 25,                     // délai d'endormissement
      "awakenings": [                            // éveils nocturnes
        { "offsetMin": 190, "durationMin": 15 }  // début = coucher + offsetMin (minutes réelles)
      ],
      "finalWake": "2026-09-25T07:00:00+02:00",  // réveil final
      "outOfBed": "2026-09-25T07:20:00+02:00",   // lever
      "quality": 2,                              // ressenti 1 (très difficile) … 5 (reposante)
      "note": "Voisins tard",                    // ou null
      "tags": ["5d1c…"],                         // identifiants de `tags`
      "createdAt": "2026-09-25T05:21:00.000Z",
      "updatedAt": "2026-09-25T05:21:00.000Z",
      "derived": {
        "timeInBedMin": 490,       // lever − coucher
        "totalSleepMin": 430,      // (réveil final − endormissement) − éveils
        "sleepEfficiency": 0.878,  // sommeil / temps au lit
        "wasoMin": 15,             // somme des durées d'éveil
        "awakeningCount": 1,
        "difficult": true          // voir « Nuit difficile » ci-dessous
      }
    }
  ],

  // Éveils enregistrés par le mode « je n'arrive pas à dormir ».
  "wakeEvents": [
    { "id": "…", "startedAt": "2026-09-25T01:12:00.000Z", "endedAt": "2026-09-25T01:34:00.000Z", "nightId": "0f3b…" }
  ],

  // Journal de l'environnement.
  "environmentChanges": [
    { "id": "…", "date": "2026-09-04", "label": "Moustiquaire", "note": null, "createdAt": "2026-09-04T07:00:00.000Z" }
  ],

  // Réglages (voir src/domain/settings.ts). Clés inconnues ignorées à l'import.
  "settings": {
    "onboarded": true,
    "theme": "auto",                 // "auto" | "dawn" | "ink"
    "clock": "system",               // "system" | "24h" | "12h"
    "language": "system",            // "system" | "fr" | "en"
    "weekStartsOn": "system",        // "system" | 1 (lundi) | 0 (dimanche) | 6 (samedi)
    "habits": { "bedtimeClock": 1380, "riseClock": 450 },   // minutes depuis minuit
    "bother": ["noise", "thoughts"],
    "goal": "understand",            // "understand" | "regularize" | "appointment" | null
    "morningReminder": { "enabled": true, "clock": 480 },
    "eveningReminder": { "enabled": false, "clock": 1320 }
  }
}
```

### Clés des repères proposés

`noise` (bruit), `insect` (insecte), `thoughts` (pensées), `clockWatching` (heure regardée), `lateScreen` (écran tard), `caffeine`, `alcohol`, `exercise` (sport), `lateMeal` (repas tard), `heat` (chaleur), `pain` (douleur), `stress`.

### Nuit difficile

`derived.difficult` vaut `true` si au moins une condition est vraie : `quality ≤ 2`, `sleepLatencyMin > 30`, `wasoMin > 30`. Ce sont les seuils usuels des agendas du sommeil en recherche. Ce n'est pas un diagnostic.

## Règles de validation à l'import

Le fichier est refusé en entier (rien n'est modifié) si :

- ce n'est pas du JSON, ou `format` n'est pas `lueur.export`, ou `schemaVersion` est plus récent que l'app ;
- une nuit est incohérente : dates invalides, `bedtime < finalWake ≤ outOfBed` non respecté, `quality` hors 1–5, durées négatives ;
- deux nuits partagent la même `wakeDate`.

Sont tolérés : collections absentes (vides), `note`/`tags`/`createdAt` absents, repères de nuit inconnus (ignorés), `nightId` d'éveil inconnu (remis à `null`), réglages invalides (valeur par défaut champ par champ).

L'import **remplace** toutes les données du téléphone, après confirmation, dans une seule transaction SQLite : en cas d'erreur, rien n'est modifié.

## CSV

**Tableau (CSV)** exporte une ligne par nuit, en-têtes anglais stables, séparateur virgule, fin de ligne CRLF, UTF-8 :

`wake_date, bedtime, sleep_onset, final_wake, out_of_bed, time_in_bed_min, total_sleep_min, sleep_efficiency_pct, sleep_latency_min, awakenings, waso_min, quality_1_5, difficult, tags, note`

Les repères sont séparés par `|` et écrits dans la langue de l'app. Le CSV est un export de lecture : il ne peut pas être réimporté (utiliser le JSON).
