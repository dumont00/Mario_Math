/* global Phaser, CONFIG */

// Écran de résultats de fin de niveau.
// Affiche les étoiles, le récap global, le détail par domaine et
// propose de rejouer ou de passer au niveau suivant.

class ResultScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ResultScene' });
    }

    init(data) {
        this.niveau    = data.niveau || 1;
        this.score     = data.score;
        this.cristaux  = data.cristaux || 0;
        this.cristauxRequis = data.cristauxRequis || CONFIG.cristauxRequisParNiveau;
        this.questionsTotales = data.questionsTotales || 0;
        this.etoiles  = data.etoiles || 0;
        this.recap    = data.recap || [];
        this.succes   = !!data.succes;
        this.tempsEcoule = !!data.tempsEcoule;
    }

    create() {
        const overlay  = document.getElementById('result-screen');
        const elTitre  = document.getElementById('result-titre');
        const elSous   = document.getElementById('result-sous-titre');
        const elEtoiles= document.getElementById('result-etoiles');
        const elNiveau = document.getElementById('result-niveau');
        const elScore  = document.getElementById('result-score');
        const elCrist  = document.getElementById('result-cristaux');
        const elPct    = document.getElementById('result-pourcent');
        const elDoms   = document.getElementById('result-domaines');
        const btnReplay= document.getElementById('result-replay');
        const btnNext  = document.getElementById('result-next');

        const pct = this.questionsTotales > 0
            ? Math.round(100 * this.cristaux / this.questionsTotales)
            : 0;

        if (this.succes) {
            elTitre.textContent = 'Niveau ' + this.niveau + ' réussi !';
            elSous.textContent  = 'Tu as franchi le portail. Bravo !';
        } else if (this.tempsEcoule) {
            elTitre.textContent = 'Temps écoulé !';
            elSous.textContent  = pct >= 50
                ? 'Beau parcours, mais il manquait quelques cristaux.'
                : 'On va revoir ça ensemble, puis on retente !';
        } else {
            elTitre.textContent = 'Niveau ' + this.niveau + ' terminé';
            elSous.textContent  = 'Voici tes résultats :';
        }

        // Étoiles (3 cases, allumées selon le score).
        elEtoiles.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const s = document.createElement('span');
            s.textContent = '★';
            if (i < this.etoiles) s.className = 'is-on';
            elEtoiles.appendChild(s);
        }

        elNiveau.textContent = this.niveau;
        elScore.textContent  = this.score;
        elCrist.textContent  = this.cristaux + ' / ' + this.cristauxRequis;
        elPct.textContent    = pct + ' %';

        elDoms.innerHTML = '';
        if (this.recap.length === 0) {
            const vide = document.createElement('div');
            vide.className = 'result__dom';
            vide.textContent = 'Aucune question répondue.';
            elDoms.appendChild(vide);
        } else {
            this.recap.forEach(r => {
                const div = document.createElement('div');
                div.className = 'result__dom';
                div.innerHTML = `<span>${r.domaine}</span>` +
                                `<strong>${r.bonnes}/${r.total} · ${r.tauxPct}% · ${r.tempsMoyen}s</strong>`;
                elDoms.appendChild(div);
            });
        }

        // Reset des boutons (clones pour éviter les doublons).
        const newReplay = btnReplay.cloneNode(true);
        const newNext   = btnNext.cloneNode(true);
        btnReplay.parentNode.replaceChild(newReplay, btnReplay);
        btnNext.parentNode.replaceChild(newNext, btnNext);

        const niveauMax = 20;
        if (!this.succes || this.niveau >= niveauMax) {
            newNext.disabled = !this.succes;
            if (this.niveau >= niveauMax && this.succes) {
                newNext.textContent = '🏁 Jeu terminé !';
                newNext.disabled = true;
            } else if (!this.succes) {
                newNext.textContent = 'Niveau suivant ▶';
                newNext.disabled = true;
                newNext.style.opacity = '0.5';
                newNext.style.cursor = 'not-allowed';
            }
        }

        newReplay.addEventListener('click', () => {
            this._fermer(overlay);
            this.scene.start('LevelScene', { niveau: this.niveau });
        });
        newNext.addEventListener('click', () => {
            if (newNext.disabled) return;
            this._fermer(overlay);
            this.scene.start('LevelScene', { niveau: Math.min(niveauMax, this.niveau + 1) });
        });

        overlay.hidden = false;
        overlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
    }

    _fermer(overlay) {
        overlay.hidden = true;
        overlay.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
    }
}

window.ResultScene = ResultScene;
