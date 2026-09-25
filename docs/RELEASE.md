# Publier Lueur

Tout est prêt dans le dépôt : lanes fastlane, workflows GitHub Actions, fiches des stores (`fastlane/metadata/`), captures (`fastlane/screenshots/`, `fastlane/metadata/android/*/images/`), politique de confidentialité (`site/`), réponses aux formulaires (`docs/STORE.md`).
Ce document liste **ce qui demande vos identifiants**, dans l'ordre. Aucun service Expo (EAS) n'est utilisé.

> État vérifié le 2026-09-25 : build Android debug et release (AAB) produits en local sous Linux, manifeste release sans permission `INTERNET`, e2e Maestro verts sur émulateur Android 15.
> **Non vérifié** : le build iOS, faute de Mac dans l'environnement de développement. Les lanes iOS sont écrites et valident leur syntaxe (`bundle exec fastlane lanes`), mais le premier `fastlane ios build` sur votre Mac M1 est le vrai test (section 3.4).

## 0. Outils

### Linux (Arch)

```bash
sudo pacman -S --needed nodejs npm jdk21-openjdk ruby rubygems
sudo archlinux-java set java-21-openjdk      # JDK 21 : le JDK 25 casse la configuration CMake (voir DECISIONS)
gem install bundler
# SDK Android : via Android Studio, ou cmdline-tools dans ~/Android/Sdk
export ANDROID_HOME=~/Android/Sdk
npm ci
bundle install                                # installe fastlane dans vendor/bundle
```

### Mac M1

```bash
xcode-select --install                        # puis Xcode (dernière version stable) depuis l'App Store
brew install node@24 cocoapods rbenv
rbenv install 3.3.6 && rbenv local 3.3.6
gem install bundler
npm ci
bundle install
```

## 1. Identifiants de l'app

- iOS `bundleIdentifier` et Android `package` : **`app.lueur`** (`app.config.ts`, `fastlane/Appfile`).
- Ils deviennent **définitifs** au premier envoi sur un store. Pour en changer, modifiez-les aux deux endroits **avant**.
- Nom affiché sur l'appareil : « Lueur ». Titre sur les stores : « Lueur — agenda du sommeil » / « Lueur: Sleep Diary ». Une app « Lueur: Shift Sleep Coach » existe déjà sur l'App Store, le suffixe est donc nécessaire (voir `NAMING.md`).

## 2. Android — Google Play

### 2.1 Compte et clé d'envoi

1. Créez un compte développeur Google Play (paiement unique de 25 $) : <https://play.google.com/console/signup>.
2. Générez la **clé d'envoi** (upload key). Gardez le fichier et les mots de passe hors du dépôt, avec une sauvegarde :
   ```bash
   mkdir -p ~/keys
   keytool -genkeypair -v -keystore ~/keys/lueur-upload.jks -alias lueur-upload \
     -keyalg RSA -keysize 4096 -validity 10000
   ```
3. Déclarez-la pour Gradle dans `~/.gradle/gradle.properties` (hors dépôt) :
   ```properties
   LUEUR_UPLOAD_STORE_FILE=/home/VOUS/keys/lueur-upload.jks
   LUEUR_UPLOAD_STORE_PASSWORD=…
   LUEUR_UPLOAD_KEY_ALIAS=lueur-upload
   LUEUR_UPLOAD_KEY_PASSWORD=…
   ```
   Le plugin `plugins/with-android-release.js` les lit. Sans elles, l'AAB est signé avec la clé debug (pour tester seulement : Google Play le refuse).

### 2.2 Premier build local

```bash
LUEUR_BUILD_NUMBER=1 bundle exec fastlane android build
# → build/android/lueur-1.aab, et vérifie que le manifeste release n'a pas INTERNET
```

Équivalent sans fastlane :

```bash
LUEUR_BUILD_NUMBER=1 npx expo prebuild --platform android --clean
cd android && ./gradlew bundleRelease     # → android/app/build/outputs/bundle/release/app-release.aab
```

### 2.3 Créer l'app dans la Play Console

