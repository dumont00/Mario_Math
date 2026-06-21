/* global CONFIG */

// Gestion centralisée des réglages parentaux :
//   - Disciplines actives (sous-ensemble des domaines)
//   - Tolérance des accents en orthographe
// Persistés via localStorage pour survivre aux rechargements.

class ReglagesManager {
    constructor() {
        this.STORAGE_KEY = 'mario_math_reglages_v1';
        this.defauts = {
            domainesActifs: (CONFIG && CONFIG.domainesActifs)
                ? CONFIG.domainesActifs.slice()
                : ['Arithmétique', 'Géométrie', 'Mesure', 'Statistique', 'Probabilité', 'Français'],
            ignorerAccents: false
        };
        this.charger();
        this.appliquer();
    }

    charger() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                if (Array.isArray(data.domainesActifs) && data.domainesActifs.length > 0) {
                    this.domainesActifs = data.domainesActifs.slice();
                } else {
                    this.domainesActifs = this.defauts.domainesActifs.slice();
                }
                this.ignorerAccents = !!data.ignorerAccents;
                return;
            }
        } catch (e) { /* ignore */ }
        this.domainesActifs = this.defauts.domainesActifs.slice();
        this.ignorerAccents = this.defauts.ignorerAccents;
    }

    sauvegarder() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
                domainesActifs: this.domainesActifs,
                ignorerAccents: this.ignorerAccents
            }));
        } catch (e) { /* ignore (quota dépassé, navigation privée…) */ }
    }

    /**
     * Applique les réglages au CONFIG global pour que les scènes en cours
     * et à venir voient les bons domaines.
     */
    appliquer() {
        if (!window.CONFIG) return;
        // On filtre la liste pour qu'elle ne contienne que des domaines connus
        // (au cas où une vieille version aurait sauvé un nom obsolète).
        const connus = this.defauts.domainesActifs;
        const actifs = this.domainesActifs.filter(d => connus.indexOf(d) !== -1);
        window.CONFIG.domainesActifs = actifs.length > 0 ? actifs : connus.slice();
        window.CONFIG.ignorerAccents = this.ignorerAccents;
    }

    domaineEstActif(nom) {
        return this.domainesActifs.indexOf(nom) !== -1;
    }
}

window.Reglages = new ReglagesManager();
