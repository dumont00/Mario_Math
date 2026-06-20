# Spécifications — « Les Aventures du Calcul » 
### Jeu de plateforme éducatif en mathématiques (4ᵉ année du primaire, Québec)

> **À l'intention de Claude Code.** Ce document décrit en détail un jeu de plateforme 2D jouable dans un navigateur. L'objectif est de consolider, de façon ludique, les apprentissages en mathématiques d'un enfant de 10 ans (2ᵉ cycle du primaire, programme québécois). Construis le jeu de façon **progressive** (voir la section *Plan de développement par étapes*) : un prototype jouable d'abord, puis l'enrichissement.

---

## 1. Vision en une phrase

Un héros traverse des mondes en courant et en sautant ; pour progresser, il frappe des **blocs-questions** qui posent des problèmes de maths **chronométrés**. Plus la réponse est juste **et rapide**, plus l'enfant marque de points. La difficulté monte graduellement, et **chaque monde touche à tous les domaines mathématiques**.

---

## 2. Public cible et intentions pédagogiques

- **Joueur** : un enfant de 10 ans, 4ᵉ année du primaire (Québec), francophone.
- **Langue** : entièrement en **français (Québec)**.
- **Priorité** : l'apprentissage avant le spectacle. Graphismes **simples et épurés** pour ne pas distraire du contenu mathématique.
- **Ton** : encourageant, jamais punitif. Une mauvaise réponse mène à une **explication claire**, pas à une sanction sévère. On veut entretenir la motivation, pas le découragement.
- **Boucle pédagogique** : pratiquer → recevoir une rétroaction immédiate → réessayer → automatiser les faits numériques tout en s'amusant.

---

## 3. Choix techniques

- **Type** : application 100 % côté client (aucun serveur, aucune base de données).
- **Technologie recommandée** : **Phaser 3** (moteur de jeu 2D JavaScript) chargé par CDN. Il gère nativement la gravité, les sauts, les collisions et les sprites, ce qui simplifie beaucoup la partie plateforme.
  - CDN : `https://cdn.jsdelivr.net/npm/phaser@3/dist/phaser.min.js`
  - Si tu juges Phaser surdimensionné, une solution **HTML/CSS/JavaScript + Canvas pur** est acceptable, mais Phaser reste préférable pour la fluidité du saut et des collisions.
- **Sauvegarde de la progression** : `localStorage` (progression, étoiles, pièces, statistiques par domaine). Aucune connexion requise.
- **Compatibilité** : navigateurs récents (Chrome, Edge, Firefox, Safari), **ordinateur et tablette**. Mise en page responsive ; sur tablette, prévoir des boutons tactiles (◀ ▶ et SAUT).
- **Banque de questions externalisée** : un fichier `data/questions.json` séparé du code, pour qu'on puisse ajouter ou modifier des questions sans toucher à la logique du jeu.

### Structure de fichiers suggérée

```
jeu-math/
├── index.html
├── style.css
├── data/
│   └── questions.json          ← banque de questions (modifiable)
├── js/
│   ├── main.js                 ← configuration Phaser, lancement
│   ├── scenes/
│   │   ├── BootScene.js        ← chargement des ressources
│   │   ├── MenuScene.js        ← écran d'accueil
│   │   ├── MapScene.js         ← carte des mondes
│   │   ├── LevelScene.js       ← le niveau jouable (plateforme)
│   │   ├── BossScene.js        ← combat de boss (rafale de questions)
│   │   └── ResultScene.js      ← écran de résultats de fin de niveau
│   ├── QuestionManager.js      ← sélection des questions selon le palier
│   ├── ScoreManager.js         ← calcul des points, combos, étoiles
│   ├── SaveManager.js          ← lecture/écriture localStorage
│   └── ParentDashboard.js      ← tableau de bord parental
└── assets/
    ├── sprites/                ← personnage, blocs, décor (formes simples)
    └── sounds/                 ← effets sonores courts (optionnels)
```

---

## 4. Domaines mathématiques couverts

