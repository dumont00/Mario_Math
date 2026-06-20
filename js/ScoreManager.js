/* global CONFIG */

// Gestion centralisée du score, du combo et des cristaux récoltés.
// Formule de pointage : Specifications §9.2.

class ScoreManager {
    constructor() {
        this.reset();
    }

    reset() {
        this.score = 0;
        this.combo = 1.0;
        this.cristaux = 0;       // bonnes réponses (= cristaux de savoir)
        this.questionsTotales = 0;
        this.pieces = 0;
    }

    /**
     * Enregistre une bonne réponse et retourne le détail des points gagnés.
     * @param {number} pointsBase Points de base selon le palier.
     * @param {number} tempsRestant Secondes restantes au minuteur.
     * @param {number} tempsTotal Temps total alloué à la question.
     */
    bonneReponse(pointsBase, tempsRestant, tempsTotal) {
        const bonusVitesse = Math.round(pointsBase * (tempsRestant / tempsTotal));
        const sousTotal = pointsBase + bonusVitesse;
        const gain = Math.round(sousTotal * this.combo);

        this.score += gain;
        this.cristaux += 1;
        this.pieces += Math.max(1, Math.round(gain / 50));
        this.questionsTotales += 1;

        const comboAvant = this.combo;
        this.combo = Math.min(CONFIG.comboMax, +(this.combo + CONFIG.comboPas).toFixed(2));

        return {
            pointsBase,
            bonusVitesse,
            multiplicateur: comboAvant,
            gain
        };
    }

    /** Mauvaise réponse ou temps écoulé : pas de points, combo remis à 1. */
    mauvaiseReponse() {
        this.questionsTotales += 1;
        this.combo = 1.0;
        return { gain: 0 };
    }

    /** Format pour l'affichage HUD : « ×1,4 ». */
    formatCombo() {
        return '×' + this.combo.toFixed(1).replace('.', ',');
    }
}

window.ScoreManager = ScoreManager;
