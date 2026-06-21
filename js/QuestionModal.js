/* global Visuels, Voix */

// Encapsule la modale DOM : ouverture, fermeture, minuteur visuel,
// rendu des `visuel` (CLAUDE.md §5), gestion des clics (choix) ou de la
// saisie texte avec audio (type 'saisie').
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
        this.elSaisie      = document.getElementById('modal-saisie');
        this.elAudio       = document.getElementById('modal-audio');
        this.elInput       = document.getElementById('modal-input');
        this.elValider     = document.getElementById('modal-valider');
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

        // Touche Entrée dans le champ texte → validation.
        this.elInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !this.repondu && !this.elInput.disabled) {
                e.preventDefault();
                this.validerSaisie();
            }
        });
        this.elValider.addEventListener('click', () => {
            if (this.repondu || this.elValider.disabled) return;
            this.validerSaisie();
        });
        this.elAudio.addEventListener('click', () => this._jouerAudio());
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

        // Choix vs saisie selon le type de question.
        const estSaisie = question.type === 'saisie';
        if (estSaisie) {
            this.elChoices.hidden = true;
            this.elChoices.innerHTML = '';
            this.elSaisie.hidden = false;
            this.elInput.value = '';
            this.elInput.disabled = false;
            this.elInput.classList.remove('is-correct', 'is-wrong');
            this.elValider.disabled = false;
            this.elAudio.disabled = false;
            // Le focus aide à enchaîner ; sur mobile, ça ouvre le clavier.
            setTimeout(() => this.elInput.focus(), 60);
        } else {
            this.elSaisie.hidden = true;
            this.elChoices.hidden = false;
            this.elChoices.innerHTML = '';
            (question.choix || []).forEach((choix) => {
                const btn = document.createElement('button');
                btn.className = 'modal__choice';
                btn.type = 'button';
                btn.textContent = choix;
                btn.addEventListener('click', () => this.choisir(choix, btn));
                this.elChoices.appendChild(btn);
            });
        }

        this.elFeedback.hidden = true;
        this.elFeedback.classList.remove('is-good', 'is-bad');
        this.elContinue.hidden = true;

        this.tempsTotal = question.tempsSec;
        this.tempsRestant = question.tempsSec;
        this.majTimebar();

        this.root.hidden = false;
        this.root.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');

        // Audio : tente la lecture automatique du mot pour les questions
        // d'écoute (peut être bloquée sur mobile au tout premier coup ;
        // le bouton 🔊 Réécouter permet de relancer).
        if (estSaisie && question.audio) {
            setTimeout(() => this._jouerAudio(), 120);
        }

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

    _jouerAudio() {
        if (!this.question || !this.question.audio) return;
        if (typeof Voix === 'undefined') return;
        Voix.dire(this.question.mot || this.question.reponse);
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

    validerSaisie() {
        if (this.repondu) return;
        this.repondu = true;
        this.arreterTimer();

        const saisie = this.elInput.value;
        const correct = this._comparerSaisie(saisie, this.question.reponse);

        this.elInput.disabled = true;
        this.elValider.disabled = true;
        this.elInput.classList.add(correct ? 'is-correct' : 'is-wrong');

        this.afficherFeedback(correct);
        this._resultat = { correct, choixJoueur: saisie, tempsRestant: this.tempsRestant };
    }

    _comparerSaisie(saisie, attendu) {
        // Tolère : espaces avant/après, casse. Les accents et traits d'union
        // doivent correspondre (c'est l'orthographe).
        const norm = (s) => String(s || '').trim().toLowerCase().normalize('NFC');
        return norm(saisie) === norm(attendu);
    }

    tempsEcoule() {
        this.repondu = true;
        this.arreterTimer();
        Array.from(this.elChoices.children).forEach((b) => { b.disabled = true; });
        this.elInput.disabled = true;
        this.elValider.disabled = true;
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
                ? 'Temps écoulé…'
                : 'Presque ! Réfléchis encore la prochaine fois.';
        }
        // L'explication et la bonne réponse sont volontairement masquées
        // pour ne pas « donner » la solution juste après une erreur.
        this.elExplication.textContent = '';
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
