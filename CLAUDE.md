# CLAUDE.md — Consignes de construction du jeu

> **Claude Code, lis ceci en premier.** Ce fichier est le brief de réalisation. Le document de référence complet est **`Specifications_Jeu_Math_4e_annee.md`** (mets-le dans le même dossier). La banque de questions est dans **`data/questions.json`**. Construis le jeu de façon **progressive**, dans l'ordre des phases ci-dessous. Quand un détail manque ici, suis le document de spécifications.

## 1. Objectif

Un jeu de plateforme 2D dans le navigateur (style Mario) pour aider un enfant de 10 ans (4ᵉ année du primaire, Québec) à consolider ses maths. Le héros court et saute ; pour avancer, il frappe des **blocs-questions** qui posent des problèmes **chronométrés**. Plus la réponse est juste **et rapide**, plus il gagne de points. Tout est en **français**, les graphismes sont **simples**, et l'apprentissage prime sur le spectacle.

## 2. Contraintes techniques (non négociables)

- **Phaser 3** via CDN : `https://cdn.jsdelivr.net/npm/phaser@3/dist/phaser.min.js`. (Canvas pur acceptable seulement si tu juges Phaser superflu.)
- 100 % côté client. **Aucun serveur, aucune base de données.**
- Sauvegarde via **`localStorage`** (progression, étoiles, pièces, statistiques par domaine).
- Charge la banque depuis **`data/questions.json`** (ne code pas les questions en dur, sauf le prototype de la phase 2).
- Responsive **ordinateur + tablette**. Sur tablette : boutons tactiles ◀ ▶ et **SAUT**.
- Interface, énoncés et messages **entièrement en français du Québec**.
- **Aucune librairie de stockage navigateur autre que `localStorage`.** Gère les cas où le JSON se charge via un petit serveur local (`python -m http.server`) si l'ouverture directe du fichier bloque le `fetch`.

## 3. Ton et pédagogie (important)

- Une mauvaise réponse n'est **jamais punie sévèrement** : on affiche la bonne réponse + l'**explication** (champ `explication`), avec un ton encourageant, puis on continue.
- Les erreurs de maths **ne font pas perdre de vie**. Les vies ne concernent que la plateforme (chutes), avec points de contrôle généreux.
- Reste léger, coloré, lisible. Pas d'effets distrayants pendant la lecture d'un énoncé.

## 4. Schéma d'une question (`data/questions.json`)

Le fichier est un **tableau d'objets**. Exemple :

```json
{
  "id": "geo_008",
  "domaine": "Géométrie",
  "sousDomaine": "Solides",
  "palier": 2,
  "type": "choix",
  "question": "Combien de faces a un cube ?",
  "visuel": null,
  "choix": ["4", "6", "8", "12"],
  "reponse": "6",
  "indice": "Un dé à jouer.",
  "explication": "Un cube a 6 faces.",
  "tempsSec": 15,
  "pointsBase": 150
}
```

- `domaine` ∈ { `Arithmétique`, `Géométrie`, `Mesure`, `Statistique`, `Probabilité` }.
- `palier` ∈ { 1 (★ facile), 2 (★★ moyen), 3 (★★★ difficile) }.
- `type` est toujours `"choix"` dans cette banque (réponse = un des `choix`). La comparaison se fait sur la **chaîne exacte** ; `reponse` correspond toujours à un élément de `choix`.
- `tempsSec` / `pointsBase` : valeurs par défaut selon le palier (20 s/100, 15 s/150, 12 s/200). Tu peux les surcharger par la config.
- `visuel` : `null`, ou un objet décrivant une illustration à dessiner (voir §5). **La bonne réponse est déjà calculée et cohérente avec les données du `visuel`** — ton rôle est seulement de **dessiner fidèlement** ce que décrit le `visuel`, pas de recalculer.

## 5. Types de `visuel` à dessiner (formes simples)

Dessine-les sobrement avec les primitives de Phaser (Graphics) ou un petit SVG. Toujours lisibles, sans surcharge.

| `type` | Champs | À dessiner |
|---|---|---|
| `horloge` | `heures`, `minutes` | Une horloge analogique : petite aiguille sur `heures`, grande sur `minutes`. |
| `grilleAire` | `largeur`, `hauteur` | Un rectangle quadrillé de `largeur` × `hauteur` carrés-unités. |
| `quadrillage` | `point` (ex. `{"A":[x,y]}`), `taille` | Un plan quadrillé `taille`×`taille` avec axes ; place le point étiqueté à (x, y). |
| `barres` | `titre`, `donnees` (`{étiquette: valeur}`) | Un diagramme à bandes avec axe gradué et étiquettes. |
| `pictogramme` | `titre`, `valeurParSymbole`, `donnees` (`{étiquette: nbSymboles}`) | Une rangée de symboles par catégorie ; afficher « chaque symbole = N ». |
| `ligne` | `titre`, `labels`, `valeurs` | Un diagramme à ligne brisée reliant les points (labels en X, valeurs en Y). |
| `sac` | `billes` (`{"Rouge":r,"Bleu":b}`) | Un sac contenant `r` billes rouges et `b` billes bleues. |
| `roue` | `secteurs` (`{couleur: part}`) | Une roue (camembert) divisée proportionnellement aux parts. |

## 6. Configuration centralisée (`config.js`)

Regroupe tous les réglages ici pour faciliter les ajustements par le parent :

