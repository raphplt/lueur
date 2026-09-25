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
