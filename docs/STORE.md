# Lueur — Fiches et formulaires des stores

> Aide-mémoire pour remplir la Play Console et App Store Connect.
> Les textes des fiches vivent dans `fastlane/metadata/` (FR + EN) et sont envoyés par `deliver` (iOS) et `supply` (Android).
> Principe : Lueur ne collecte rien, ne transmet rien, ne mesure rien. Chaque réponse ci-dessous en découle.
> Les libellés des consoles changent souvent : vérifier la formulation exacte au moment de la soumission.

## 0. Faits de référence

À garder sous les yeux avant de répondre à un questionnaire.

- [x] Aucune requête réseau. Pas de serveur, pas de compte, pas de SDK d'analyse, pas de crash reporting, pas de publicité.
- [x] Android release : permissions `INTERNET`, `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE` retirées du manifeste (`plugins/with-android-release.js`). `AD_ID` et `c2dm.RECEIVE` bloquées (`app.config.ts`).
- [x] Données stockées uniquement dans la base SQLite locale de l'app.
- [x] Export JSON / CSV / PDF via la feuille de partage du système, **à l'initiative de la personne**. Lueur ne choisit pas la destination et n'envoie rien lui-même.
- [x] Notifications locales uniquement (rappel du matin, signal du soir). Pas de push distant.
- [x] Pas de HealthKit, pas de Health Connect, pas de capteur.
- [x] Gratuit, sans achat intégré, licence MIT.
- [x] Pas un dispositif médical, pas de diagnostic, pas de traitement. « Inspiré de l'agenda du sommeil utilisé en TCC-I », jamais « thérapie ».

---

## 1. Google Play Console

### 1.1 Sécurité des données (Data safety)

*Play Console > Règles et programmes > Contenu de l'application > Sécurité des données.*

Rappel de la définition Google : une donnée est **collectée** quand elle est transmise hors de l'appareil par l'app. Le traitement sur l'appareil n'est pas une collecte. Le **partage** désigne un transfert vers un tiers ; un transfert lancé par la personne, qu'elle attend raisonnablement (feuille de partage), n'est pas déclaré comme partage.

| # | Question | Réponse | Pourquoi |
|---|---|---|---|
| 1 | Votre application collecte-t-elle ou partage-t-elle l'un des types de données utilisateur requis ? | **Non** | Rien ne quitte l'appareil. L'app release n'a même pas la permission `INTERNET`. |
| 2 | Toutes les données utilisateur collectées par l'app sont-elles chiffrées en transit ? | **Sans objet** (question masquée après « Non » en 1) | Aucune donnée n'est transmise. Si la console affiche malgré tout la question, ne pas cocher « Oui » par réflexe : c'est la réponse 1 qui fait foi. Revenir en 1 et confirmer « Non ». |
| 3 | Proposez-vous un moyen de demander la suppression des données ? | **Sans objet** (masquée) | Rien n'est collecté côté développeur. Dans l'app : Réglages > Vos données > Tout effacer, et la désinstallation supprime tout. À mentionner dans la politique de confidentialité. |
| 4 | Types de données (position, infos personnelles, santé et remise en forme, etc.) | **Aucun coché** | Les nuits sont des données de santé, mais elles restent sur l'appareil : non collectées au sens de Google. |
| 5 | Export JSON / CSV / PDF | Ne pas déclarer | Transfert initié par la personne via la feuille de partage du système, vers la destination qu'elle choisit. |
| 6 | Examen de sécurité indépendant (badge MASA) | **Non** | Facultatif. |
| 7 | Suppression de compte (URL de suppression) | **Sans objet** | L'app ne permet pas de créer de compte. |

Résultat attendu sur la fiche : « Aucune donnée collectée » et « Aucune donnée partagée avec des tiers ».

- [ ] URL de politique de confidentialité renseignée (obligatoire pour toutes les apps, et pour la déclaration Santé) : `https://OWNER.github.io/lueur/privacy.html`

### 1.2 Déclaration « Applications de santé » (Health apps)

*Contenu de l'application > Applications de santé.* Obligatoire pour toute app qui touche à la santé ou au bien-être.

