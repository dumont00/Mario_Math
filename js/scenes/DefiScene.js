/* global Phaser, CONFIG, ScoreManager, QuestionManager, QuestionModal, Stats */

// Mode Défi — Série de bonnes réponses.
// Pas de plateforme : les cartes-questions s'enchaînent une à la suite
// de l'autre. L'objectif du niveau N est d'enchaîner N × 5 bonnes
// réponses d'affilée. Une mauvaise réponse remet la série à 0, mais le
// jeu continue (pas de game over). Le joueur peut quitter à tout moment.

class DefiScene extends Phaser.Scene {
    constructor() {
        super({ key: 'DefiScene' });
    }

    init(data) {
        data = data || {};
        this.defiLevel    = data.defiLevel || 1;
        this.streakCible  = this.defiLevel * 5;
        // Difficulté des questions : on monte à mesure que le niveau monte.
        this.niveauEquivalent = Math.min(20, 1 + (this.defiLevel - 1) * 2);

        this.serieActuelle    = 0;
        this.meilleureSerie   = 0;
        this.questionsRepondues = 0;
        this.niveauFini       = false;
    }

    create() {
        const w = this.scale.width, h = this.scale.height;

        // Décor : ciel sombre étoilé pour distinguer du mode aventure.
        this.cameras.main.setBackgroundColor('#1a2447');
        for (let i = 0; i < 60; i++) {
            const x = Phaser.Math.Between(0, w);
            const y = Phaser.Math.Between(0, h);
            const r = Phaser.Math.Between(1, 2);
            this.add.circle(x, y, r, 0xffffff, Phaser.Math.FloatBetween(0.3, 0.9));
        }

        // Banque + mémoire (séparée du mode aventure).
        const banque = this.cache.json.get('questions') || [];
        const memoire = this.game.registry.get('mem_defi') || {
            recentlyServed: [], seenCount: {}
        };

        this.score = new ScoreManager();
        this.questions = new QuestionManager(banque, {
            niveau:         this.niveauEquivalent,
            domainesActifs: CONFIG.domainesActifs,
            adaptatif:      CONFIG.adaptatif,
            recentlyServed: memoire.recentlyServed,
            seenCount:      memoire.seenCount,
            maxRecent:      80
        });
        this.game.registry.set('mem_defi', {
            recentlyServed: this.questions.recentlyServed,
            seenCount:      this.questions.seenCount
        });

        this.modale = new QuestionModal();
        this.creerHud();

        // Démarrer la première question après une courte pause.
        this.time.delayedCall(450, () => this.poserQuestion());
    }

