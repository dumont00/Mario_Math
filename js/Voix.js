// Wrapper minimal pour la synthèse vocale du navigateur (Web Speech API).
// Choisit la meilleure voix française disponible et gère le « déverrouillage »
// audio nécessaire sur certains navigateurs mobiles (iOS Safari) qui exigent
// une interaction utilisateur préalable.

class VoixHelper {
    constructor() {
        this.disponible = ('speechSynthesis' in window) &&
                          (typeof SpeechSynthesisUtterance !== 'undefined');
        this.voixFr = null;

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
     * À appeler dans le premier gestionnaire de clic / touchstart de la page
     * pour autoriser les navigateurs mobiles à jouer du son.
     */
    debloquer() {
        if (!this.disponible) return;
        try {
            const u = new SpeechSynthesisUtterance('');
            u.volume = 0;
            window.speechSynthesis.speak(u);
        } catch (e) { /* ignore */ }
    }

    /** Prononce un mot. Renvoie true si la requête a été envoyée. */
    dire(mot, options = {}) {
        if (!this.disponible || !mot) return false;
        try {
            window.speechSynthesis.cancel();
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
            window.speechSynthesis.speak(u);
            return true;
        } catch (e) {
            console.warn('Voix.dire a échoué :', e);
            return false;
        }
    }

    aFrancais() { return !!this.voixFr; }
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
    }
    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });
})();