- [ ] Catégorie de fonctionnalités à cocher : **Gestion du sommeil** (*Sleep management*), dans le groupe Santé et remise en forme.
- [ ] Ne cocher **aucune** fonctionnalité du groupe médical (aide à la décision clinique, gestion de maladies, gestion des médicaments et traitements, dispositifs médicaux, services de soins, etc.). Lueur n'en propose aucune.
- [ ] *Gestion du stress, relaxation* : ne pas cocher. Le mode « Je n'arrive pas à dormir » (respiration guidée, règle des 20 minutes) sert le sommeil ; il est couvert par Gestion du sommeil. Si Google le réclame lors de l'examen, l'ajouter sans changer le reste.
- [ ] Recherche sur des sujets humains : **Non**.
- [ ] Health Connect : **Non utilisé** (aucune permission `android.permission.health.*`).
- [ ] Statut réglementaire / dispositif médical : **Non**, l'app n'est pas un dispositif médical et ne revendique aucun usage médical.
- [ ] Vérifier que la description contient bien l'avertissement « pas un dispositif médical » (c'est le cas en FR et EN).

### 1.3 Classification du contenu (questionnaire IARC)

- [ ] Adresse e-mail de contact : celle du compte développeur.
- [ ] Catégorie : **Utilitaire, productivité, communication ou autre** (pas « Jeu », pas « Référence, actualités ou éducation »).
- [ ] Violence, peur, sexualité, langage grossier : **Non** partout.
- [ ] Substances contrôlées (drogues, alcool, tabac) : **Non**. Les repères « Alcool » et « Caféine » sont de simples étiquettes que la personne coche pour sa propre nuit ; l'app ne représente ni n'encourage aucune consommation. Si le questionnaire demande « références » au sens large et qu'un doute subsiste, répondre honnêtement et accepter la classification qui en résulte.
- [ ] Jeux d'argent, simulés ou réels : **Non**.
- [ ] Interaction entre utilisateurs, contenu généré partagé avec d'autres : **Non**. Les notes restent sur l'appareil, personne d'autre ne les voit.
- [ ] Partage de la position avec d'autres utilisateurs : **Non**.
- [ ] Achats numériques : **Non**.
- [ ] Navigateur web ou moteur de recherche : **Non**.
- Classification attendue : PEGI 3 / ESRB Everyone / USK 0.

### 1.4 Public cible et contenu

- [ ] Tranches d'âge cibles : **18 ans et plus** uniquement. L'app s'adresse à des adultes qui préparent éventuellement un rendez-vous médical. Cocher une tranche de moins de 13 ans ferait entrer l'app dans le programme Familles, sans intérêt ici.
- [ ] « L'app pourrait-elle attirer involontairement des enfants ? » : **Non** (pas de personnages, pas de jeu, ton adulte).

### 1.5 Autres déclarations de « Contenu de l'application »

| Déclaration | Réponse |
|---|---|
| Annonces (Ads) | **Non, mon application ne contient pas d'annonces** |
| Accès à l'application (App access) | **Toutes les fonctionnalités sont disponibles sans accès spécial** (pas de connexion, pas d'identifiants à fournir) |
| Identifiant publicitaire (Advertising ID) | **Non** : l'app n'utilise pas l'ID publicitaire, la permission `AD_ID` est bloquée |
| Application gouvernementale | Non |
| Fonctionnalités financières | Aucune |
| Application d'actualités | Non |
| Permissions d'alarme exacte / services au premier plan | Sans objet : `SCHEDULE_EXACT_ALARM` et `USE_EXACT_ALARM` bloquées, pas de service au premier plan |
| Tarification | Gratuite, sans achat intégré |

---

## 2. App Store Connect

### 2.1 Confidentialité de l'app (App Privacy, « étiquettes nutritionnelles »)

*App Store Connect > App > Confidentialité de l'app.*

- [ ] URL de politique de confidentialité : `https://OWNER.github.io/lueur/privacy.html` (aussi dans `fastlane/metadata/ios/*/privacy_url.txt`).
- [ ] « Collectez-vous des données depuis cette app ? » : **Non, nous ne collectons pas de données depuis cette app**.
- Étiquette publiée : **Données non collectées** (*Data Not Collected*).