```js
const CONFIG = {
  temps:       { facile: 20, moyen: 15, difficile: 12 }, // secondes par question
  pointsBase:  { facile: 100, moyen: 150, difficile: 200 },
  comboMax:    2.0,
  comboPas:    0.1,
  viesParNiveau: 3,
  cristauxRequisParNiveau: 6,   // bonnes réponses pour ouvrir le portail de fin
  bossCible:   8,               // bonnes réponses pour vaincre un boss
  bossTempsTotal: 90,           // secondes
  domainesActifs: ["Arithmétique","Géométrie","Mesure","Statistique","Probabilité"],
  adaptatif:   true
};
```

## 7. Sélection des questions (selon le niveau atteint)

5 mondes × 4 niveaux = 20 niveaux + 1 boss par monde. **Chaque niveau pige dans TOUS les domaines actifs** ; c'est le **mélange de paliers** qui monte avec la progression :

| Niveaux | Mélange de paliers |
|---|---|
| 1–4 (Monde 1) | 80 % ★ · 20 % ★★ |
| 5–8 (Monde 2) | 50 % ★ · 40 % ★★ · 10 % ★★★ |
| 9–12 (Monde 3) | 25 % ★ · 50 % ★★ · 25 % ★★★ |
| 13–16 (Monde 4) | 10 % ★ · 45 % ★★ · 45 % ★★★ |
| 17–20 (Monde 5) | 35 % ★★ · 65 % ★★★ |

Le `QuestionManager` doit : filtrer par `domainesActifs` → choisir le palier selon ce tableau → **alterner les domaines** dans un même niveau → éviter de reposer trop vite une question déjà vue. Si `adaptatif` est vrai : 3 bonnes réponses rapides d'affilée → monter d'un palier ; 2 erreurs rapprochées dans un domaine → redescendre d'un palier dans ce domaine.

## 8. Pointage (récompense de la rapidité)

```
points_base     = pointsBase du palier
bonus_vitesse   = arrondi( points_base × (temps_restant / temps_total) )
points_question = (points_base + bonus_vitesse) × multiplicateur_combo
```

- Bonne réponse → +points, le combo augmente de `comboPas` (plafond `comboMax`).
- Mauvaise réponse ou temps écoulé → 0 point, combo remis à 1,0, on affiche `explication`.
- **Étoiles de fin de niveau** : ★★★ ≥ 90 %, ★★ ≥ 70 %, ★ ≥ 50 % (niveau réussi). < 50 % → proposer une révision puis rejouer.
- **Boss** : barre d'énergie qui descend à chaque bonne réponse rapide ; atteindre `bossCible` bonnes réponses avant `bossTempsTotal`.

## 9. Plan de développement (construis dans CET ordre)

1. **Phase 1 — Moteur** : projet Phaser, une scène de plateforme, héros qui court/saute, collisions, caméra qui suit.
2. **Phase 2 — Questions jouables** : blocs « ? », pause + modale de question (choix multiple), barre de temps, pointage (§8) et combo. Utilise ~10 questions codées en dur d'abord.
3. **Phase 3 — Banque + paliers** : charge `data/questions.json`, `QuestionManager` (§7), variété des domaines, écran de résultats avec étoiles et récap par domaine.
4. **Phase 4 — Progression + sauvegarde** : carte des mondes, déblocage des niveaux, `SaveManager` (localStorage), pièces et cristaux.
5. **Phase 5 — Boss + boutique** : scène de boss (§8), boutique de cosmétiques achetés avec les pièces.
6. **Phase 6 — Adaptatif + tableau de bord parental** : ajustement fin de la difficulté, statistiques de réussite **par domaine** et temps moyen.
7. **Phase 7 — Finition** : sons courts (désactivables), animations discrètes, contrôles tactiles, mode plateforme facile, écran d'options (dont activer/désactiver des domaines et réinitialiser).

À la fin de chaque phase, livre quelque chose de **jouable** avant de passer à la suivante.

## 10. Structure de fichiers attendue

```
jeu-math/
├── index.html
├── style.css
├── config.js
├── data/questions.json
├── js/
│   ├── main.js
│   ├── scenes/{Boot,Menu,Map,Level,Boss,Result}Scene.js
│   ├── QuestionManager.js
│   ├── ScoreManager.js
│   ├── SaveManager.js
│   └── ParentDashboard.js
└── assets/{sprites,sounds}/
```

## 11. Le travail est « terminé » quand…

- [ ] Le jeu se lance dans le navigateur ; le héros bouge et saute au clavier **et** au tactile.
- [ ] Les blocs-questions ouvrent la modale avec **minuteur** fonctionnel ; les points récompensent la **rapidité** ; le **combo** marche.
- [ ] Chaque niveau pige dans **tous les domaines actifs** avec le **bon mélange de paliers** (§7).
- [ ] Tous les `visuel` (§5) s'affichent correctement et **collent à la réponse** de la question.
- [ ] Une erreur affiche l'**explication**, sans punir durement.
- [ ] Portail de fin de niveau, étoiles, pièces et progression **sauvegardés** entre deux sessions.
- [ ] Boss fonctionnel à la fin de chaque monde.
- [ ] **Tableau de bord parental** : réussite et temps moyen **par domaine**.
- [ ] Réglages de `CONFIG` réellement pris en compte.
- [ ] Tout est en français, lisible, graphismes simples.

---

### Première consigne suggérée à donner à Claude Code

> « Lis `CLAUDE.md` et `Specifications_Jeu_Math_4e_annee.md`. Mets en place le projet (structure du §10, Phaser via CDN) puis réalise la **Phase 1** : une scène de plateforme jouable avec un héros qui court, saute et entre en collision avec des plateformes, et une caméra qui le suit. Montre-moi le résultat avant de passer à la Phase 2. »
