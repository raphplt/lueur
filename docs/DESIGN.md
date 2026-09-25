# Lueur — Système de design

> Référence unique pour toute l'interface. Tout écran, composant ou visuel doit s'y conformer.
> Implémentation : `src/ui/tokens.ts` (tokens), `src/ui/theme.tsx` (thème), `src/ui/type.tsx` (typographie).

## 1. Concept

**La lumière d'une veilleuse dans une pièce sombre.** Une petite source chaude, une lueur diffuse, un grain léger façon papier ou pellicule. L'interface est une pièce : le fond est le mur, le texte est posé dessus, et la seule chose qui brille est la lumière qui porte le sens (la nuit, le ressenti, l'action principale).

Trois règles en découlent :

1. **Une seule source de lumière par écran.** Une seule couleur saturée émet de la lueur (ambre la nuit, argile le matin). Tout le reste est tonal.
2. **Pas d'ombres portées, des lueurs.** On ne « soulève » jamais une carte avec une ombre grise. Une surface se distingue par un ton légèrement différent et un filet fin. Ce qui compte émet de la lumière, rien d'autre ne flotte.
3. **Chaque nuit est une bande horizontale de lumière**, comme un horizon. C'est la signature visuelle, présente sur l'accueil, la saisie, le calendrier, les rapports, le PDF et l'icône.

## 2. L'app suit l'heure

Deux ambiances, choisies selon l'heure (ou forcées dans les réglages : auto / matin / nuit).

| Ambiance | Quand (mode auto) | Idée |
|---|---|---|
| **Aube** | de l'heure de lever habituelle − 1 h jusqu'à 19 h 30 | aube sur papier : crème chaud, argile, sauge |
| **Encre** | de 19 h 30 jusqu'à l'heure de lever habituelle − 1 h | encre très sombre et chaude, une seule lueur ambrée |

**Transition fluide.** Quand l'ambiance change pendant que l'app est ouverte (ou au retour au premier plan), le fond passe d'une palette à l'autre en fondu de 2,4 s. On ne mélange **pas** les couleurs de texte en continu : une interpolation linéaire papier ↔ encre produirait des gris intermédiaires sans contraste. Seuls le fond, le grain et la lueur d'ambiance sont interpolés. Le texte bascule à mi-parcours, sous le voile du fondu. En plus, la **lueur d'ambiance** (halo en haut d'écran) varie en continu avec l'heure : plus basse et plus rouge en soirée, plus haute et plus pâle en matinée.

## 3. Couleurs

### Palette de base (ajustée)

| Nom | Brief | Retenu | Justification |
|---|---|---|---|
| encre | `#1C1B22` | `#1C1A1F` | Teinte ramenée du bleu-violet vers un neutre chaud. Le violet froid est le cliché « app de sommeil » qu'on évite |
| nuit chaude | `#2A2630` | `#29252B` | Même correction de teinte |
| papier | `#EFE8DC` | `#EFE8DC` | Inchangé |
| argile | `#C98B6B` | `#C98B6B` | Remplissages seulement. Sur papier : 2,3:1, donc non utilisable en texte |
| ambre veilleuse | `#E8B77A` | `#E8B77A` | La lumière. 9,3:1 sur encre |
| sauge | `#9AAA98` | `#9AAA98` | Remplissages, états « posés » |
| brume | `#8C8794` | `#8C8794` | Texte discret de nuit (4,9:1 sur encre). Trop pâle le matin (2,9:1), donc variante foncée |

Dérivés pour le texte en mode Aube (AA ≥ 4,5:1 sur papier) : argile texte `#8F5236`, sauge texte `#4F634D`, brume texte `#5F5967`.

### Tokens sémantiques

| Token | Aube | Encre | Usage |
|---|---|---|---|
| `bg` | `#EFE8DC` | `#1C1A1F` | fond d'écran |
| `bgRaised` | `#F6F1E8` | `#29252B` | surfaces (cartes tonales, champs) |
| `bgSunken` | `#E5DCCD` | `#141216` | creux (piste de la bande, fond du tissage) |
| `line` | `#D6CAB7` | `#3A343C` | filets 1 px, séparateurs |
| `text` | `#1C1A1F` | `#EFE8DC` | texte principal |
| `textMuted` | `#5F5967` | `#B3ABB5` | texte secondaire |
| `textFaint` | `#7A7482` | `#8C8794` | légendes, grands textes discrets (≥ 3:1, jamais pour du corps) |
| `light` | `#C98B6B` | `#E8B77A` | **la** source lumineuse : bande, CTA, sélection |
| `lightText` | `#8F5236` | `#E8B77A` | texte accentué |
| `lightOn` | `#1C1A1F` | `#1C1A1F` | texte posé sur `light` |
| `glow` | `#E8B77A` | `#E8B77A` | halo (toujours ambre, opacité variable) |
| `calm` | `#9AAA98` | `#9AAA98` | remplissage sauge |
| `calmText` | `#4F634D` | `#A9B8A7` | texte sauge |
| `wake` | `#B9AC99` | `#0F0E11` | zones d'éveil dans la bande |

Mode **nuit blanche** (écran « je n'arrive pas à dormir ») : fond `#0B0A0C`, texte `#877F89` (4,6:1), lueur ambre à 40 % d'opacité maximale.

Tous les couples texte/fond ci-dessus sont vérifiés par un test automatisé (`src/ui/__tests__/contrast.test.ts`).

### Interdits

Dégradés violet/bleu néon, ciel étoilé, lune, moutons, nuages, emoji, cartes blanches à ombre portée, couleurs Material/iOS par défaut (bleu système, violet Material).

## 4. Typographie

Deux familles libres (SIL OFL), embarquées dans l'app (`assets/fonts/`), peu vues dans les apps de santé :

- **Young Serif** (Bastien Sozeau) pour les titres, les chiffres clés et le logotype. Serif à fort caractère, rond, légèrement « encré », aux chiffres elzéviriens (qui descendent sous la ligne) : les nombres ressemblent à une écriture, pas à un tableau de bord. Une seule graisse, ce qui impose la retenue.
- **Ysabeau Office** (Christian Thalmann) pour le corps et l'interface. Sans-serif humaniste aux formes calligraphiques, très lisible en petit, chiffres alignés pour les heures et les tableaux.

| Style | Famille | Taille / interligne | Usage |
|---|---|---|---|
| `display` | Young Serif | 40 / 46 | titre d'accueil, logotype |
| `numeral` | Young Serif | 44 / 50 | chiffre clé d'une carte (« 6 h 40 ») |
| `title` | Young Serif | 28 / 34 | titre d'écran |
| `heading` | Young Serif | 21 / 28 | titre de section |
| `body` | Ysabeau Office 400 | 17 / 25 | texte courant |
| `bodyStrong` | Ysabeau Office 600 | 17 / 25 | emphase, boutons |
| `label` | Ysabeau Office 500 | 13 / 18, +0,6 d'approche, capitales | libellés de champs, onglets |
| `caption` | Ysabeau Office 400 | 14 / 20 | aides, notes de bas |
| `time` | Ysabeau Office 600 | 22 / 26, chiffres tabulaires | heures éditables |

Dynamic Type : toutes les tailles suivent le réglage système (`allowFontScaling`), avec un plafond `maxFontSizeMultiplier` de 1,6 sur les chiffres clés pour ne pas casser la bande. Les mises en page passent en colonne quand le texte grandit.

## 5. Espacements, rayons, lignes

- Grille de **4**. Échelle : `4, 8, 12, 16, 20, 24, 32, 40, 56, 72`.
- Marge d'écran : **24**. Espacement vertical entre sections : **32**.
- Rayons : `sm 8` (chips), `md 14` (champs, boutons), `lg 22` (surfaces), `full` (pastilles, poignées).
- Filets : 1 px (`StyleSheet.hairlineWidth` × 2 max), couleur `line`.
- Zones tactiles : **44 × 44 pt minimum**, 56 pour l'action principale. Les poignées de la bande ont une zone de 48 pt même si le dessin fait 14 pt.

## 6. Matière : grain et lueur

- **Grain** : bruit fractal Skia (`FractalNoise`, fréquence 0,9, 2 octaves) en mode `softLight`, opacité 5 % (Aube) / 7 % (Encre). Posé sur le fond de chaque écran, statique (pas de scintillement).
- **Lueur d'ambiance** : dégradé radial ambre très étendu, en haut de l'écran, opacité 6 à 14 % selon l'heure.
- **Lueur d'objet** : flou gaussien (`Blur` Skia, σ 8 à 18) sous la bande de nuit et sous l'action principale. Intensité proportionnelle au ressenti.

## 7. La bande de nuit

Composant `NightBand` (Skia). Axe horaire commun **18:00 → 14:00** (20 h) dans le calendrier pour que les nuits s'alignent comme un tissage. Axe resserré autour de la nuit dans la saisie.

| Élément | Rendu |
|---|---|
| Temps au lit (coucher → lever) | longueur totale de la bande, rayon plein |
| Délai d'endormissement | début de bande à 35 % d'opacité (« pas encore endormi ») |
| Sommeil | corps de la bande, dégradé `light` → `glow` → `light` |
| Éveils | encoches de couleur `wake`, bords adoucis |
| Réveil final → lever | fin de bande à 35 % d'opacité |
| Ressenti | intensité de la lueur : opacité du halo 10 % (1) → 70 % (5), σ 4 → 14 |

Positions des éveils : quand l'heure est connue (mode nuit ou saisie sur la bande), à sa place. Sinon, répartis régulièrement dans la période de sommeil. La bande reste une image, pas un hypnogramme.

**Calendrier = tissage.** Une ligne par nuit, fines bandes (10 pt) espacées de 14 pt, jours à gauche en `label`. Les nuits manquantes sont un fil pointillé très discret. Les week-ends ont un fond `bgSunken` léger. Lu d'un coup d'œil : décalages, trous, nuits pâles.

## 8. Ressenti

Cinq niveaux dessinés, **ni étoiles ni visages** : cinq lueurs de taille et d'intensité croissantes (un point terne pour « très difficile », une lueur pleine avec halo pour « reposante »). Libellés : Très difficile · Difficile · Moyenne · Plutôt bonne · Reposante.

## 9. Mouvement

Lent, respirant, jamais bondissant.

| Token | Durée | Usage |
|---|---|---|
| `quick` | 240 ms | retour de pression, sélection |
| `calm` | 600 ms | apparition d'élément, changement d'onglet |
| `slow` | 1 200 ms | entrée d'écran, dessin de la bande |
| `dusk` | 2 400 ms | changement d'ambiance |
| respiration | 4 s inspiration, 6 s expiration | mode nuit |

Courbe unique « souffle » : `cubic-bezier(0.33, 0, 0.2, 1)`. **Aucun ressort avec dépassement.** Les éléments apparaissent en fondu + 8 pt de translation verticale maximum.

**Réduire les animations** (réglage OS) : les déplacements sont supprimés, seuls les fondus restent (durée ≤ 240 ms). La respiration du mode nuit devient une variation d'opacité lente sans changement d'échelle.

## 10. Iconographie

Icônes dessinées pour Lueur (`src/ui/icons.tsx`, chemins SVG rendus en Skia) : grille 24, trait 1,5, extrémités rondes, pas de remplissage. Motifs dérivés du concept : l'accueil est un horizon avec un point, le calendrier des lignes tissées, les rapports des bandes empilées, les réglages un petit cadran. L'onglet actif reçoit un point de lumière sous l'icône, jamais de pastille pleine.

## 11. Logo

Une **ligne d'horizon** fine et un **point de lumière chaude** posé juste au-dessus, légèrement à droite du centre, dans son halo. C'est à la fois une veilleuse, une nuit qui s'achève et la bande de nuit réduite à son essentiel. Logotype « lueur » en Young Serif, bas de casse.

- Sources : `assets/brand/*.svg`. Rendus : icône iOS (clair / sombre / teinté, toutes tailles), icône adaptative Android (avant-plan, arrière-plan, monochrome), splash, favicon.
- Version animée (accueil) : l'horizon se trace de gauche à droite (1,2 s), puis la lumière s'allume (fondu du halo) et respire imperceptiblement (±6 % d'opacité, cycle 8 s).

## 12. Composants

- **Bouton principal** : pilule `light`, texte `lightOn` en `bodyStrong`, halo `glow` sous le bouton. Un seul par écran.
- **Bouton secondaire** : texte `text` sur `bgRaised`, filet `line`.
- **Bouton discret** : texte `lightText`, sans fond.
- **Surface** : `bgRaised`, rayon `lg`, filet `line`, **aucune ombre**.
- **Chip (tag)** : rayon `sm`, filet `line`. Sélectionné : fond `light` à 18 %, filet `light`, point lumineux à gauche.
- **Barre d'onglets** : fond `bg` + grain, filet supérieur `line`, icônes dessinées, libellés `label`.
- **Feuilles modales** : fond `bgRaised`, poignée 36 × 4 pt `line`, coins `lg`.

## 13. Ton rédactionnel

Calme, direct, adulte. On décrit, on ne juge pas.

| Oui | Non |
|---|---|
| « Nuit courte. Ça arrive. » | « Vous n'avez pas assez dormi ! » |
| « 4 nuits difficiles sur les 30 derniers jours. » | « Attention, votre sommeil se dégrade. » |
| « Les nuits marquées *bruit* : 48 min de sommeil en moins en moyenne (9 nuits). Un lien, pas forcément une cause. » | « Le bruit détruit votre sommeil. » |
| « Rien à consigner ce matin ? Ce n'est pas grave. » | « Ne cassez pas votre série ! » |

Règles : phrases courtes ; pas de point d'exclamation ; pas de superlatifs ; pas de « vous devez » ; écriture inclusive légère en français (« reposé·e ») seulement quand c'est inévitable, sinon tournures neutres ; jamais de chiffre présenté comme une note ; toujours dire « en moyenne », « environ », « sur X nuits » ; rappeler qu'une corrélation n'est pas une cause.

## 14. Accessibilité

- Contrastes AA vérifiés par test sur les deux ambiances.
- Chaque contrôle a `accessibilityLabel`, `accessibilityRole` et, pour les poignées de la bande, `accessibilityActions` incrémenter / décrémenter (pas de 5 min) avec valeur lue en heure.
- La bande de nuit a une description textuelle complète (« Au lit de 23 h 10 à 7 h 20, endormi vers 23 h 40, 2 éveils, 25 min »).
- VoiceOver / TalkBack : ordre de lecture vérifié, pas d'élément décoratif focalisable (grain, halos : `accessible={false}`).
