/* global CONFIG */

// Score, combo, cristaux et statistiques par domaine.
// Formule de pointage : Specifications §9.2.
// Étoiles de fin de niveau : Specifications §9.5.

class ScoreManager {
    constructor() {
        this.reset();
    }

    reset() {
        this.score = 0;
        this.combo = 1.0;
        this.cristaux = 0;        // bonnes réponses
        this.questionsTotales = 0;
        this.pieces = 0;
        this.statsParDomaine = {};
    }

    _statsDomaine(domaine) {
        if (!this.statsParDomaine[domaine]) {
            this.statsParDomaine[domaine] = {
                bonnes: 0, total: 0, tempsTotal: 0
            };
        }
        return this.statsParDomaine[domaine];
    }

    /**
     * Bonne réponse : applique la formule §9.2, met à jour le combo.
     * @returns {{ pointsBase, bonusVitesse, multiplicateur, gain }}
     */
    bonneReponse(question, tempsRestant) {
        const tempsTotal = question.tempsSec;
        const pointsBase = question.pointsBase;
        const bonusVitesse = Math.round(pointsBase * (tempsRestant / tempsTotal));
        const sousTotal = pointsBase + bonusVitesse;
        const gain = Math.round(sousTotal * this.combo);

        this.score += gain;
        this.cristaux += 1;
        this.pieces += Math.max(1, Math.round(gain / 50));
        this.questionsTotales += 1;

        const s = this._statsDomaine(question.domaine);
        s.bonnes += 1;
        s.total += 1;
        s.tempsTotal += (tempsTotal - tempsRestant);

        const comboAvant = this.combo;
        this.combo = Math.min(CONFIG.comboMax, +(this.combo + CONFIG.comboPas).toFixed(2));

        return { pointsBase, bonusVitesse, multiplicateur: comboAvant, gain };
    }

    /** Mauvaise réponse ou temps écoulé : pas de points, combo remis à 1. */
    mauvaiseReponse(question) {
        this.questionsTotales += 1;
        this.combo = 1.0;

        const s = this._statsDomaine(question.domaine);
        s.total += 1;
        s.tempsTotal += question.tempsSec;

        return { gain: 0 };
    }

    pourcentageReussite() {
        if (this.questionsTotales === 0) return 0;
        return Math.round(100 * this.cristaux / this.questionsTotales);
    }

    /** Étoiles selon §9.5 : 0 = niveau échoué. */
    etoiles() {
        const p = this.pourcentageReussite();
        if (p >= 90) return 3;
        if (p >= 70) return 2;
        if (p >= 50) return 1;
        return 0;
    }

    /** Récap formaté par domaine pour l'écran de résultats. */
    recapDomaines() {
        const out = [];
        Object.keys(this.statsParDomaine).forEach(d => {
            const s = this.statsParDomaine[d];
            if (s.total === 0) return;
            out.push({
                domaine: d,
                bonnes: s.bonnes,
                total: s.total,
                tauxPct: Math.round(100 * s.bonnes / s.total),
                tempsMoyen: +(s.tempsTotal / s.total).toFixed(1)
            });
        });
        return out;
    }

    formatCombo() {
        return '×' + this.combo.toFixed(1).replace('.', ',');
    }
}

window.ScoreManager = ScoreManager;
