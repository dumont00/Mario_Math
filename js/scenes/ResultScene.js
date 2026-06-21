/* global Phaser, CONFIG */

// Écran de résultats : étoiles, récap par domaine, et boutons selon le mode.

class ResultScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ResultScene' });
    }

    init(data) {
        this.mode             = data.mode || 'aventure';
        this.niveau           = data.niveau || 1;
        this.score            = data.score || 0;
        this.cristaux         = data.cristaux || 0;
        this.cristauxRequis   = data.cristauxRequis || CONFIG.cristauxRequisParNiveau;
        this.questionsTotales = data.questionsTotales || 0;
        this.etoiles          = data.etoiles || 0;
        this.recap            = data.recap || [];
        this.succes           = !!data.succes;
        this.tempsEcoule      = !!data.tempsEcoule;
        this.abandon          = !!data.abandon;
        // Spécifique au mode défi
        this.defiLevel        = data.defiLevel || 1;
        this.streakCible      = data.streakCible || 5;
        this.meilleureSerie   = data.meilleureSerie || 0;
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

        // Titre + sous-titre selon l'issue et le mode.
        if (this.mode === 'defi') {
            if (this.succes) {
                elTitre.textContent = 'Niveau ' + this.defiLevel + ' du défi réussi !';
                elSous.textContent  = 'Tu as enchaîné ' + this.streakCible + ' bonnes réponses d\'affilée. Champion !';
            } else if (this.abandon) {
                elTitre.textContent = 'Défi quitté';
                elSous.textContent  = 'Meilleure série : ' + this.meilleureSerie + '. On peut retenter quand tu veux.';
            } else {
                elTitre.textContent = 'Défi terminé';
                elSous.textContent  = 'Meilleure série : ' + this.meilleureSerie + '.';
            }
        } else if (this.mode === 'mult') {
            elTitre.textContent = this.succes
                ? 'Tables réussies !'
                : 'Entraînement terminé';
            elSous.textContent  = this.succes
                ? 'Tu as répondu aux 30 multiplications. Tu deviens champion des tables !'
                : 'Bel effort. On peut recommencer pour aller plus loin.';
        } else {
            if (this.succes) {
                elTitre.textContent = 'Niveau ' + this.niveau + ' réussi !';
                elSous.textContent  = 'Tu as franchi le portail. Bravo !';
            } else if (this.tempsEcoule) {
                elTitre.textContent = 'Temps écoulé !';
                elSous.textContent  = pct >= 50
                    ? 'Beau parcours, mais il manquait quelques réponses.'
                    : 'On va revoir ça ensemble, puis on retente !';
            } else {
                elTitre.textContent = 'Niveau ' + this.niveau + ' terminé';
                elSous.textContent  = 'Voici tes résultats :';
            }
        }

        // Étoiles.
        elEtoiles.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const s = document.createElement('span');
            s.textContent = '★';
            if (i < this.etoiles) s.className = 'is-on';
            elEtoiles.appendChild(s);
        }

        // Récap : on reconstruit la liste pour adapter les libellés au mode.
        const ul = elNiveau.closest('ul');
        if (this.mode === 'defi') {
            ul.innerHTML =
                '<li>Niveau du défi : <strong id="result-niveau">' + this.defiLevel + '</strong></li>' +
                '<li>Score : <strong id="result-score">' + this.score + '</strong></li>' +
                '<li>Meilleure série : <strong id="result-cristaux">' + this.meilleureSerie + ' / ' + this.streakCible + '</strong></li>' +
                '<li>Questions répondues : <strong id="result-pourcent">' + this.questionsTotales + '</strong></li>';
        } else if (this.mode === 'mult') {
            ul.innerHTML =
                '<li>Mode : <strong id="result-niveau">Tables ×</strong></li>' +
                '<li>Score : <strong id="result-score">' + this.score + '</strong></li>' +
                '<li>Réussies : <strong id="result-cristaux">' + this.cristaux + ' / ' + this.cristauxRequis + '</strong></li>' +
                '<li>Réussite : <strong id="result-pourcent">' + pct + ' %</strong></li>';
        } else {
            ul.innerHTML =
                '<li>Niveau : <strong id="result-niveau">' + this.niveau + '</strong></li>' +
                '<li>Score : <strong id="result-score">' + this.score + '</strong></li>' +
                '<li>Cristaux : <strong id="result-cristaux">' + this.cristaux + ' / ' + this.cristauxRequis + '</strong></li>' +
                '<li>Réussite : <strong id="result-pourcent">' + pct + ' %</strong></li>';
        }

        // Récap par domaine.
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

        // Boutons (clones pour purger les anciens écouteurs).
        const newReplay = btnReplay.cloneNode(true);
        const newNext   = btnNext.cloneNode(true);
        btnReplay.parentNode.replaceChild(newReplay, btnReplay);
        btnNext.parentNode.replaceChild(newNext, btnNext);

        const niveauMax = 20;
        const defiMax   = 10;

        if (this.mode === 'defi') {
            // Rejouer ce niveau, Niveau suivant si succès, sinon Retour au menu
            newReplay.textContent = 'Rejouer';
            if (this.succes && this.defiLevel < defiMax) {
                newNext.textContent = 'Niveau ' + (this.defiLevel + 1) + ' ▶ (' + ((this.defiLevel + 1) * 5) + ' d\'affilée)';
                newNext.disabled = false;
                newNext.style.opacity = '';
                newNext.style.cursor = '';
            } else if (this.succes && this.defiLevel >= defiMax) {
                newNext.textContent = '🏆 Maître du défi — Menu';
                newNext.disabled = false;
            } else {
                newNext.textContent = 'Retour au menu';
                newNext.disabled = false;
                newNext.style.opacity = '';
                newNext.style.cursor = '';
            }
            newReplay.addEventListener('click', () => {
                this._fermer(overlay);
                this.scene.start('DefiScene', { defiLevel: this.defiLevel });
            });
            newNext.addEventListener('click', () => {
                this._fermer(overlay);
                if (this.succes && this.defiLevel < defiMax) {
                    this.scene.start('DefiScene', { defiLevel: this.defiLevel + 1 });
                } else {
                    this.scene.start('MenuScene');
                }
            });
        } else if (this.mode === 'mult') {
            newNext.textContent = 'Retour au menu';
            newNext.disabled = false;
            newNext.style.opacity = '';
            newNext.style.cursor = '';
            newReplay.addEventListener('click', () => {
                this._fermer(overlay);
                this.scene.start('LevelScene', { mode: 'mult' });
            });
            newNext.addEventListener('click', () => {
                this._fermer(overlay);
                this.scene.start('MenuScene');
            });
        } else {
            if (this.niveau >= niveauMax && this.succes) {
                newNext.textContent = '🏁 Aventure terminée — retour au menu';
                newNext.disabled = false;
            } else if (!this.succes) {
                newNext.textContent = 'Niveau suivant ▶';
                newNext.disabled = true;
                newNext.style.opacity = '0.5';
                newNext.style.cursor = 'not-allowed';
            } else {
                newNext.textContent = 'Niveau suivant ▶';
                newNext.disabled = false;
            }
            newReplay.addEventListener('click', () => {
                this._fermer(overlay);
                this.scene.start('LevelScene', { niveau: this.niveau, mode: 'aventure' });
            });
            newNext.addEventListener('click', () => {
                if (newNext.disabled) return;
                this._fermer(overlay);
                if (this.niveau >= niveauMax && this.succes) {
                    this.scene.start('MenuScene');
                } else {
                    this.scene.start('LevelScene', {
                        niveau: Math.min(niveauMax, this.niveau + 1),
                        mode: 'aventure'
                    });
                }
            });
        }

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
