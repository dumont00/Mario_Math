// Wrapper pour la synthèse vocale du navigateur (Web Speech API).
// Renforcé pour fonctionner sur Chrome iOS où l'API est plus capricieuse
// que sur Safari iOS : on évite les `cancel()` superflus, on déverrouille
// avec une utterance audible (volume très bas) plutôt que muette,
// et on rejoue les voix à chaque demande au cas où elles n'étaient pas
// encore chargées au démarrage.

class VoixHelper {
    constructor() {
        this.disponible = ('speechSynthesis' in window) &&
                          (typeof SpeechSynthesisUtterance !== 'undefined');
        this.voixFr = null;
        this.aEteDebloquee = false;
        // Timer d'attente entre un cancel() et le speak() suivant. On le
        // garde en champ pour pouvoir l'annuler depuis arreter() : sinon,
        // fermer la modale juste après avoir demandé un nouveau mot
        // laisserait ce speak() différé s'exécuter quand même.
        this._speakTimer = null;

        if (this.disponible) {
            this._chargerVoix();
            try {
                window.speechSynthesis.addEventListener(
                    'voiceschanged',
                    () => this._chargerVoix()
                );
            } catch (e) { /* ignore */ }
        }
    }

    _chargerVoix() {
        if (!this.disponible) return;
        const voix = window.speechSynthesis.getVoices();
        if (!voix || voix.length === 0) return;
        // Préférer fr-CA, puis fr-FR, puis toute voix fr-*.
        this.voixFr =
            voix.find(v => v.lang === 'fr-CA') ||
            voix.find(v => v.lang === 'fr-FR') ||
            voix.find(v => v.lang && v.lang.toLowerCase().startsWith('fr')) ||
            null;
    }

    /**
     * Déverrouille la synthèse vocale lors d'un geste utilisateur (clic /
     * touchstart). Sur Chrome iOS particulièrement, une utterance
     * complètement silencieuse (volume = 0) est parfois ignorée par le
     * moteur ; on utilise un volume très bas mais non nul.
     */
    debloquer() {
        if (!this.disponible || this.aEteDebloquee) return;
        try {
            const u = new SpeechSynthesisUtterance(' ');
            u.volume = 0.01;
            u.rate = 2.0;
            u.lang = 'fr-FR';
            window.speechSynthesis.speak(u);
            this.aEteDebloquee = true;
        } catch (e) { /* ignore */ }
    }

    /**
     * Prononce un mot. Sur Chrome iOS, doit être appelée de façon
     * synchrone dans un gestionnaire d'événement utilisateur (click /
     * touchend), sinon la requête peut être ignorée silencieusement —
     * SAUF si la synthèse a déjà été déverrouillée par un clic
     * précédent (voir `debloquer()`), auquel cas les appels ultérieurs
     * fonctionnent même dans un setTimeout.
     */
    dire(mot, options = {}) {
        if (!this.disponible || !mot) return false;
        try {
            // Recharger les voix au cas où elles n'étaient pas dispos à
            // l'init (Chrome iOS les charge parfois en retard).
            if (!this.voixFr) this._chargerVoix();

            const u = new SpeechSynthesisUtterance(String(mot));
            if (this.voixFr) {
                u.voice = this.voixFr;
                u.lang  = this.voixFr.lang;
            } else {
                u.lang = 'fr-FR';
            }
            u.rate   = options.rate   !== undefined ? options.rate   : 0.9;
            u.pitch  = options.pitch  !== undefined ? options.pitch  : 1.0;
            u.volume = options.volume !== undefined ? options.volume : 1;

            // Bug Chrome (surtout iOS) : cancel() suivi immédiatement d'un
            // speak() peut soit avaler la nouvelle utterance, soit laisser
            // l'ancienne finir d'abord — donnant l'impression qu'un
            // ancien mot est prononcé pendant qu'une nouvelle question
            // s'affiche. On force un petit délai pour laisser le moteur
            // vider sa file avant de reprendre la parole. Ce délai n'est
            // appliqué QUE si on doit vraiment annuler quelque chose.
            const doitAnnuler = window.speechSynthesis.speaking
                             || window.speechSynthesis.pending;

            // Un speak différé en attente ? On le remplace : c'est le
            // nouveau mot qui doit être dit, pas l'ancien.
            if (this._speakTimer !== null) {
                clearTimeout(this._speakTimer);
                this._speakTimer = null;
            }

            if (doitAnnuler) {
                window.speechSynthesis.cancel();
                this._speakTimer = setTimeout(() => {
                    this._speakTimer = null;
                    try { window.speechSynthesis.speak(u); }
                    catch (e) { /* ignore */ }
                }, 80);
            } else {
                window.speechSynthesis.speak(u);
            }
            return true;
        } catch (e) {
            console.warn('Voix.dire a échoué :', e);
            return false;
        }
    }

    /**
     * Arrête toute parole en cours ou en attente. À appeler lors des
     * transitions de scène (fermeture de modale, retour au menu, fin
     * de partie) pour éviter qu'une longue épellation résiduelle ne
     * déborde sur la partie suivante.
     */
    arreter() {
        if (!this.disponible) return;
        // Annule aussi un speak() différé qui n'aurait pas encore tiré :
        // sans ça, fermer la modale entre le cancel() et le setTimeout
        // de 80 ms laisserait quand même l'utterance suivante partir.
        if (this._speakTimer !== null) {
            clearTimeout(this._speakTimer);
            this._speakTimer = null;
        }
        try {
            if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
                window.speechSynthesis.cancel();
            }
        } catch (e) { /* ignore */ }
    }

    aFrancais() { return !!this.voixFr; }

    /** Affiche dans la console l'état de la synthèse vocale (debug). */
    diagnostic() {
        if (!this.disponible) {
            console.log('speechSynthesis n\'est pas disponible dans ce navigateur.');
            return { disponible: false };
        }
        const voix = window.speechSynthesis.getVoices();
        const fr = voix.filter(v => v.lang && v.lang.toLowerCase().startsWith('fr'));
        const info = {
            disponible: true,
            nombreVoixTotales: voix.length,
            nombreVoixFr: fr.length,
            voixFrançaises: fr.map(v => ({
                name: v.name,
                lang: v.lang,
                default: v.default,
                localService: v.localService
            })),
            voixSelectionnee: this.voixFr ? {
                name: this.voixFr.name,
                lang: this.voixFr.lang
            } : null,
            aEteDebloquee: this.aEteDebloquee,
            estEnTrainDeParler: window.speechSynthesis.speaking,
            enAttente: window.speechSynthesis.pending
        };
        console.log('Voix — diagnostic :', info);
        return info;
    }
}

// Instance globale unique. On évite de réutiliser le nom `Voix` comme
// classe pour qu'elle ne masque pas la propriété window.Voix dans le
// scope lexical des autres scripts.
window.Voix = new VoixHelper();

// Premier clic / tap de la page : déverrouille la synthèse vocale.
(function () {
    if (!('speechSynthesis' in window)) return;
    function unlock() {
        try { window.Voix.debloquer(); } catch (e) { /* ignore */ }
        document.removeEventListener('click', unlock);
        document.removeEventListener('touchstart', unlock);
        document.removeEventListener('touchend', unlock);
    }
    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });
    document.addEventListener('touchend', unlock, { once: true });
})();