Les questions couvrent les **cinq domaines** du programme de mathématiques de 4ᵉ année (Québec). **Chaque monde et chaque niveau pige dans tous ces domaines** ; c'est le *palier de difficulté* qui change selon la progression, pas le domaine.

| Domaine | Sous-domaines visés (4ᵉ année) |
|---|---|
| **Arithmétique** | Nombres naturels jusqu'à 100 000 (lire, comparer, ordonner, décomposer) ; addition et soustraction ; multiplication et division (faits numériques / tables) ; fractions (lecture, représentation, fractions équivalentes simples) ; nombres décimaux jusqu'aux centièmes |
| **Géométrie** | Figures planes (polygones, quadrilatères, triangles) ; solides (prismes, pyramides — faces, arêtes, sommets) ; angles (droit, aigu, obtus) ; symétrie / réflexion ; repérage sur un quadrillage |
| **Mesure** | Longueurs et conversions simples (m, dm, cm, mm) ; périmètre ; aire (en unités) ; temps et durées ; capacité ; masse ; température |
| **Statistique** | Lecture et interprétation de diagrammes à bandes, à pictogrammes, à ligne brisée |
| **Probabilité** | Événements certain / possible / impossible ; plus ou moins probable ; dénombrement simple d'issues |

> **Note pour le parent** : ces domaines correspondent au cadre habituel du programme québécois, mais valide-les avec le matériel scolaire de ton garçon (cahier, *Progression des apprentissages*). Le fichier `questions.json` permet d'ajouter, retirer ou réécrire des questions facilement, et la section 16 explique comment activer/désactiver un domaine.

---

## 5. Système de difficulté (le cœur du jeu)

### 5.1 Trois paliers

| Palier | Nom | Temps par question | Points de base |
|---|---|---|---|
| ★ | Facile | 20 s | 100 |
| ★★ | Moyen | 15 s | 150 |
| ★★★ | Difficile | 12 s | 200 |

*(Les durées sont des paramètres ajustables dans la configuration — voir section 16.)*

### 5.2 Progression croissante « selon le niveau atteint »

Le jeu compte **5 mondes × 4 niveaux = 20 niveaux**, plus **un boss par monde**. Un compteur global de niveau (1 à 20) détermine le **mélange de paliers** des questions. Chaque niveau pige dans **tous les domaines**, mais la proportion de questions difficiles augmente à mesure qu'on avance.

| Niveaux | Mélange de paliers (proportion approximative) |
|---|---|
| 1 à 4 (Monde 1) | 80 % ★ · 20 % ★★ |
| 5 à 8 (Monde 2) | 50 % ★ · 40 % ★★ · 10 % ★★★ |
| 9 à 12 (Monde 3) | 25 % ★ · 50 % ★★ · 25 % ★★★ |
| 13 à 16 (Monde 4) | 10 % ★ · 45 % ★★ · 45 % ★★★ |
| 17 à 20 (Monde 5) | 35 % ★★ · 65 % ★★★ |

Ainsi, dès le premier monde l'enfant voit de l'arithmétique, de la géométrie, de la mesure, de la statistique et de la probabilité — mais en version simple. Au dernier monde, les mêmes domaines reviennent, en version exigeante. C'est exactement la **progression croissante sur tous les domaines** demandée.

### 5.3 Difficulté adaptative (recommandée, à ajouter en phase avancée)

En plus du mélange ci-dessus, le `QuestionManager` peut ajuster finement :
- **3 bonnes réponses rapides d'affilée** → la prochaine question monte d'un palier (si disponible).
- **2 erreurs rapprochées dans un domaine** → le jeu redescend d'un palier et propose une question plus simple du même domaine.

Cela garde l'enfant dans la « zone juste assez difficile » : ni ennui, ni découragement.

---

## 6. Structure du jeu

- **5 mondes**, purement thématiques pour le décor (les maths sont identiques d'un thème à l'autre, seul le palier change) :
  1. **La Forêt des Nombres** (vert)
  2. **Les Grottes de Glace** (bleu)
  3. **Le Désert des Énigmes** (sable)
  4. **Les Profondeurs de l'Océan** (turquoise)
  5. **La Station Spatiale** (violet/étoilé)
