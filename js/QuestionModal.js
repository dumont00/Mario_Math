/* global Visuels */

// Encapsule la modale DOM : ouverture, fermeture, minuteur visuel,
// rendu des `visuel` (CLAUDE.md §5), gestion des clics et bouton « Continuer ».
//
// API :
//   const modal = new QuestionModal();
//   modal.afficher(question, {
//     onTermine: ({ correct, choixJoueur, tempsRestant, tempsEcoule }) => { ... }
//   });

class QuestionModal {
    constructor() {
        this.root          = document.getElementById('question-modal');
        this.elDomaine     = document.getElementById('modal-domain');
        this.elStars       = document.getElementById('modal-stars');
        this.elTimebarFill = document.getElementById('modal-timebar-fill');
        this.elVisuel      = document.getElementById('modal-visuel');
        this.elQuestion    = document.getElementById('modal-question');
        this.elChoices     = document.getElementById('modal-choices');
        this.elFeedback    = document.getElementById('modal-feedback');
        this.elFeedbackTxt = document.getElementById('modal-feedback-text');
        this.elExplication = document.getElementById('modal-explication');
        this.elContinue    = document.getElementById('modal-continue');

        this.timerId      = null;
        this.tempsRestant = 0;
        this.tempsTotal   = 0;
        this.onTermine    = null;
        this.question     = null;
        this.repondu      = false;

        this.elContinue.addEventListener('click', () => this.terminer());
    }

    afficher(question, { onTermine } = {}) {
        this.question = question;
        this.onTermine = onTermine || null;
        this.repondu = false;

        this.elDomaine.textContent = question.domaine;
        this.elStars.textContent = '★'.repeat(question.palier);

        // Visuel (le cas échéant).
        this.elVisuel.innerHTML = '';
        if (question.visuel && typeof Visuels !== 'undefined') {
            const svg = Visuels.render(question.visuel);
            if (svg) {
                this.elVisuel.appendChild(svg);
                this.elVisuel.hidden = false;
            } else {
                this.elVisuel.hidden = true;
            }
        } else {
            this.elVisuel.hidden = true;
        }

        this.elQuestion.textContent = question.question;

        this.elChoices.innerHTML = '';
        question.choix.forEach((choix) => {
            const btn = document.createElement('button');
            btn.className = 'modal__choice';
            btn.type = 'button';
            btn.textContent = choix;
            btn.addEventListener('click', () => this.choisir(choix, btn));
            this.elChoices.appendChild(btn);
        });

        this.elFeedback.hidden = true;
        this.elFeedback.classList.remove('is-good', 'is-bad');
        this.elContinue.hidden = true;

        this.tempsTotal = question.tempsSec;
        this.tempsRestant = question.tempsSec;
        this.majTimebar();

        this.root.hidden = false;
        this.root.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');

        const debut = performance.now();
        this.timerId = setInterval(() => {
            const ecoule = (performance.now() - debut) / 1000;
            this.tempsRestant = Math.max(0, this.tempsTotal - ecoule);
            this.majTimebar();
            if (this.tempsRestant <= 0 && !this.repondu) {
                this.tempsEcoule();
            }
        }, 50);
    }

    majTimebar() {
        const ratio = this.tempsTotal > 0 ? this.tempsRestant / this.tempsTotal : 0;
        this.elTimebarFill.style.width = (ratio * 100).toFixed(1) + '%';
        this.elTimebarFill.classList.toggle('is-warn', ratio < 0.5 && ratio >= 0.25);
        this.elTimebarFill.classList.toggle('is-danger', ratio < 0.25);
    }

    choisir(choixJoueur, btn) {
        if (this.repondu) return;
        this.repondu = true;
        this.arreterTimer();

        const correct = choixJoueur === this.question.reponse;

        // On désactive tous les choix. On surligne en vert seulement si la
        // réponse est bonne, jamais celle qui aurait été correcte pour ne
        // pas « donner » la solution en cas d'erreur. L'explication suffit.
        Array.from(this.elChoices.children).forEach((b) => {
            b.disabled = true;
            if (correct && b === btn) {
                b.classList.add('is-correct');
            } else if (!correct && b === btn) {
                b.classList.add('is-wrong');
            }
        });

        this.afficherFeedback(correct);
        this._resultat = { correct, choixJoueur, tempsRestant: this.tempsRestant };
    }

    tempsEcoule() {
        this.repondu = true;
        this.arreterTimer();
        Array.from(this.elChoices.children).forEach((b) => { b.disabled = true; });
        this.afficherFeedback(false, true);
        this._resultat = { correct: false, choixJoueur: null, tempsRestant: 0, tempsEcoule: true };
    }

    afficherFeedback(correct, tempsEcoule = false) {
        if (correct) {
            this.elFeedback.classList.add('is-good');
            this.elFeedbackTxt.textContent = 'Bravo, c\'est exact !';
        } else {
            this.elFeedback.classList.add('is-bad');
            this.elFeedbackTxt.textContent = tempsEcoule
                ? 'Temps écoulé… Voici comment faire :'
                : 'Presque ! Voici comment faire :';
        }
        this.elExplication.textContent = this.question.explication || '';
        this.elFeedback.hidden = false;
        this.elContinue.hidden = false;
        this.elContinue.focus();
    }

    arreterTimer() {
        if (this.timerId !== null) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    }

    terminer() {
        this.arreterTimer();
        this.root.hidden = true;
        this.root.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');

        const resultat = this._resultat || { correct: false, choixJoueur: null, tempsRestant: 0, abandon: true };
        this._resultat = null;

        if (this.onTermine) {
            const cb = this.onTermine;
            this.onTermine = null;
            cb(resultat);
        }
    }
}

window.QuestionModal = QuestionModal;
