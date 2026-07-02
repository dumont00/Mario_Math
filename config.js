// Configuration centralisée du jeu — voir Specifications §20 et CLAUDE.md §6.
// Tous les réglages sont regroupés ici pour faciliter les ajustements.

window.CONFIG = {
    // Secondes par question, selon le palier de difficulté.
    temps: { facile: 20, moyen: 15, difficile: 12 },

    // Points de base accordés selon le palier.
    pointsBase: { facile: 100, moyen: 150, difficile: 200 },

    // Multiplicateur de combo (séries de bonnes réponses).
    comboMax: 2.0,
    comboPas: 0.1,

    // Plateforme : vies et points de contrôle.
    viesParNiveau: 3,

    // Durée totale d'un tableau (en secondes).
    tempsNiveau: 180,

    // Délai (s) avant qu'un bloc raté ne se réactive avec une nouvelle question.
    delaiReactivationBloc: 20,

    // Objectifs de fin de niveau / boss.
    cristauxRequisParNiveau: 20,
    bossCible: 8,
    bossTempsTotal: 90,

    // Domaines actifs (peuvent être désactivés depuis les Options).
    // L'ordre n'importe pas : c'est la liste complète des domaines connus.
    domainesActifs: [
        'Arithmétique',
        'Géométrie',
        'Mesure',
        'Statistique',
        'Probabilité',
        'Orthographe',
        'Géographie',
        'Histoire',
        'Grammaire',
        'Vocabulaire',
        'Logique'
    ],

    // Ajustement adaptatif de la difficulté (phase avancée).
    adaptatif: true,

    // Comment le palier de chaque question est choisi :
    //   'niveau'    : selon le mélange défini par le niveau (voir CLAUDE.md §7)
    //   'aleatoire' : tirage uniforme entre ★, ★★, ★★★ — plus de variété
    //                 quand on pratique une ou deux catégories à la fois
    paliersMode: 'aleatoire',

    // Réglages moteur / plateforme (Phase 1).
    moteur: {
        largeurMonde: 3200,
        hauteurMonde: 540,
        vitesseHero: 220,
        impulsionSaut: 560,
        gravite: 1200
    }
};
