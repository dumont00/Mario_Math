/* global CONFIG */

// Phase 2 : fournit des questions tirées d'un petit échantillon codé en dur,
// couvrant les cinq domaines, paliers ★ et ★★ (mélange du Monde 1 selon
// Specifications §5.2). À la Phase 3, on remplacera la source par
// data/questions.json + un vrai algorithme de pige par palier/domaine.

const QUESTIONS_PHASE2 = [
    {
        id: 'a1', domaine: 'Arithmétique', sousDomaine: 'Multiplication', palier: 1, type: 'choix',
        question: '6 × 7 = ?',
        choix: ['36', '40', '42', '48'], reponse: '42',
        explication: 'Six fois sept, ça fait 42.',
        tempsSec: 20, pointsBase: 100
    },
    {
        id: 'a2', domaine: 'Arithmétique', sousDomaine: 'Nombres naturels', palier: 1, type: 'choix',
        question: 'Quel nombre vient juste après 4 999 ?',
        choix: ['4 990', '5 000', '5 010', '5 999'], reponse: '5 000',
        explication: 'Après 4 999, on continue avec 5 000.',
        tempsSec: 20, pointsBase: 100
    },
    {
        id: 'g1', domaine: 'Géométrie', sousDomaine: 'Solides', palier: 1, type: 'choix',
        question: 'Combien de faces a un cube ?',
        choix: ['4', '6', '8', '12'], reponse: '6',
        explication: 'Un cube a 6 faces carrées identiques, comme un dé.',
        tempsSec: 20, pointsBase: 100
    },
    {
        id: 'm1', domaine: 'Mesure', sousDomaine: 'Longueur', palier: 1, type: 'choix',
        question: 'Combien de centimètres font 1 mètre ?',
        choix: ['10', '100', '1 000', '10 000'], reponse: '100',
        explication: '1 mètre, c\'est 100 centimètres.',
        tempsSec: 20, pointsBase: 100
    },
    {
        id: 's1', domaine: 'Statistique', sousDomaine: 'Diagramme à bandes', palier: 1, type: 'choix',
        question: 'Dans un diagramme à bandes, qu\'est-ce qu\'on lit habituellement sur l\'axe horizontal ?',
        choix: ['Les nombres', 'Les catégories', 'La date du jour', 'La hauteur'], reponse: 'Les catégories',
        explication: 'On place les catégories (ex. couleurs, sports) en bas du diagramme.',
        tempsSec: 20, pointsBase: 100
    },
    {
        id: 'p1', domaine: 'Probabilité', sousDomaine: 'Événements', palier: 1, type: 'choix',
        question: 'Voir un soleil briller au pôle Nord en plein hiver, c\'est…',
        choix: ['Certain', 'Possible', 'Impossible', 'Très probable'], reponse: 'Impossible',
        explication: 'En hiver, au pôle Nord, il fait nuit tout le temps — c\'est impossible.',
        tempsSec: 20, pointsBase: 100
    },
    {
        id: 'a3', domaine: 'Arithmétique', sousDomaine: 'Multiplication', palier: 2, type: 'choix',
        question: '23 × 4 = ?',
        choix: ['82', '92', '94', '102'], reponse: '92',
        explication: '20 × 4 = 80, puis 3 × 4 = 12, donc 80 + 12 = 92.',
        tempsSec: 15, pointsBase: 150
    },
    {
        id: 'g2', domaine: 'Géométrie', sousDomaine: 'Angles', palier: 2, type: 'choix',
        question: 'Combien de degrés mesure un angle droit ?',
        choix: ['45°', '90°', '180°', '360°'], reponse: '90°',
        explication: 'Un angle droit forme un coin parfait, comme dans un carré : 90°.',
        tempsSec: 15, pointsBase: 150
    },
    {
        id: 'm2', domaine: 'Mesure', sousDomaine: 'Périmètre', palier: 2, type: 'choix',
        question: 'Quel est le périmètre d\'un carré de 5 cm de côté ?',
        choix: ['10 cm', '15 cm', '20 cm', '25 cm'], reponse: '20 cm',
        explication: 'Un carré a 4 côtés égaux : 4 × 5 cm = 20 cm.',
        tempsSec: 15, pointsBase: 150
    },
    {
        id: 'p2', domaine: 'Probabilité', sousDomaine: 'Issues', palier: 2, type: 'choix',
        question: 'Sur un dé à 6 faces, combien de résultats donnent un nombre pair ?',
        choix: ['1', '2', '3', '4'], reponse: '3',
        explication: 'Les nombres pairs sur un dé sont 2, 4 et 6 → 3 issues.',
        tempsSec: 15, pointsBase: 150
    }
];

class QuestionManager {
    constructor(questions = QUESTIONS_PHASE2) {
        this.banque = questions.slice();
        this.melange();
        this.index = 0;
    }

    melange() {
        for (let i = this.banque.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.banque[i], this.banque[j]] = [this.banque[j], this.banque[i]];
        }
    }

    /** Retourne la prochaine question, en reprenant du début quand on a fait le tour. */
    prochaine() {
        if (this.banque.length === 0) return null;
        const q = this.banque[this.index % this.banque.length];
        this.index += 1;
        return this.enrichir(q);
    }

    /**
     * Retourne une question d'un domaine précis (utile à la réactivation d'un bloc raté).
     * Évite de redonner la même question (`exclureId`) si possible.
     */
    prochaineDuDomaine(domaine, exclureId = null) {
        const memeDomaine = this.banque.filter(q => q.domaine === domaine);
        if (memeDomaine.length === 0) return null;
        const candidats = memeDomaine.filter(q => q.id !== exclureId);
        const pool = candidats.length > 0 ? candidats : memeDomaine;
        const q = pool[Math.floor(Math.random() * pool.length)];
        return this.enrichir(q);
    }

    enrichir(q) {
        return Object.assign({}, q, {
            tempsSec: q.tempsSec || this.tempsParPalier(q.palier),
            pointsBase: q.pointsBase || this.pointsParPalier(q.palier)
        });
    }

    tempsParPalier(palier) {
        if (palier === 3) return CONFIG.temps.difficile;
        if (palier === 2) return CONFIG.temps.moyen;
        return CONFIG.temps.facile;
    }

    pointsParPalier(palier) {
        if (palier === 3) return CONFIG.pointsBase.difficile;
        if (palier === 2) return CONFIG.pointsBase.moyen;
        return CONFIG.pointsBase.facile;
    }
}

window.QuestionManager = QuestionManager;
window.QUESTIONS_PHASE2 = QUESTIONS_PHASE2;