1. **Créer une application** : nom « Lueur — agenda du sommeil », langue par défaut Français (France), Application, Gratuite.
2. **Test interne → Créer une release** : envoyez **à la main** `build/android/lueur-1.aab`. Google impose un premier envoi manuel avant que l'API accepte les builds. Acceptez **Play App Signing** : Google conserve la clé de signature, vous gardez la clé d'envoi.
3. **Contenu de l'application** : remplissez avec `docs/STORE.md` : politique de confidentialité (URL GitHub Pages, section 4), accès à l'app (aucune connexion), annonces (non), classification du contenu (IARC), public cible, **Sécurité des données** (aucune donnée collectée ni partagée), déclaration **Applications de santé**.
4. **Fiche du Store** : texte et visuels sont dans `fastlane/metadata/android/` ; ils seront envoyés par `fastlane android metadata` (2.5). Icône 512 : `assets/brand/generated/play-icon-512.png`. Image de présentation : `assets/brand/generated/feature-graphic.png`.

### 2.4 Clé d'API (compte de service)

1. Google Cloud Console → créez un projet → activez **Google Play Android Developer API**.
2. IAM → Comptes de service → créez `lueur-fastlane` → Clés → Ajouter une clé JSON → téléchargez-la (ex. `~/keys/lueur-play.json`).
3. Play Console → **Utilisateurs et autorisations** → Inviter l'e-mail du compte de service → autorisations sur l'app Lueur : « Publier sur les canaux de test », « Gérer les releases de production », « Gérer la fiche du Store ».
4. Test : `PLAY_JSON_KEY_PATH=~/keys/lueur-play.json bundle exec fastlane run validate_play_store_json_key json_key:~/keys/lueur-play.json`.

### 2.5 Publier

```bash
export PLAY_JSON_KEY_PATH=~/keys/lueur-play.json
bundle exec fastlane android metadata   # fiche FR/EN + captures
bundle exec fastlane android beta       # build + test interne (numéro de version = dernier + 1)
bundle exec fastlane android release    # build + production + fiche
```

`LUEUR_PLAY_DRAFT=1` envoie la release en brouillon, à valider dans la console.

## 3. iOS — App Store

### 3.1 Comptes

1. Adhérez à l'Apple Developer Program (99 $/an) : <https://developer.apple.com/programs/enroll/>. Notez votre **Team ID** (Membership details).
2. Certificates, Identifiers & Profiles → Identifiers → **+** → App IDs → App → Bundle ID explicite `app.lueur`, description « Lueur ». Aucune capacité particulière : pas de push distant, pas d'App Groups en V1.

### 3.2 App Store Connect