Raisonnement :

- Pour Apple, « collecter » signifie transmettre des données hors de l'appareil d'une manière qui permet au développeur ou à ses partenaires d'y accéder au-delà du temps nécessaire pour traiter une requête en temps réel. Lueur ne transmet rien.
- Les données traitées uniquement sur l'appareil n'ont pas à être déclarées.
- L'export (PDF, CSV, JSON) passe par la feuille de partage d'iOS, à l'initiative de la personne. Lueur n'a jamais accès à la destination.
- Aucun SDK tiers ne collecte de données (pas d'analytics, pas de crash reporting, pas de publicité). À revérifier à chaque ajout de dépendance native.
- Pas de suivi (tracking) : pas besoin de l'invite App Tracking Transparency.

### 2.2 Manifeste de confidentialité (`PrivacyInfo.xcprivacy`)

Généré à partir de `ios.privacyManifests` dans `app.config.ts` :

| Clé | Valeur |
|---|---|
| `NSPrivacyTracking` | `false` |
| `NSPrivacyTrackingDomains` | `[]` |
| `NSPrivacyCollectedDataTypes` | `[]` (aucune donnée collectée) |

API à justification obligatoire (*required reason APIs*), utilisées par React Native, Expo et leurs modules :

| Catégorie | Codes | Raison déclarée |
|---|---|---|
| `NSPrivacyAccessedAPICategoryUserDefaults` | `CA92.1` | Lire et écrire des informations propres à l'app elle-même |
| `NSPrivacyAccessedAPICategoryFileTimestamp` | `C617.1` | Horodatages de fichiers situés dans le conteneur de l'app |
| | `0A2A.1` | Accès par une bibliothèque tierce qui encapsule l'API pour l'app (SDK wrapper) |
| | `3B52.1` | Horodatages de fichiers auxquels la personne a explicitement donné accès (sélecteur de documents, import d'une sauvegarde) |
| `NSPrivacyAccessedAPICategorySystemBootTime` | `35F9.1` | Mesurer le temps écoulé entre deux événements dans l'app |
| `NSPrivacyAccessedAPICategoryDiskSpace` | `E174.1` | Vérifier qu'il reste assez d'espace avant d'écrire un fichier (export, base) |
| | `85F4.1` | Afficher une information d'espace disque à la personne (déclarée par une dépendance) |

- [ ] Après `expo prebuild`, contrôler que `ios/Lueur/PrivacyInfo.xcprivacy` reflète bien ce tableau, et que les pods tiers embarquent leur propre manifeste (sinon App Store Connect renvoie un avertissement ITMS-91053 par e-mail).

### 2.3 Règles d'examen (App Review Guidelines) à garder en tête

- **1.4.1 (Sécurité physique, apps médicales)** : Lueur ne mesure rien et ne revendique aucune précision. Les durées sont « estimées à partir de ce que vous notez », les seuils de « nuit difficile » sont expliqués dans l'app (« Comment c'est compté »). Aucune promesse d'amélioration du sommeil, aucun diagnostic. La description rappelle d'en parler à un médecin.
- **5.1.1 (Collecte et stockage des données)** : politique de confidentialité accessible dans la fiche et dans l'app ; pas de compte donc pas d'obligation de suppression de compte ; accès aux fichiers uniquement via les sélecteurs système.
- **5.1.3 (Santé et recherche en santé)** : pas de HealthKit, pas de publicité ni d'exploitation des données de santé, aucune donnée de santé stockée par l'app dans iCloud. Point d'attention : la base locale est incluse dans la sauvegarde iCloud de l'appareil gérée par iOS ; ce n'est pas un stockage iCloud de l'app, mais si l'examen soulève la question, exclure le fichier de la sauvegarde (`isExcludedFromBackup`).
- **2.3 (Métadonnées exactes)** : captures issues de l'app réelle, pas de fonctionnalité annoncée qui n'existe pas, aucune mention d'Android dans la fiche iOS.
- **4.2 (Fonctionnalité minimale)** : app native complète, pas un site emballé.
- Notes pour l'examinateur : `fastlane/metadata/ios/review_information/notes.txt` (pas de compte, tout est local, comment afficher le mode nuit). Identifiant et mot de passe de démo : laisser vides. Remplir prénom, nom, e-mail et téléphone du contact (fichiers `*_TO_FILL`).

### 2.4 Classification par âge

Questionnaire App Store Connect (version 2025, niveaux 4+, 9+, 13+, 16+, 18+) :

- [ ] Violence (cartoon, réaliste, prolongée), horreur, contenu sexuel ou nudité, grossièretés, humour grossier : **Aucun**.
- [ ] Alcool, tabac ou drogues (usage ou références) : **Aucun** (étiquettes de journal personnel, pas de contenu).
- [ ] Informations médicales ou liées à un traitement : **Aucun**. L'app ne donne ni diagnostic ni traitement ; les phrases de contexte relèvent de l'hygiène du sommeil générale.
- [ ] Thèmes santé ou bien-être : **Oui** si la question est posée (c'est un agenda du sommeil).
- [ ] Jeux d'argent simulés, concours : **Aucun**.
- [ ] Contenu généré par les utilisateurs, messagerie, chat : **Non**.
- [ ] Accès web non restreint : **Non**.
- [ ] Publicité : **Non**.
- [ ] Contrôles parentaux, vérification d'âge : **Non**.
- Classification attendue : **4+**. Si le questionnaire propose un niveau plus élevé à cause des thèmes bien-être, l'accepter tel quel plutôt que de minimiser une réponse.

### 2.5 Conformité à l'exportation (chiffrement)

- `ITSAppUsesNonExemptEncryption = false` est déclaré dans `app.config.ts` (Info.plist). App Store Connect ne pose donc plus la question à chaque build.
- Justification : l'app n'implémente aucun chiffrement propre et n'établit aucune connexion réseau. Aucun document d'exportation à fournir, aucune déclaration ANSSI.

### 2.6 Autres réglages App Store Connect

- [ ] Prix : **Gratuit**, disponible dans tous les pays voulus.
- [ ] Achats intégrés : aucun.
- [ ] Appareils : iPhone uniquement (`supportsTablet: false`), pas de captures iPad à fournir.
- [ ] Statut de professionnel au titre du DSA (Union européenne) : à déclarer dans « Business ». Pour une app gratuite publiée par un particulier, sans activité commerciale, « non professionnel » est l'option la plus probable ; à trancher selon la situation réelle, car un statut professionnel affiche l'adresse et le téléphone publiquement.

---

## 3. Visuels des fiches

| Store | Élément | Taille exacte | Format | Source | État |
|---|---|---|---|---|---|
| iOS | Captures 6,9" (**obligatoire**) | 1320 × 2868 (portrait) | PNG ou JPEG, sans transparence, 1 à 10 par langue | générées par l'étape de captures (Maestro) | [ ] |
| iOS | Captures 6,5" (facultatif) | 1284 × 2778 ou 1242 × 2688 | idem | réduites depuis les 6,9" si besoin | [ ] |
| iOS | Icône App Store | 1024 × 1024 | PNG RGB, sans transparence, coins carrés | `assets/brand/generated/icon-ios.png` (vérifié : 1024 × 1024, RGB) | [x] |
| Android | Captures téléphone | min. 2, max. 8 ; 1080 × 1920 ou plus, en 9:16 (côté max ≤ 2 × côté min, 320 à 3840 px) | PNG ou JPEG 24 bits, sans transparence | générées par l'étape de captures | [ ] |
| Android | Image de présentation (feature graphic) | 1024 × 500 | PNG 24 bits sans transparence ou JPEG | `assets/brand/generated/feature-graphic.png` (vérifié : 1024 × 500, RGB) | [x] |
| Android | Icône haute résolution | 512 × 512 | PNG 32 bits, 1 Mo max | `assets/brand/generated/play-icon-512.png` (vérifié : 512 × 512, 195 Ko) | [x] |

Emplacements attendus par fastlane :

- iOS (`deliver`) : `fastlane/screenshots/fr-FR/` et `fastlane/screenshots/en-US/`.
- Android (`supply`) : `fastlane/metadata/android/<langue>/images/phoneScreenshots/` (dossiers déjà créés), plus `images/featureGraphic.png` et `images/icon.png` à copier depuis `assets/brand/generated/` avant l'envoi.
- Captures à produire en FR et en EN, en ambiance matin **et** nuit : saisie sur la bande, tissage du calendrier, tendances (fréquence, liens avec les repères), mode « Je n'arrive pas à dormir », export PDF. Données de démonstration uniquement, jamais de vraies nuits.

---

## 4. Catégories, mots-clés et formulations

### Catégories

- App Store : principale **Santé et forme** (`HEALTH_AND_FITNESS`), secondaire **Style de vie** (`LIFESTYLE`). Pas « Médecine » : cette catégorie attire un examen plus strict et laisserait croire à un usage médical.
- Google Play : **Santé et remise en forme**, à choisir dans *Présence sur le Store > Configuration de la fiche*.

### Nom et sous-titre

| | FR | EN |
|---|---|---|
| Nom iOS / titre Play (≤ 30) | Lueur — agenda du sommeil (25) | Lueur: Sleep Diary (18) |
| Sous-titre iOS (≤ 30) | Noter ses nuits, sans compte (28) | Log your nights, privately (26) |
| Description courte Play (≤ 80) | Un agenda du sommeil privé. Votre nuit en 15 secondes, sans compte ni réseau. (77) | A private sleep diary. Log your night in 15 seconds. Nothing leaves your phone. (79) |

### Mots-clés iOS (≤ 100 caractères, sans espace après les virgules)

Les mots du nom et du sous-titre sont déjà indexés par Apple : ne pas les répéter (« lueur », « agenda », « sommeil », « sleep », « diary »).

- FR (96) : `insomnie,nuit,journal,carnet,endormissement,réveil,coucher,rythme,TCC-I,fatigue,hors ligne,privé`
- EN (92) : `insomnia,journal,log,night,bedtime,wake,awake,rest,routine,CBT-I,tired,offline,private,notes`

« TCC-I » / « CBT-I » est un mot-clé de recherche, pas une promesse : la fiche dit seulement « s'inspire de ». Aucun mot-clé de marque tierce, aucun terme de diagnostic.

### Formulation « pas un dispositif médical »

Utilisée dans les descriptions longues (FR et EN), reprise de l'écran À propos de l'app (`about.medical`, `about.inspiration`) :

> Lueur s'inspire de l'agenda du sommeil utilisé en thérapie comportementale et cognitive de l'insomnie (TCC-I). Ce n'est pas une thérapie. Lueur ne pose pas de diagnostic et ne remplace pas l'avis d'un·e professionnel·le de santé. Les durées sont estimées à partir de ce que vous notez, pas mesurées. Si vos nuits difficiles durent depuis plusieurs semaines, en parler à un médecin peut aider.

> Lueur is inspired by the sleep diary used in cognitive behavioural therapy for insomnia (CBT-I). It is not a therapy. Lueur does not diagnose anything and does not replace advice from a health professional. Durations are estimated from what you log, not measured. If difficult nights have been going on for several weeks, talking to a doctor can help.

À éviter partout (fiches, captures, notes de version) : « traiter », « soigner », « guérir », « diagnostic » (sauf pour dire qu'il n'y en a pas), « thérapie » (sauf « s'inspire de »), « la meilleure app », superlatifs, points d'exclamation, emoji, promesse de mieux dormir.

### Vérifier les longueurs

Les limites sont contrôlées en caractères (pas en octets). Après toute modification d'un fichier de `fastlane/metadata/`, recompter, par exemple :

```sh
for f in fastlane/metadata/*/*/{name,subtitle,title,keywords,short_description}.txt; do
  [ -f "$f" ] && printf '%4d  %s\n' "$(tr -d '\n' < "$f" | wc -m)" "$f"
done
```
