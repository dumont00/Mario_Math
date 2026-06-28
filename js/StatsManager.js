// Gestion centralisée des statistiques persistantes et de l'historique des
// questions manquées. Stocké dans localStorage pour qu'un parent puisse
// revoir avec l'enfant les questions ratées d'une session à l'autre.

class StatsManagerLocal {
    constructor() {
        this.STORAGE_KEY = 'mario_math_stats_v1';
        // On limite la liste pour ne pas faire exploser le stockage.
        this.MAX_MANQUEES = 80;
        this.charger();
    }

    charger() {
        this.parDomaine = {};
        this.manquees   = [];
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (!raw) return;
            const data = JSON.parse(raw);
            if (data && typeof data === 'object') {
                if (data.parDomaine && typeof data.parDomaine === 'object') {
                    this.parDomaine = data.parDomaine;
                }
                if (Array.isArray(data.manquees)) {
                    this.manquees = data.manquees;
                }
            }
        } catch (e) { /* ignore (quota, navigation privée…) */ }
    }

    sauvegarder() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
                parDomaine: this.parDomaine,
                manquees:   this.manquees
            }));
        } catch (e) { /* ignore */ }
    }

    /**
     * Enregistre une réponse à une question. Si la réponse est mauvaise,
     * la question est ajoutée à la liste des manquées (pour revue parent).
     */
    enregistrer(question, correct, choixJoueur) {
        if (!question || !question.domaine) return;
        const d = question.domaine;
        if (!this.parDomaine[d]) this.parDomaine[d] = { bonnes: 0, total: 0 };
        this.parDomaine[d].total  += 1;
        if (correct) this.parDomaine[d].bonnes += 1;

        if (!correct) {
            this.manquees.unshift({
                id:          question.id,
                domaine:     question.domaine,
                sousDomaine: question.sousDomaine || '',
                question:    question.question,
                reponse:     question.reponse,
                choixJoueur: (choixJoueur == null ? '' : String(choixJoueur)),
                explication: question.explication || '',
                ts:          Date.now()
            });
            while (this.manquees.length > this.MAX_MANQUEES) this.manquees.pop();
        }
        this.sauvegarder();
    }

    /** Statistiques globales agrégées. */
    apercu() {
        let bonnes = 0, total = 0;
        Object.keys(this.parDomaine).forEach(d => {
            bonnes += this.parDomaine[d].bonnes || 0;
            total  += this.parDomaine[d].total  || 0;
        });
        return {
            bonnes,
            total,
            pourcentage: total > 0 ? Math.round(100 * bonnes / total) : 0
        };
    }

    /** Liste des domaines triés par nom, avec total / bonnes / %. */
    listeDomaines() {
        return Object.keys(this.parDomaine)
            .sort((a, b) => a.localeCompare(b, 'fr'))
            .map(d => {
                const s = this.parDomaine[d];
                return {
                    domaine: d,
                    bonnes:  s.bonnes || 0,
                    total:   s.total  || 0,
                    pct:     s.total > 0 ? Math.round(100 * s.bonnes / s.total) : 0
                };
            });
    }

    listeManquees() {
        return this.manquees.slice();
    }

    /** Efface l'historique des questions manquées (les stats restent). */
    effacerManquees() {
        this.manquees = [];
        this.sauvegarder();
    }

    /** Efface TOUT : stats globales et questions manquées. */
    effacerTout() {
        this.parDomaine = {};
        this.manquees   = [];
        this.sauvegarder();
    }
}

window.Stats = new StatsManagerLocal();
