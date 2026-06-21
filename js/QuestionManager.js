/* global CONFIG */

// QuestionManager — Phase 3.
// Pige selon le mélange de paliers du niveau (CLAUDE.md §7), en alternant
// les domaines actifs, en évitant de reposer trop vite une question déjà vue,
// et en appliquant un léger ajustement adaptatif (Specifications §5.3).

class QuestionManager {
    constructor(toutes, options = {}) {
        this.toutes = Array.isArray(toutes) ? toutes : [];
        this.niveau = options.niveau || 1;
        this.domainesActifs = options.domainesActifs
            || (CONFIG && CONFIG.domainesActifs)
            || ['Arithmétique', 'Géométrie', 'Mesure', 'Statistique', 'Probabilité'];
        // Si défini, ne pige que dans ce(s) sous-domaine(s) (mode entraînement).
        this.sousDomaines = options.sousDomaines || null;
        this.adaptatif = options.adaptatif !== undefined
            ? options.adaptatif
            : !!(CONFIG && CONFIG.adaptatif);

        // Banque filtrée selon le sous-domaine (si actif).
        this.banque = this.sousDomaines
            ? this.toutes.filter(q => this.sousDomaines.includes(q.sousDomaine))
            : this.toutes;

        // Anti-répétition + biais vers les questions les moins vues.
        // Ces structures peuvent être passées par l'appelant pour persister
        // entre les niveaux d'une même session (registry Phaser).
        this.recentlyServed = options.recentlyServed || [];
        this.seenCount      = options.seenCount || {};
        this.maxRecent      = options.maxRecent || 80;

        this.fileDomaines = this._melange(this.domainesActifs.slice());

        this.statsParDomaine = {};
        this.domainesActifs.forEach(d => {
            this.statsParDomaine[d] = { reponsesRecentes: [] };
        });
    }

    /** Retourne la prochaine question (domaine choisi en alternance). */
    prochaine() {
        return this.prochaineDuDomaine(this._prochainDomaine());
    }

    /** Retourne une question d'un domaine précis. */
    prochaineDuDomaine(domaine, exclureId = null) {
        if (!this.statsParDomaine[domaine]) {
            this.statsParDomaine[domaine] = { reponsesRecentes: [] };
        }
        const palier = this._choisirPalierAdapte(domaine);

        let pool = this.banque.filter(q =>
            q.domaine === domaine
            && q.palier === palier
            && q.id !== exclureId
            && !this.recentlyServed.includes(q.id)
        );
        if (pool.length === 0) {
            // Fallback 1 : on retire le filtre "récente".
            pool = this.banque.filter(q =>
                q.domaine === domaine && q.palier === palier && q.id !== exclureId
            );
        }
        if (pool.length === 0) {
            // Fallback 2 : palier voisin (vers le bas, puis vers le haut).
            for (const altP of [palier - 1, palier + 1, palier - 2, palier + 2]) {
                pool = this.banque.filter(q =>
                    q.domaine === domaine && q.palier === altP && q.id !== exclureId
                );
                if (pool.length > 0) break;
            }
        }
        if (pool.length === 0) {
            // Fallback 3 : n'importe quelle question du domaine.
            pool = this.banque.filter(q => q.domaine === domaine);
        }
        if (pool.length === 0) return null;

        // Parmi les candidats, on prend la (les) question(s) la(les) moins
        // vue(s) globalement, avec un tirage aléatoire pour départager.
        const q = this._pickLeastSeen(pool);
        this._noterServie(q.id);
        return this._enrichir(q);
    }

    _pickLeastSeen(pool) {
        let minCount = Infinity;
        let candidats = [];
        for (const q of pool) {
            const c = this.seenCount[q.id] || 0;
            if (c < minCount) { minCount = c; candidats = [q]; }
            else if (c === minCount) { candidats.push(q); }
        }
        return candidats[Math.floor(Math.random() * candidats.length)];
    }

    /** À appeler après chaque réponse pour le suivi adaptatif. */
    enregistrerResultat(domaine, correct, tempsRestant, tempsTotal) {
        if (!this.statsParDomaine[domaine]) return;
        const rapide = correct && (tempsRestant >= tempsTotal * 0.5);
        const liste = this.statsParDomaine[domaine].reponsesRecentes;
        liste.push({ correct, rapide });
        while (liste.length > 8) liste.shift();
    }

    // --- internes ---

    _prochainDomaine() {
        if (this.fileDomaines.length === 0) {
            this.fileDomaines = this._melange(this.domainesActifs.slice());
        }
        return this.fileDomaines.shift();
    }

    _noterServie(id) {
        this.recentlyServed.push(id);
        if (this.recentlyServed.length > this.maxRecent) {
            this.recentlyServed.shift();
        }
        this.seenCount[id] = (this.seenCount[id] || 0) + 1;
    }

    _melange(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    _melangePaliersDuNiveau() {
        const n = this.niveau;
        if (n <= 4)  return [[1, 0.80], [2, 0.20]];
        if (n <= 8)  return [[1, 0.50], [2, 0.40], [3, 0.10]];
        if (n <= 12) return [[1, 0.25], [2, 0.50], [3, 0.25]];
        if (n <= 16) return [[1, 0.10], [2, 0.45], [3, 0.45]];
        return [[2, 0.35], [3, 0.65]];
    }

    _choisirPalierNiveau() {
        const mix = this._melangePaliersDuNiveau();
        const r = Math.random();
        let acc = 0;
        for (const [p, prob] of mix) {
            acc += prob;
            if (r <= acc) return p;
        }
        return mix[mix.length - 1][0];
    }

    _choisirPalierAdapte(domaine) {
        let palier = this._choisirPalierNiveau();
        if (!this.adaptatif) return palier;

        const liste = this.statsParDomaine[domaine].reponsesRecentes;

        const last3 = liste.slice(-3);
        if (last3.length === 3 && last3.every(r => r.correct && r.rapide)) {
            palier = Math.min(3, palier + 1);
        }

        const last2 = liste.slice(-2);
        if (last2.length === 2 && last2.every(r => !r.correct)) {
            palier = Math.max(1, palier - 1);
        }

        return palier;
    }

    _enrichir(q) {
        return Object.assign({}, q, {
            tempsSec: q.tempsSec || this._tempsParPalier(q.palier),
            pointsBase: q.pointsBase || this._pointsParPalier(q.palier)
        });
    }

    _tempsParPalier(p) {
        if (p === 3) return CONFIG.temps.difficile;
        if (p === 2) return CONFIG.temps.moyen;
        return CONFIG.temps.facile;
    }
    _pointsParPalier(p) {
        if (p === 3) return CONFIG.pointsBase.difficile;
        if (p === 2) return CONFIG.pointsBase.moyen;
        return CONFIG.pointsBase.facile;
    }
}

window.QuestionManager = QuestionManager;
