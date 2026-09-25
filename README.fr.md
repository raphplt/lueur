<p align="center">
  <img src="assets/brand/generated/feature-graphic.png" alt="Lueur — une ligne d'horizon et un point de lumière chaude" width="640" />
</p>

<p align="center"><strong>Un agenda du sommeil, simple et privé.</strong><br/>
iOS · Android · libre (MIT) · 100 % local · sans compte · rien à payer</p>

<p align="center"><a href="README.md">English version</a></p>

---

Lueur est née d'un vrai problème : des nuits cassées par le bruit (un moustique, l'entourage), par les pensées, par l'heure qu'on regarde défiler, et l'impossibilité de savoir **depuis combien de temps** et **à quelle fréquence** ça arrive.

Chaque matin, vous notez votre nuit en une quinzaine de secondes. Au fil des semaines, les nuits difficiles deviennent visibles : combien, quand, et ce qui les accompagne.

<p align="center">
  <img src="fastlane/metadata/android/fr-FR/images/phoneScreenshots/01.png" width="190" alt="Accueil : nuits difficiles sur 30 jours" />
  <img src="fastlane/metadata/android/fr-FR/images/phoneScreenshots/02.png" width="190" alt="Saisie du matin sur la bande de nuit" />
  <img src="fastlane/metadata/android/fr-FR/images/phoneScreenshots/03.png" width="190" alt="Tissage du mois, ambiance nuit" />
  <img src="fastlane/metadata/android/fr-FR/images/phoneScreenshots/05.png" width="190" alt="Je n'arrive pas à dormir : lueur qui respire" />
</p>

## Ce que fait Lueur

- **Saisie du matin en ~15 secondes**, préremplie avec vos horaires habituels ou ceux de la veille, directement sur la bande de nuit : coucher, endormissement, réveil, lever. Un toucher sur la bande ajoute un réveil. Cinq niveaux de ressenti dessinés, des repères (bruit, insecte, pensées, heure regardée, caféine…), une note facultative. Les nuits oubliées se rattrapent jusqu'à 14 jours.
- **La fréquence des nuits difficiles, sans chercher** : « 10 nuits difficiles sur les 30 derniers jours. Le mois précédent : 14. »
- **Le mois en tissage** : une bande de lumière par nuit sur un axe commun de 18 h à 14 h.
- **Tendances** : sommeil estimé, temps au lit, efficacité, endormissement, éveils, régularité. **Corrélations par repère** (seulement avec assez de nuits, formulées avec prudence). **Dérive des horaires**, **écart semaine / week-end**, **journal de l'environnement** avant/après.
- **Mode « je n'arrive pas à dormir »** : écran presque noir, **aucune heure**, une lueur qui respire, la règle des 20 minutes en suggestion discrète. Le réveil est noté pour le lendemain.
- **Rappels uniquement locaux**, sans relance.
- **Vos données** : sauvegarde JSON ([format documenté](docs/DATA_FORMAT.md)), CSV, **agenda PDF pour votre médecin**, suppression totale en un geste.

## Philosophie

- **Rien ne quitte le téléphone.** Pas de serveur, pas de compte, pas de statistiques, pas de publicité. Le build Android n'a même pas la permission `INTERNET`.
- **Pas d'anxiété en plus.** Pas de note sur 100, pas de série à ne pas casser, pas de badge. « Nuit courte. Ça arrive. »
- **Pas un dispositif médical.** Lueur s'inspire de l'agenda du sommeil utilisé en TCC-I, sans poser de diagnostic ni remplacer un·e professionnel·le.

## Construire l'app

```bash
npm ci
npm run check          # typecheck + lint + tests
npm run android        # build debug (SDK Android + JDK 21)
npm run ios            # simulateur iOS (macOS + Xcode)
bundle exec fastlane android build   # AAB signé
bundle exec fastlane ios build       # IPA signée (macOS)
```

Procédure complète de publication : [`docs/RELEASE.md`](docs/RELEASE.md). Architecture : [`docs/PLAN.md`](docs/PLAN.md). Design : [`docs/DESIGN.md`](docs/DESIGN.md).

## Licence

[MIT](LICENSE). Polices sous licence SIL Open Font License 1.1.
