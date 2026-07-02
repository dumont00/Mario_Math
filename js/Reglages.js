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
                : ['Arithmétique', 'Géométrie', 'Mesure', 'Statistique', 'Probabilité',
                   'Orthographe', 'Géographie', 'Histoire',
                   'Grammaire', 'Vocabulaire', 'Logique'],
            ignorerAccents: true,           // par défaut on tolère les accents
            multiplicateurTemps: 1.0,       // 1× = temps de référence des questions
            epelerApresOrthographe: true,   // épelle le mot à voix haute après chaque réponse
            paliersMode: 'aleatoire'        // 'niveau' | 'aleatoire' (plus de variété)
        };
        this.charger();
        this.appliquer();
    }

    charger() {
        let migration = false;
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                if (Array.isArray(data.domainesActifs) && data.domainesActifs.length > 0) {
                    this.domainesActifs = data.domainesActifs.slice();
                } else {
                    this.domainesActifs = this.defauts.domainesActifs.slice();
                }
                this.ignorerAccents = data.ignorerAccents !== undefined
                    ? !!data.ignorerAccents
                    : this.defauts.ignorerAccents;
                // 0 = sans chronomètre (cas spécial accepté).
                this.multiplicateurTemps = (typeof data.multiplicateurTemps === 'number'
                    && data.multiplicateurTemps >= 0
                    && data.multiplicateurTemps <= 4)
                    ? data.multiplicateurTemps
                    : this.defauts.multiplicateurTemps;
                this.epelerApresOrthographe = data.epelerApresOrthographe !== undefined
                    ? !!data.epelerApresOrthographe
                    : this.defauts.epelerApresOrthographe;
                this.paliersMode = (data.paliersMode === 'niveau' || data.paliersMode === 'aleatoire')
                    ? data.paliersMode
                    : this.defauts.paliersMode;

                // Migration : renomme l'ancien domaine « Français » (qui
                // ne contenait en fait que l'orthographe) en « Orthographe »
                // — c'est le nom réel de la matière.
                const idxFr = this.domainesActifs.indexOf('Français');
                if (idxFr !== -1) {
                    if (this.domainesActifs.indexOf('Orthographe') === -1) {
                        this.domainesActifs[idxFr] = 'Orthographe';
                    } else {
                        this.domainesActifs.splice(idxFr, 1);
                    }
                    migration = true;
                }

                // Migration : on active automatiquement les domaines qui ont
                // été ajoutés à l'app depuis la dernière sauvegarde, pour
                // qu'ils soient présents par défaut (l'utilisateur peut
                // toujours les décocher).
                const nouveauxDomaines = ['Géographie', 'Histoire',
                                          'Grammaire', 'Vocabulaire', 'Logique'];
                for (const d of nouveauxDomaines) {
                    if (this.defauts.domainesActifs.indexOf(d) !== -1
                        && this.domainesActifs.indexOf(d) === -1) {
                        this.domainesActifs.push(d);
                        migration = true;
                    }
                }
                if (migration) {
                    // On sauvegarde immédiatement pour ne pas refaire la
                    // migration au prochain chargement.
                    this.sauvegarder();
                }
                return;
            }
        } catch (e) { /* ignore */ }
        this.domainesActifs         = this.defauts.domainesActifs.slice();
        this.ignorerAccents         = this.defauts.ignorerAccents;
        this.multiplicateurTemps    = this.defauts.multiplicateurTemps;
        this.epelerApresOrthographe = this.defauts.epelerApresOrthographe;
        this.paliersMode            = this.defauts.paliersMode;
    }

    sauvegarder() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
                domainesActifs:         this.domainesActifs,
                ignorerAccents:         this.ignorerAccents,
                multiplicateurTemps:    this.multiplicateurTemps,
                epelerApresOrthographe: this.epelerApresOrthographe,
                paliersMode:            this.paliersMode
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
        window.CONFIG.domainesActifs         = actifs.length > 0 ? actifs : connus.slice();
        window.CONFIG.ignorerAccents         = this.ignorerAccents;
        window.CONFIG.multiplicateurTemps    = this.multiplicateurTemps;
        window.CONFIG.epelerApresOrthographe = this.epelerApresOrthographe;
        window.CONFIG.paliersMode            = this.paliersMode;
    }

    domaineEstActif(nom) {
        return this.domainesActifs.indexOf(nom) !== -1;
    }
}

window.Reglages = new ReglagesManager();