1. Mes apps → **+** → Nouvelle app : plateforme iOS, nom « Lueur — agenda du sommeil », langue principale Français, bundle ID `app.lueur`, SKU `lueur`.
2. Utilisateurs et accès → Intégrations → **App Store Connect API** → Générer une clé (rôle **App Manager**). Téléchargez le `.p8` (une seule fois possible), notez le **Key ID** et l'**Issuer ID**.
3. Confidentialité de l'app : **« Données non collectées »** (détail dans `docs/STORE.md`). URL de politique de confidentialité : section 4.
4. Classification par âge et conformité export : voir `docs/STORE.md` (`ITSAppUsesNonExemptEncryption = false` est déjà dans l'Info.plist).

### 3.3 Variables d'environnement (Mac)

```bash
export ASC_KEY_ID=XXXXXXXXXX
export ASC_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
export ASC_KEY_PATH=~/keys/AuthKey_XXXXXXXXXX.p8
export APPLE_TEAM_ID=XXXXXXXXXX
```

### 3.4 Premier build (à valider sur votre Mac)

```bash
bundle exec fastlane ios build
```

Cette lane fait, dans l'ordre : numéro de build (dernier TestFlight + 1), `expo prebuild --platform ios --clean` (lance `pod install`), certificat de distribution (créé dans votre trousseau s'il n'existe pas), profil App Store « Lueur App Store », signature manuelle, archive et export de `build/ios/Lueur.ipa`.

Si l'archive échoue, ouvrez `ios/Lueur.xcworkspace` dans Xcode, choisissez la cible *Lueur* puis *Any iOS Device*, et lancez *Product → Archive* pour lire l'erreur complète.

Test sur simulateur, sans signature : `npx expo run:ios`.

### 3.5 Publier

```bash
bundle exec fastlane ios beta      # → TestFlight
bundle exec fastlane ios metadata  # textes et captures seuls
LUEUR_SUBMIT=1 bundle exec fastlane ios release   # → App Store et soumission à la revue
```

Sans `LUEUR_SUBMIT=1`, la version est préparée mais pas soumise : vous la soumettez depuis App Store Connect. La publication reste manuelle après acceptation (`automatic_release: false`).

## 4. Site et politique de confidentialité (GitHub Pages)

1. Poussez le dépôt sur GitHub (public).
2. Remplacez `OWNER` par votre nom d'utilisateur GitHub dans `site/**/*.html` et dans les URL de `fastlane/metadata/ios/*/`, puis `CONTACT_EMAIL` dans `site/privacy.html` et `site/en/privacy.html`.
   ```bash
   grep -rl "OWNER\|CONTACT_EMAIL" site fastlane/metadata | xargs sed -i 's/OWNER/votre-compte/g; s/CONTACT_EMAIL/vous@exemple.fr/g'
   ```
3. Settings → Pages → Source : **GitHub Actions**. Le workflow `pages.yml` publie `site/` à chaque modification.
4. L'URL `https://votre-compte.github.io/lueur/privacy.html` sert aux deux stores.

## 5. GitHub Actions

Workflows :

| Fichier | Quand | Ce qu'il fait |
|---|---|---|
| `ci.yml` | push, PR | typecheck, lint, tests, vérification « aucun appel réseau » |
| `android.yml` | push sur `main`, tag `v*`, manuel | AAB (debug-signé sans secrets). Sur tag : `fastlane android beta`. Manuel : lane au choix |
| `ios.yml` | tag `v*`, manuel | `fastlane ios beta` (ou lane au choix) sur `macos-latest` |
| `e2e-android.yml` | manuel, hebdomadaire | build de démonstration + parcours Maestro sur émulateur |
| `pages.yml` | modification de `site/` | publication du site |

Secrets à créer (Settings → Secrets and variables → Actions). **Aucun n'est dans le dépôt.**

| Secret | Contenu |
|---|---|
| `ANDROID_UPLOAD_KEYSTORE_BASE64` | `base64 -w0 ~/keys/lueur-upload.jks` |
| `ANDROID_UPLOAD_STORE_PASSWORD` | mot de passe du keystore |
| `ANDROID_UPLOAD_KEY_ALIAS` | `lueur-upload` |
| `ANDROID_UPLOAD_KEY_PASSWORD` | mot de passe de la clé |
| `PLAY_JSON_KEY` | contenu du JSON du compte de service |
| `ASC_KEY_ID` / `ASC_ISSUER_ID` | clé App Store Connect |
| `ASC_KEY_P8_BASE64` | `base64 -i AuthKey_XXXX.p8` |
| `APPLE_TEAM_ID` | Team ID |
| `IOS_DIST_CERT_P12_BASE64` | certificat « Apple Distribution » exporté du trousseau en `.p12`, en base64 |
| `IOS_DIST_CERT_PASSWORD` | mot de passe du `.p12` |

Variables facultatives : `LUEUR_BUILD_NUMBER` (force le numéro de version Android en CI, sinon `github.run_number`), `LUEUR_SUBMIT` (`1` pour soumettre à la revue Apple).

Si des builds ont été envoyés à la main avec des numéros plus élevés que `github.run_number`, fixez `LUEUR_BUILD_NUMBER` au-dessus du dernier numéro utilisé.

## 6. Captures d'écran

Déjà générées pour la v1.0.0. Pour les refaire :

```bash
npm run build:demo:android     # APK release x86_64 avec l'agenda de démonstration (EXPO_PUBLIC_DEMO=1)
npm run screenshots:android    # émulateur lancé : Maestro capture, puis cadrage aux tailles des stores
```

Le cadrage (`scripts/frame-screenshots.py`) produit :
- iOS : 1320×2868 (6,9") et 1284×2778 (6,5") dans `fastlane/screenshots/ios/{fr-FR,en-US}/` ;
- Android : 1080×2160 dans `fastlane/metadata/android/{fr-FR,en-US}/images/phoneScreenshots/`.

Pour des captures iOS natives, lancez le même flux Maestro sur un simulateur iPhone 16 Pro Max (`maestro test e2e/screenshots/capture.yaml`) puis `python3 scripts/frame-screenshots.py`.

## 7. Nouvelle version

1. Changez `VERSION` dans `app.config.ts` (et `version` dans `package.json`).
2. Rédigez les notes : `fastlane/metadata/ios/{fr-FR,en-US}/release_notes.txt` et `fastlane/metadata/android/{fr-FR,en-US}/changelogs/<versionCode>.txt`.
3. `npm run check && npm run e2e`.
4. `git tag v1.1.0 && git push --tags` : la CI envoie en test interne (Play) et sur TestFlight.
5. Promotion en production : `bundle exec fastlane android release` / `ios release`, ou depuis les consoles.
