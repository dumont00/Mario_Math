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
        this.elHome        = document.getElementById('modal-home');

        this.timerId        = null;
        this.tempsRestant   = 0;
        this.tempsTotal     = 0;
        this.onTermine      = null;
        this.onRetourMenu   = null;
        this.question       = null;
        this.repondu        = false;

        this.elContinue.addEventListener('click', () => this.terminer());
        if (this.elHome) {
            this.elHome.addEventListener('click', () => this.demanderRetourMenu());
        }

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
        // « Réécouter » prononce le mot et, s'il y en a une, la phrase de
        // contexte pour lever l'ambiguïté des homophones (vert, vers, verre…).
        this.elAudio.addEventListener('click', () => this._jouerAudio(true));
    }

    afficher(question, { onTermine, onRetourMenu } = {}) {
        this.question = question;
        this.onTermine    = onTermine || null;
        this.onRetourMenu = onRetourMenu || null;
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

        const mult = (window.CONFIG && typeof window.CONFIG.multiplicateurTemps === 'number')
            ? window.CONFIG.multiplicateurTemps : 1;
        this.tempsTotal   = Math.max(3, Math.round(question.tempsSec * mult));
        this.tempsRestant = this.tempsTotal;
        this.majTimebar();

        this.root.hidden = false;
        this.root.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');

        // Audio : à l'ouverture, on dit déjà le mot ET la phrase de
        // contexte (lèvent l'ambiguïté des homophones — vert / vers /
        // verre / ver). Appel SYNCHRONE pour préserver le contexte de
        // geste utilisateur quand c'est possible.
        if (estSaisie && question.audio) {
            this._jouerAudio(true);
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

    _jouerAudio(avecContexte = false) {
        if (!this.question || !this.question.audio) return;
        if (typeof Voix === 'undefined') return;
        const mot = this.question.mot || this.question.reponse;
        let texte = mot;
        if (avecContexte && this.question.phraseContexte) {
            // Pause naturelle entre le mot et la phrase pour que le lecteur
            // marque bien la séparation.
            texte = mot + ', comme dans : ' + this.question.phraseContexte + '.';
        }
        Voix.dire(texte);
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
        // Tolère : espaces avant/après, casse. Les traits d'union doivent
        // correspondre. Les accents doivent correspondre, SAUF si l'option
        // « Ignorer les accents » est active dans les réglages.
        const ignorerAccents = !!(window.CONFIG && window.CONFIG.ignorerAccents);
        const norm = (s) => {
            let n = String(s || '').trim().toLowerCase().normalize('NFC');
            if (ignorerAccents) {
                n = n.normalize('NFD').replace(/[̀-ͯ]/g, '');
            }
            return n;
        };
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

        // Sur les questions de connaissance (à mémoriser), on affiche la
        // bonne réponse après une erreur : orthographe, géographie,
        // histoire. Pour les questions de raisonnement / calcul (math),
        // on garde la solution masquée pour pousser l'enfant à
        // réfléchir la prochaine fois.
        const estSaisie    = this.question && this.question.type === 'saisie';
        const dom          = this.question && this.question.domaine;
        const domParCoeur  = ['Géographie', 'Histoire'];
        const estParCoeur  = dom && domParCoeur.indexOf(dom) !== -1;

        if (!correct && (estSaisie || estParCoeur)) {
            const rep = this.question.reponse || this.question.mot || '';
            this.elExplication.textContent = estSaisie
                ? 'Le mot était : ' + rep
                : 'La bonne réponse était : ' + rep;
        } else {
            this.elExplication.textContent = '';
        }

        // Question d'orthographe : on épelle le mot à voix haute
        // (sauf si désactivé dans Réglages).
        if (estSaisie) this._epelerMot(correct);

        this.elFeedback.hidden = false;
        this.elContinue.hidden = false;
        this.elContinue.focus();
    }

    _epelerMot(correct) {
        const epelerActif = !window.CONFIG
            || window.CONFIG.epelerApresOrthographe !== false;
        if (!epelerActif) return;
        if (typeof Voix === 'undefined') return;
        const mot = this.question && (this.question.mot || this.question.reponse);
        if (!mot) return;

        const epellation = String(mot).split('').map(c => {
            if (c === '-') return 'tiret';
            if (c === "'") return 'apostrophe';
            if (c === ' ') return 'espace';
            return c;
        }).join(', ');

        const phrase = correct
            ? `Bien, le mot ${mot} s'écrit : ${epellation}.`
            : `Essaie la prochaine fois. Le mot ${mot} s'écrit : ${epellation}.`;
        Voix.dire(phrase);
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
        this.onRetourMenu = null;

        if (this.onTermine) {
            const cb = this.onTermine;
            this.onTermine = null;
            cb(resultat);
        }
    }

    /**
     * Bouton « 🏠 » du coin haut-droit : l'utilisateur veut quitter la
     * question et revenir au menu. On confirme si la question n'est pas
     * encore répondue (clic accidentel). On ferme la modale sans déclencher
     * la callback `onTermine` — c'est `onRetourMenu` qui prend le relais.
     */
    demanderRetourMenu() {
        if (!this.repondu) {
            const ok = window.confirm('Quitter cette question et revenir au menu ?');
            if (!ok) return;
        }
        this.arreterTimer();
        this.root.hidden = true;
        this.root.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');

        // On neutralise la callback de réponse en attente avant d'appeler
        // celle du retour menu, pour éviter un double-déclenchement.
        this._resultat = null;
        this.onTermine = null;

        const cb = this.onRetourMenu;
        this.onRetourMenu = null;
        if (cb) cb();
    }
}

window.QuestionModal = QuestionModal;