- **4 niveaux par monde**, de difficulté croissante.
- **1 boss à la fin de chaque monde** : une « rafale » de questions (voir section 9.4).
- **Carte des mondes** : écran montrant les mondes et niveaux. Les niveaux se débloquent au fur et à mesure (il faut au moins **1 étoile** pour ouvrir le suivant). Les niveaux déjà réussis restent rejouables pour viser plus d'étoiles.

---

## 7. Boucle de jeu d'un niveau

1. L'enfant choisit un niveau sur la carte.
2. La scène de niveau se charge : un parcours **horizontal** avec plateformes, quelques trous et quelques obstacles **doux**.
3. Le héros se déplace (gauche/droite) et **saute** pour frapper les **blocs-questions** (blocs « ? » jaunes).
4. Frapper un bloc **met le jeu en pause** et ouvre la **modale de question** (voir section 8). Le minuteur démarre.
5. **Bonne réponse** → le bloc libère une récompense (cristal de savoir + pièces), feedback positif, le jeu reprend.
6. **Mauvaise réponse ou temps écoulé** → courte **explication** affichée, aucune pièce, le combo retombe à zéro, le jeu reprend. Pas de « game over » causé par les maths.
7. Un **portail de fin de niveau** s'ouvre une fois que l'enfant a récolté assez de **cristaux de savoir** (ex. : il faut répondre correctement à au moins *N* questions sur les *M* du niveau). C'est donc **la réussite des maths qui fait avancer**, pas seulement les réflexes.
8. À la fin : **écran de résultats** (points, temps total, étoiles, domaines réussis/ratés).

> **Décision de conception importante** : les obstacles de plateforme (trous, ennemis qui se déplacent) restent **légers et indulgents**, avec des points de contrôle fréquents et des vies généreuses. Le défi principal vient des questions, pas de la dextérité. Cela garde le focus sur l'apprentissage tout en conservant le plaisir du jeu de plateforme.

---

## 8. Mécanique des questions et modale

Quand l'enfant frappe un bloc-question, afficher une **modale** par-dessus le jeu mis en pause :

- **En-tête** : domaine (ex. « Mesure ») + nombre d'étoiles du palier (★ / ★★ / ★★★).
- **Barre de temps animée** qui se vide visuellement (verte → jaune → rouge).
- **Énoncé** de la question, gros et lisible.
- Un **visuel** facultatif si la question l'exige (ex. : un diagramme à bandes, une figure géométrique, une horloge) — voir le champ `visuel` du modèle de données.
- **Format de réponse** :
  - *Choix multiple* (4 boutons) — recommandé par défaut, idéal au tactile.
  - *Saisie au clavier* (champ numérique) pour certaines questions de calcul.
- **Rétroaction** :
  - Bonne réponse → animation positive (étincelles, son court), +points affichés.
  - Mauvaise réponse / temps écoulé → on **surligne la bonne réponse** et on affiche une **explication d'une phrase** (champ `explication`). Ton bienveillant : « Presque ! Voici comment faire… ».
- Bouton **Continuer** pour reprendre le jeu.

---

## 9. Minuteur et pointage

### 9.1 Minuteur

Chaque question a un temps limite déterminé par son palier (★ 20 s, ★★ 15 s, ★★★ 12 s). La barre de temps est toujours visible. À 0, la question est comptée comme manquée.

### 9.2 Calcul des points (récompense de la rapidité)

```
points_base        = selon le palier (100 / 150 / 200)
bonus_vitesse      = arrondi( points_base × (temps_restant / temps_total) )
points_question    = (points_base + bonus_vitesse) × multiplicateur_combo
```

- Répondre **instantanément** ≈ double les points. Répondre **juste avant la fin** ≈ points de base seulement.
- **Mauvaise réponse / temps écoulé** = 0 point.

### 9.3 Combo (série de bonnes réponses)

