# Journal des décisions

Format : date — décision — raison. Les plus récentes en bas.

## 2026-09-25

- **Nom : Lueur** (au lieu de « Veilleuse », sur demande). Identifiant `app.lueur`, schéma d'URL `lueur://`. Alternatives dans `NAMING.md`.
- **Expo SDK 57** (dernier stable au 2026-09-25 : expo 57.0.25, React Native 0.86.3, React 19.2.3, Reanimated 4.5, Skia 2.6).
- **Gestionnaire de paquets : npm.** Le plus universel pour la CI et les contributeurs. npm 12 bloque les scripts d'installation par défaut. Les paquets autorisés sont listés dans `allowScripts` de `package.json` (Skia a besoin de son `postinstall` pour copier ses binaires natifs).
- **Web non supporté.** `react-native-web` retiré : l'app est mobile, et expo-sqlite sur le web demande une configuration WASM inutile ici. `react-dom` reste présent parce qu'une dépendance optionnelle d'expo-router le résout sinon vers une version incompatible.
- **Polices : Young Serif + Ysabeau Office** (OFL), fichiers statiques embarqués au build via le plugin `expo-font` (aucun chargement réseau). Voir DESIGN §4.
- **Palette** : encre et nuit chaude légèrement réchauffées (`#1C1A1F`, `#29252B`), variantes foncées d'argile, sauge et brume pour le texte en mode Aube (contrastes AA). Voir DESIGN §3.
- **Identité d'une nuit = date de réveil** (`wakeDate`). C'est la convention des agendas du sommeil utilisés en consultation (« ce matin, j'ai… »), et elle rend la saisie du matin évidente. Affichage « nuit du 24 au 25 ».
- **Instants en epoch ms + décalage UTC stocké** au coucher et au réveil. Durées correctes lors des changements d'heure, heures affichées fidèles au lieu où la nuit a eu lieu.
- **Éveils stockés avec leur position** (`offsetMin` depuis le coucher) en plus de leur durée : la bande de nuit peut les placer. Quand la saisie ne donne que le nombre et la durée, les positions sont réparties régulièrement.
- **Définition de la « nuit difficile »** : ressenti ≤ 2, ou endormissement > 30 min, ou éveils cumulés > 30 min. Ce sont les seuils usuels des agendas du sommeil en recherche. L'app les explique et ne les présente jamais comme un diagnostic.
- **Transition d'ambiance par fondu, pas par interpolation continue des couleurs de texte** : une interpolation linéaire papier ↔ encre casse le contraste à mi-chemin. Voir DESIGN §2.
- **Langue des documents** : docs de conception en français (propriétaire du projet), README en anglais avec version française (`README.fr.md`) pour la portée open source. Code et commentaires en anglais.
- **Nom sur les stores avec suffixe** : « Lueur — agenda du sommeil » / « Lueur: Sleep Diary ». Une app « Lueur: Shift Sleep Coach » existe sur l'App Store depuis juin 2026 (voir `NAMING.md`).
- **Drizzle en mode synchrone** : le pilote expo-sqlite de drizzle est synchrone, comme better-sqlite3. Les repositories sont typés sur `BaseSQLiteDatabase<'sync'>` et testés contre les vraies migrations avec better-sqlite3 (dépendance de développement).
- **Ressenti non prérempli** : tout le reste de la saisie l'est, mais le ressenti demande un geste. C'est la seule information que l'app ne peut pas deviner, et un ressenti « par défaut » fausserait la fréquence des nuits difficiles. La saisie reste sous les 15 secondes (un toucher, puis Enregistrer).
- **Rattrapage des nuits oubliées** : proposé seulement pour les jours postérieurs à la première nuit notée, sur 7 jours en accueil (14 jours accessibles depuis la saisie). Pas de message culpabilisant le premier jour.
- **Rappels planifiés un par un sur 14 jours glissants** (déclencheurs `DATE`) plutôt qu'un rappel quotidien répétitif : on peut sauter les matins déjà notés, et la replanification à chaque retour au premier plan suit les fuseaux horaires. Sans ouverture de l'app pendant 14 jours, les rappels s'arrêtent d'eux-mêmes.
- **Pas d'alarmes exactes Android** : `SCHEDULE_EXACT_ALARM` / `USE_EXACT_ALARM` sont bloquées. Sur Android 14+, elles demandent une action de l'utilisateur, et Google Play les réserve aux réveils et agendas. Le rappel du matin arrive donc « vers » l'heure choisie (fenêtre système, en général quelques minutes).
- **Mode nuit** : luminosité à 2 % pendant l'écran, restaurée en sortie (valeur précédente sur iOS, luminosité système sur Android). Réveil enregistré automatiquement à l'ouverture et clos à la sortie. Un réveil laissé ouvert (app tuée) est borné à 60 min au lancement suivant.
- **Icônes dessinées en Skia** à partir de chemins SVG (pas de `react-native-svg`) : une seule bibliothèque de rendu.
- **Contraste des objets graphiques** : l'argile du matin est assombrie en `#B37656` pour la bande et le bouton principal (3:1 sur papier, WCAG 1.4.11). Le texte posé dessus reste à 4,6:1.
- **Chiffres** : Young Serif garde ses chiffres elzéviriens dans les titres. Les grands nombres isolés (`numeral`) passent en chiffres alignés (`lnum`), car le « 1 » elzévirien se lit comme un « I ».
- **JDK 21 pour les builds Android.** Le JDK 25 (celui livré avec Android Studio en 2026) fait échouer la configuration CMake de Skia et Worklets (« restricted method » traité comme une erreur). CI et documentation fixent Temurin/OpenJDK 21.
- **ABI Android** : `armeabi-v7a`, `arm64-v8a`, `x86_64`. Le x86 32 bits n'équipe quasiment plus aucun appareil et allonge le build.
- **Données de démonstration** : `lueur://demo` charge un agenda de 60 nuits déterministe (`src/demo/seed.ts`). Actif seulement en développement et dans les builds `EXPO_PUBLIC_DEMO=1` (e2e, captures). Dans les builds publiés, la route redirige vers l’accueil.
- **Captures des stores** : prises sur l'émulateur Android par Maestro, avec un build de démonstration sans barre d'état, puis cadrées dans la DA (`scripts/frame-screenshots.py`) aux tailles iOS 6,9" / 6,5" et Android. Ces captures neutres sont réutilisées pour l'App Store tant qu'aucune capture sur simulateur iOS n'est faite (procédure dans `RELEASE.md`).
- **Parcours e2e Maestro par `testID`** : indépendants de la langue et de l'ambiance.
- **Signature iOS** : clé d'API App Store Connect. En CI, import d'un `.p12` de distribution. En local, `get_certificates` et `get_provisioning_profile`. Pas de `match` : il faudrait un dépôt privé de certificats en plus.
- **Rééquilibrage positif (retour du propriétaire)** : l'accueil ne compte plus seulement les nuits difficiles. Chaque nuit a un ton (reposante / moyenne / difficile), l'accueil montre les trois, reposantes d'abord, avec une tendance formulée positivement quand c'est possible. « Ce qui semble aider » passe avant « ce qui semble peser », et l'encart de l'accueil met en avant ce qui aide. Le critère de nuit difficile est inchangé (PDF, fréquence).
- **Pas d'émojis pour le ressenti** : le brief les exclut (DA adulte). Les cinq lueurs dessinées suffisent pour noter. Des mots facultatifs (« agitée », « paisible »…) restent possibles plus tard, sous forme de repères.