    creerHud() {
        const w = this.scale.width, h = this.scale.height;
        const styleSmall = {
            fontFamily: 'Arial, sans-serif', fontSize: '18px',
            color: '#ffffff',
            backgroundColor: 'rgba(0, 0, 0, 0.35)',
            padding: { x: 10, y: 6 }
        };

        // Titre.
        this.add.text(w / 2, 40, 'Défi — Niveau ' + this.defiLevel, {
            fontFamily: 'Arial, sans-serif', fontSize: '28px',
            color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(w / 2, 76, 'Objectif : ' + this.streakCible + ' bonnes réponses d\'affilée', {
            fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#a3d4ff'
        }).setOrigin(0.5);

        // Compteur central très visible.
        this.hudSerie = this.add.text(w / 2, h / 2 - 30,
            this.serieActuelle + ' / ' + this.streakCible,
            {
                fontFamily: 'Arial, sans-serif', fontSize: '110px',
                color: '#ffe66d', fontStyle: 'bold',
                stroke: '#000000', strokeThickness: 5
            }
        ).setOrigin(0.5);

        this.add.text(w / 2, h / 2 + 50, 'En série', {
            fontFamily: 'Arial, sans-serif', fontSize: '20px', color: '#cfd8e8'
        }).setOrigin(0.5);

        // Barre de progression.
        const barreW = 420, barreH = 16;
        const barreX = (w - barreW) / 2, barreY = h / 2 + 80;
        this.add.rectangle(barreX, barreY, barreW, barreH, 0x3a4055, 1)
            .setOrigin(0, 0).setStrokeStyle(2, 0x5d6478);
        this.hudBarre = this.add.rectangle(barreX, barreY, 1, barreH, 0x2ecc71, 1)
            .setOrigin(0, 0);

        // Stats en bas.
        this.hudScore     = this.add.text(20, h - 24, 'Score : 0', styleSmall).setOrigin(0, 1);
        this.hudMeilleure = this.add.text(w / 2, h - 24, 'Meilleure série : 0', styleSmall).setOrigin(0.5, 1);
        this.hudQuestions = this.add.text(w - 20, h - 24, 'Questions : 0', styleSmall).setOrigin(1, 1);

        // Bouton quitter.
        const btn = this.add.text(w - 16, 16, '✕  Quitter', {
            fontFamily: 'Arial, sans-serif', fontSize: '16px',
            color: '#ffffff',
            backgroundColor: 'rgba(231, 76, 60, 0.85)',
            padding: { x: 10, y: 6 }
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
        btn.on('pointerdown', () => this.terminerNiveau({ succes: false, abandon: true }));
    }

    poserQuestion() {
        if (this.niveauFini) return;
        const q = this.questions.prochaine();
        if (!q) {
            // Pas de question disponible (banque vide ?).
            this.terminerNiveau({ succes: false });
            return;
        }
        this.modale.afficher(q, {
            onTermine:    (res) => this.onReponse(q, res),
            onRetourMenu: () => this.retourMenu()
        });
    }

    retourMenu() {
        if (this.niveauFini) return;
        this.niveauFini = true;
        this.scene.start('MenuScene');
    }

    onReponse(question, resultat) {
        if (this.niveauFini) return;
        this.questionsRepondues += 1;

        let serieBrisee = false;
        if (resultat.correct) {
            this.score.bonneReponse(question, resultat.tempsRestant);
            this.serieActuelle += 1;
            if (this.serieActuelle > this.meilleureSerie) {
                this.meilleureSerie = this.serieActuelle;
            }
        } else {
            serieBrisee = (this.serieActuelle > 0);
            this.score.mauvaiseReponse(question);
            this.serieActuelle = 0;
        }
        this.questions.enregistrerResultat(
            question.domaine, resultat.correct,
            resultat.tempsRestant || 0, question.tempsSec
        );
        // Persistance globale pour la page Stats & révision du menu.
        if (typeof Stats !== 'undefined') {
            Stats.enregistrer(question, resultat.correct, resultat.choixJoueur);
        }

        this.majHud();

        if (resultat.correct) {
            this.flash('+1', 0x2ecc71);
            if (this.serieActuelle >= this.streakCible) {
                this.terminerNiveau({ succes: true });
                return;
            }
        } else if (serieBrisee) {
            this.flash('Série brisée !', 0xe74c3c);
        }

        this.time.delayedCall(450, () => this.poserQuestion());
    }

    majHud() {
        this.hudSerie.setText(this.serieActuelle + ' / ' + this.streakCible);
        this.hudScore.setText('Score : ' + this.score.score);
        this.hudMeilleure.setText('Meilleure série : ' + this.meilleureSerie);
        this.hudQuestions.setText('Questions : ' + this.questionsRepondues);

        // Mise à jour de la barre de progression.
        const ratio = Math.min(1, this.serieActuelle / this.streakCible);
        this.hudBarre.width = Math.max(1, ratio * 420);
    }

    flash(texte, couleurHex) {
        const w = this.scale.width, h = this.scale.height;
        const couleurCss = '#' + couleurHex.toString(16).padStart(6, '0');
        const t = this.add.text(w / 2, h / 2 - 130, texte, {
            fontFamily: 'Arial, sans-serif', fontSize: '34px',
            color: '#ffffff', fontStyle: 'bold',
            backgroundColor: couleurCss,
            padding: { x: 16, y: 10 }
        }).setOrigin(0.5).setDepth(5).setScrollFactor(0);

        this.tweens.add({
            targets: t,
            y: h / 2 - 170,
            alpha: 0,
            duration: 700,
            ease: 'Cubic.easeOut',
            onComplete: () => t.destroy()
        });
    }

    terminerNiveau({ succes = false, abandon = false } = {}) {
        if (this.niveauFini) return;
        this.niveauFini = true;

        // Si la modale est ouverte (cas du Quitter), la fermer proprement.
        try {
            const overlay = document.getElementById('question-modal');
            if (overlay && !overlay.hidden) {
                overlay.hidden = true;
                overlay.setAttribute('aria-hidden', 'true');
                document.body.classList.remove('modal-open');
                if (this.modale && this.modale.arreterTimer) this.modale.arreterTimer();
            }
        } catch (e) { /* ignore */ }

        this.scene.start('ResultScene', {
            mode:             'defi',
            defiLevel:        this.defiLevel,
            streakCible:      this.streakCible,
            meilleureSerie:   this.meilleureSerie,
            score:            this.score.score,
            cristaux:         this.score.cristaux,
            cristauxRequis:   this.streakCible,
            questionsTotales: this.questionsRepondues,
            etoiles:          succes ? 3 : (this.meilleureSerie >= this.streakCible * 0.6 ? 1 : 0),
            recap:            this.score.recapDomaines(),
            succes,
            abandon
        });
    }
}

window.DefiScene = DefiScene;