- Chaque bonne réponse consécutive augmente le **multiplicateur de combo** de +0,1 (1,0 → 1,1 → 1,2 …), **plafonné à ×2,0**.
- Une mauvaise réponse ou un temps écoulé **réinitialise** le combo à ×1,0.
- Afficher le combo à l'écran (« Série : ×1,4 ! ») pour encourager la concentration.

### 9.4 Boss de fin de monde

Le boss est une **rafale chronométrée** : le boss a une « barre d'énergie » ; chaque bonne réponse rapide lui retire de l'énergie. L'enfant doit répondre correctement à un nombre cible de questions (ex. 8) **avant la fin d'un compte à rebours global** (ex. 90 s). Les questions du boss sont au palier dominant du monde. Réussir le boss débloque le monde suivant et accorde un **gros bonus de pièces**.

### 9.5 Étoiles de fin de niveau

| Étoiles | Critère (pourcentage de bonnes réponses du niveau) |
|---|---|
| ★★★ | ≥ 90 % |
| ★★ | ≥ 70 % |
| ★ | ≥ 50 % (niveau réussi, niveau suivant débloqué) |
| — | < 50 % → on propose une **révision** des notions ratées, puis on peut rejouer |

Le niveau reste **rejouable** à volonté pour améliorer son score d'étoiles.

---

## 10. Vies et gestion bienveillante des erreurs

- Les **erreurs de maths ne font jamais perdre de vie** ; elles donnent seulement 0 point et une explication.
- Les **vies** ne concernent que la plateforme (tomber dans un trou, toucher un obstacle). Prévoir **3 vies** par niveau et des **points de contrôle** réguliers ; perdre toutes ses vies relance au dernier point de contrôle, pas au tout début.
- Après deux échecs de plateforme, proposer un **mode plus facile** (sauts assistés, moins d'obstacles) pour ne pas frustrer.

---

## 11. Récompenses et progression

- **Pièces** : gagnées par les bonnes réponses et le boss. Servent à acheter des **apparences du héros** dans une petite **boutique** (chapeaux, couleurs, costumes) — gros moteur de motivation, purement cosmétique.
- **Cristaux de savoir** : monnaie interne au niveau ; servent à ouvrir le portail de fin de niveau.
- **Étoiles** : reflètent la maîtrise ; affichées sur la carte des mondes.
- **Badges** (facultatif) : « Maître des fractions », « Champion de la géométrie », décernés quand l'enfant réussit beaucoup de questions d'un domaine. Bon renfort positif et bon repère pour le parent.

---

## 12. Écrans et interface

1. **Écran d'accueil** : titre, bouton **Jouer**, bouton **Boutique**, bouton **Tableau de bord (parent)**, bouton **Options**.
2. **Carte des mondes** : 5 mondes, niveaux débloqués/verrouillés, étoiles obtenues, total de pièces.
3. **Niveau (jeu de plateforme)** : barre d'infos en haut (pièces, vies, cristaux récoltés / requis, combo). Boutons tactiles sur tablette.
4. **Modale de question** : décrite à la section 8.
5. **Scène de boss** : barre d'énergie du boss + compte à rebours global + questions.
6. **Écran de résultats** : étoiles, points totaux, temps moyen par question, **récapitulatif par domaine** (ex. « Fractions : 3/4 ✓ »), boutons *Rejouer* / *Carte* / *Niveau suivant*.
7. **Boutique** : articles cosmétiques achetables avec des pièces.
8. **Tableau de bord parental** : voir section 14.
9. **Options** : son on/off, durée des minuteurs, mode plateforme facile, **activer/désactiver des domaines**, **réinitialiser la progression**.

---

## 13. Direction visuelle et sonore

- **Graphismes simples** : formes géométriques nettes, aplats de couleurs vives, contrastes élevés. Un héros minimaliste (ex. une petite mascotte ronde ou carrée) suffit. Pas besoin de sprites complexes ; des rectangles/cercles stylisés font très bien l'affaire et gardent l'attention sur les maths.
- **Lisibilité avant tout** : grande police sans empattement, énoncés courts, beaucoup d'espace blanc dans la modale.
- **Sons** (facultatifs, courts) : saut, bonne réponse (« ding » joyeux), mauvaise réponse (note douce, non agressive), ramassage de pièce, victoire de niveau. Toujours désactivables.
- **Animations** discrètes : le bloc « ? » rebondit quand on le frappe, étincelles à la bonne réponse, le portail s'ouvre quand les cristaux sont réunis.
- Éviter toute surcharge visuelle ou tout effet distrayant pendant la lecture d'un énoncé.

---

## 14. Tableau de bord parental

Un écran qui lit les statistiques stockées dans `localStorage` et présente, **de façon simple** :

- Nombre de niveaux complétés, étoiles totales, temps de jeu.
- **Taux de réussite par domaine** (Arithmétique, Géométrie, Mesure, Statistique, Probabilité) sous forme de barres — pour repérer d'un coup d'œil les forces et les points à travailler.
- **Temps de réponse moyen par domaine** (indicateur d'automatisation des faits).
- Liste des **questions le plus souvent ratées** (pour réviser ensemble).
- Bouton pour **réinitialiser** les statistiques.

Le `SaveManager` doit donc enregistrer, pour chaque question répondue : domaine, sous-domaine, palier, juste/faux, temps de réponse.

---

## 15. Contrôles

- **Clavier** : ◀ / ▶ (ou A / D) pour se déplacer, **Espace** ou **↑** pour sauter, **chiffres / souris** pour répondre dans la modale.
- **Tactile (tablette)** : boutons ◀ ▶ à gauche, bouton **SAUT** à droite, réponses par tape sur les boutons de la modale.

---

## 16. Modèle de données des questions

`questions.json` est un tableau d'objets. Schéma d'une question :

```json
{
  "id": "geo_solide_012",
  "domaine": "Géométrie",
  "sousDomaine": "Solides",
  "palier": 2,
  "type": "choix",
  "question": "Combien de faces possède un cube ?",
  "visuel": "cube",
  "choix": ["4", "6", "8", "12"],
  "reponse": "6",
  "indice": "Pense à un dé à jouer.",
  "explication": "Un cube a 6 faces carrées identiques.",
  "tempsSec": 15,
  "pointsBase": 150
}
```

Champs :

| Champ | Description |
|---|---|
| `id` | identifiant unique |
| `domaine` | un des cinq domaines |
| `sousDomaine` | précision (ex. « Fractions », « Périmètre ») |
| `palier` | 1, 2 ou 3 |
| `type` | `"choix"` (4 boutons) ou `"saisie"` (champ numérique) |
| `question` | énoncé affiché |
| `visuel` | (optionnel) identifiant d'une illustration à dessiner (figure, diagramme, horloge…) ; `null` si aucun |
| `choix` | tableau de réponses (si `type = "choix"`) |
| `reponse` | bonne réponse |
| `indice` | (optionnel) petit coup de pouce facultatif |
| `explication` | phrase affichée après une erreur |
| `tempsSec` | temps limite (sinon, dérivé du palier) |
| `pointsBase` | points de base (sinon, dérivé du palier) |

> **Activer/désactiver un domaine** : dans les Options, une simple liste de cases à cocher filtre les domaines pris en compte par le `QuestionManager`. Pratique si une notion n'a pas encore été vue en classe.

Le `QuestionManager` doit :
1. Filtrer les questions par domaines actifs.
2. Choisir le palier selon le niveau atteint (section 5.2) et, si activé, l'ajustement adaptatif (5.3).
3. Mélanger les domaines pour qu'un même niveau enchaîne des domaines variés.
4. Éviter de reposer trop vite une question déjà vue.

---

## 17. Banque de questions — exemples par domaine et par palier

Voici un **noyau d'exemples** pour amorcer `questions.json`. Génère-en **au moins 25 à 30 par domaine et par palier** (soit ~400 à 450 questions au total) en variant les nombres. Pour les questions à `visuel` (diagrammes, figures, horloges), dessine l'illustration simplement avec les formes de Phaser ou un petit SVG.

### Arithmétique

**Palier ★**
- Quel nombre vient juste après 4 999 ? → **5 000**
- 245 + 132 = ? → **377**
- 580 − 240 = ? → **340**
- 6 × 7 = ? → **42**
- Quelle fraction représente la moitié d'un objet ? → **1/2**

**Palier ★★**
- Quelle est la valeur du chiffre 7 dans 47 250 ? → **7 000**
- 3 456 + 2 789 = ? → **6 245**
- 23 × 4 = ? → **92**
- 48 ÷ 6 = ? → **8**
- 1/2 = combien de quarts ? → **2/4**
- 0,5 + 0,3 = ? → **0,8**

**Palier ★★★**
- Place en ordre croissant : 34 050 ; 34 500 ; 34 005. → **34 005 ; 34 050 ; 34 500**
- 34 × 12 = ? → **408**
- 53 ÷ 6 = ? (quotient et reste) → **8 reste 5**
- Quelle fraction est la plus grande : 2/3 ou 3/4 ? → **3/4**
- 2,45 + 1,8 = ? → **4,25**
- Léa a 3 boîtes de 24 crayons et en donne 15. Combien lui en reste-t-il ? → **57**

### Géométrie

**Palier ★**
- Combien de côtés a un triangle ? → **3**
- Comment appelle-t-on un polygone à 4 côtés ? → **un quadrilatère**
- *(visuel)* Cette figure est-elle un carré ou un rectangle ? → selon l'image

**Palier ★★**
- Combien de faces a un cube ? → **6**
- *(visuel)* Cet angle est-il droit, aigu ou obtus ? → selon l'image
- Un prisme à base carrée a combien de sommets ? → **8**
- *(visuel)* Quelle moitié complète la figure par réflexion ? → selon l'image

**Palier ★★★**
- Combien d'arêtes a une pyramide à base carrée ? → **8**
- *(visuel, quadrillage)* Quelles sont les coordonnées du point A ? → selon l'image (ex. (3, 2))
- Un quadrilatère qui a 4 côtés égaux et 4 angles droits est… → **un carré**
- *(visuel)* Classe ces trois angles du plus petit au plus grand. → selon l'image

### Mesure

**Palier ★**
- Combien de centimètres dans 1 mètre ? → **100**
- *(visuel, horloge)* Quelle heure est-il ? → selon l'image
- Quel objet est le plus long : un crayon ou une règle de 30 cm ? → **la règle**

**Palier ★★**
- Quel est le périmètre d'un carré de 5 cm de côté ? → **20 cm**
- 2 m = combien de cm ? → **200 cm**
- De 14 h à 16 h 30, combien de temps s'écoule-t-il ? → **2 h 30**
- 1 L = combien de ml ? → **1 000 ml**

**Palier ★★★**
- Quel est le périmètre d'un rectangle de 8 cm sur 3 cm ? → **22 cm**
- *(visuel, grille)* Quelle est l'aire de cette figure (en carrés-unités) ? → selon l'image
- Un film commence à 13 h 45 et dure 1 h 50. À quelle heure finit-il ? → **15 h 35**
- 3 250 g, est-ce plus ou moins que 3 kg ? → **plus**

### Statistique

**Palier ★**
- *(visuel, diagramme à bandes)* Quelle est la valeur la plus élevée ? → selon l'image
- *(visuel)* Combien d'élèves préfèrent le bleu ? → selon l'image

**Palier ★★**
- *(visuel, diagramme à bandes)* Combien d'élèves de plus aiment le soccer que le tennis ? → selon l'image
- *(visuel, pictogramme : chaque ⚽ = 2)* Combien de buts au total ? → selon l'image

**Palier ★★★**
- *(visuel, diagramme à bandes)* Quel est le total des quatre catégories ? → selon l'image
- *(visuel, ligne brisée)* Entre quels mois la température a-t-elle le plus augmenté ? → selon l'image

### Probabilité

**Palier ★**
- Dans un sac qui ne contient que des billes rouges, tirer une bille rouge est… → **certain**
- Tirer une bille bleue dans ce même sac est… → **impossible**

**Palier ★★**
- En lançant un dé ordinaire, est-il plus probable d'obtenir un nombre pair ou le chiffre 6 ? → **un nombre pair**
- *(visuel, roue)* Sur cette roue, quelle couleur a le plus de chances de sortir ? → selon l'image

**Palier ★★★**
- Un dé à 6 faces : combien de résultats donnent un nombre supérieur à 4 ? → **2 (le 5 et le 6)**
- Dans un sac de 3 billes rouges et 1 bleue, quelle couleur est plus probable et combien de fois plus ? → **rouge, 3 fois plus probable**

---

## 18. Plan de développement par étapes (pour Claude Code)

Construire dans cet ordre, en livrant quelque chose de jouable le plus tôt possible :

1. **Phase 1 — Moteur de base** : projet Phaser, une scène de plateforme, un héros qui court et saute, collisions avec le sol et les plateformes, une caméra qui suit.
2. **Phase 2 — Blocs-questions + modale** : blocs « ? », mise en pause, modale de question (choix multiple), minuteur visuel, calcul des points (section 9.2) et du combo.
3. **Phase 3 — Banque de questions + paliers** : chargement de `questions.json`, `QuestionManager` qui pige selon le palier (section 5.2), variété des domaines, écran de résultats avec étoiles.
4. **Phase 4 — Progression + sauvegarde** : carte des mondes, déblocage des niveaux, `SaveManager` (localStorage), pièces et cristaux.
5. **Phase 5 — Boss + boutique** : scène de boss (rafale chronométrée), boutique de cosmétiques.
6. **Phase 6 — Adaptatif + tableau de bord parental** : ajustement fin de la difficulté (5.3), statistiques par domaine, écran parental.
7. **Phase 7 — Finition** : sons, animations, contrôles tactiles, mode plateforme facile, options.

Commence par fournir un **prototype de la Phase 2** réellement jouable avec une dizaine de questions codées en dur, puis branche `questions.json` à la Phase 3.

---

## 19. Liste de vérification de livraison

- [ ] Le jeu se lance dans le navigateur en ouvrant `index.html` (ou via un petit serveur local si nécessaire pour charger le JSON).
- [ ] Le héros se déplace et saute de façon fluide, au clavier **et** au tactile.
- [ ] Les blocs-questions déclenchent la modale avec minuteur fonctionnel.
- [ ] Les points récompensent la **rapidité** (formule de la section 9.2) ; le combo fonctionne.
- [ ] Chaque niveau pige dans **tous les domaines**, avec le **bon mélange de paliers** selon le niveau atteint (section 5.2).
- [ ] Une mauvaise réponse affiche une **explication**, sans punition sévère.
- [ ] Le portail de fin de niveau s'ouvre une fois assez de cristaux récoltés.
- [ ] Étoiles, pièces et progression **sauvegardées** entre deux sessions.
- [ ] Boss fonctionnel à la fin de chaque monde.
- [ ] Tableau de bord parental affiche la réussite **par domaine**.
- [ ] Tout est en **français**, lisible, avec des graphismes simples.
- [ ] Les durées des minuteurs et la liste des domaines sont **paramétrables** dans les Options.

---

## 20. Paramètres ajustables (regroupés pour faciliter le réglage)

À placer dans un objet de configuration unique (`config.js` ou en tête de `main.js`) :

```js
const CONFIG = {
  temps:       { facile: 20, moyen: 15, difficile: 12 },   // secondes
  pointsBase:  { facile: 100, moyen: 150, difficile: 200 },
  comboMax:    2.0,
  comboPas:    0.1,
  viesParNiveau: 3,
  cristauxRequisParNiveau: 6,   // bonnes réponses nécessaires pour le portail
  bossCible:   8,               // bonnes réponses pour vaincre un boss
  bossTempsTotal: 90,           // secondes
  domainesActifs: ["Arithmétique","Géométrie","Mesure","Statistique","Probabilité"],
  adaptatif:   true
};
```

---

*Fin des spécifications. Tout est conçu pour être implémenté progressivement et ajusté facilement selon le rythme de l'enfant.*
