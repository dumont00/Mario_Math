/* global Phaser, CONFIG, ScoreManager, QuestionManager, QuestionModal */

// Phase 2 — Blocs-questions et modale.
// Améliorations :
//   - Blocs ouvrables par le dessous OU en se posant dessus.
//   - Bloc raté → grisé puis réactivé après CONFIG.delaiReactivationBloc s
//     avec une nouvelle question du même domaine.
//   - Plateformes basses régulières pour permettre de regrimper après une chute.
//   - Minuteur du tableau (CONFIG.tempsNiveau), écran de fin avec récap.

class LevelScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LevelScene' });

        this.touchInput = { left: false, right: false, jump: false };
    }

    create() {
        const m = CONFIG.moteur;

        this.physics.world.setBounds(0, 0, m.largeurMonde, m.hauteurMonde);

        this.score = new ScoreManager();
        this.questions = new QuestionManager();
        this.modale = new QuestionModal();
        this.enQuestion = false;
        this.niveauFini = false;

        this.addBackgroundDecor();

        this.platforms = this.physics.add.staticGroup();
        this.questionBlocks = this.physics.add.staticGroup();
        this.buildLevel();

        const groundTopY = m.hauteurMonde - 48;
        this.hero = this.physics.add.sprite(80, groundTopY - 30, 'hero');
        this.hero.setCollideWorldBounds(true);
        this.hero.setMaxVelocity(m.vitesseHero, 1400);
        this.hero.body.setSize(28, 44).setOffset(2, 2);

        this.physics.add.collider(this.hero, this.platforms);
        this.physics.add.collider(
            this.hero,
            this.questionBlocks,
            (hero, block) => this.onCollisionBlock(hero, block),
            null,
            this
        );

        this.cameras.main.setBounds(0, 0, m.largeurMonde, m.hauteurMonde);
        this.cameras.main.startFollow(this.hero, true, 0.12, 0.12);
        this.cameras.main.setDeadzone(120, 80);

        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

        this.bindTouchControls();
        this.addHud();
        this.lancerMinuteurNiveau();
        this.preparerFinDeNiveau();
    }

    update() {
        if (!this.hero || !this.hero.body) return;
        if (this.enQuestion || this.niveauFini) return;

        const vitesse = CONFIG.moteur.vitesseHero;
        const wantLeft = this.cursors.left.isDown || this.keyA.isDown || this.touchInput.left;
        const wantRight = this.cursors.right.isDown || this.keyD.isDown || this.touchInput.right;
        const wantJump =
            this.cursors.up.isDown ||
            this.cursors.space.isDown ||
            this.spaceKey.isDown ||
            this.touchInput.jump;

        if (wantLeft && !wantRight) {
            this.hero.setVelocityX(-vitesse);
            this.hero.setFlipX(true);
        } else if (wantRight && !wantLeft) {
            this.hero.setVelocityX(vitesse);
            this.hero.setFlipX(false);
        } else {
            this.hero.setVelocityX(0);
        }

        if (wantJump && this.hero.body.blocked.down) {
            this.hero.setVelocityY(-CONFIG.moteur.impulsionSaut);
        }
    }

    // ---------------- Décor & niveau ----------------

    addBackgroundDecor() {
        const m = CONFIG.moteur;
        for (let x = 100; x < m.largeurMonde; x += 360) {
            const y = Phaser.Math.Between(50, 160);
            this.add.image(x, y, 'cloud').setScrollFactor(0.4).setDepth(-1);
        }
    }

    buildLevel() {
        const m = CONFIG.moteur;
        const groundY = m.hauteurMonde - 24;

        // Sol continu.
        for (let x = 32; x < m.largeurMonde; x += 64) {
            this.platforms.create(x, groundY, 'ground').refreshBody();
        }

        // Plateformes basses (« marches ») accessibles depuis le sol partout
        // dans le niveau — saut max ≈ 130 px, donc top à y ≈ 428 atteignable.
        const lowPlatforms = [
            200, 520, 880, 1240, 1600, 1960, 2320, 2680, 3000
        ];
        lowPlatforms.forEach(x => {
            this.platforms.create(x, 450, 'platform').refreshBody();
        });

        // Plateformes intermédiaires accessibles depuis les marches basses.
        const midPlatforms = [
            380, 720, 1060, 1400, 1740, 2080, 2440, 2800
        ];
        midPlatforms.forEach(x => {
            this.platforms.create(x, 350, 'platform').refreshBody();
        });

        // Plateformes hautes pour les sauts plus aventureux.
        const highPlatforms = [540, 900, 1260, 1620, 1980, 2340, 2700];
        highPlatforms.forEach(x => {
            this.platforms.create(x, 250, 'platform').refreshBody();
        });

        // Blocs « ? » :
        //   - Certains flottent au-dessus pour être frappés par le dessous.
        //   - D'autres sont à hauteur de saut pour être atterris dessus.
        // Chaque bloc a un domaine fixe (« thème ») pour la réactivation.
        const domaines = CONFIG.domainesActifs;
        const questionSpots = [
            { x: 280,  y: 390 },   // accessible : sauter du sol et atterrir dessus
            { x: 460,  y: 290 },   // depuis plateforme mid
            { x: 620,  y: 390 },   // accessible : sauter du sol
            { x: 800,  y: 190 },   // depuis plateforme haute
            { x: 980,  y: 390 },
            { x: 1160, y: 290 },
            { x: 1340, y: 390 },
            { x: 1500, y: 190 },
            { x: 1680, y: 290 },
            { x: 1860, y: 390 },
            { x: 2020, y: 190 },
            { x: 2200, y: 290 },
            { x: 2400, y: 390 },
            { x: 2560, y: 190 },
            { x: 2760, y: 290 },
            { x: 2940, y: 390 }
        ];

        questionSpots.forEach((p, i) => {
            const block = this.questionBlocks.create(p.x, p.y, 'question-block');
            block.refreshBody();
            block.setData('state', 'active');
            block.setData('id', 'qb_' + i);
            block.setData('domaine', domaines[i % domaines.length]);
            block.setData('lastQuestionId', null);
        });
    }

    // ---------------- Collision avec bloc-question ----------------

    onCollisionBlock(hero, block) {
        if (this.enQuestion || this.niveauFini) return;
        if (block.getData('state') !== 'active') return;

        const hitFromBelow = hero.body.blocked.up;
        const landedOnTop  = hero.body.blocked.down && block.body.center.y > hero.body.center.y;

        if (!hitFromBelow && !landedOnTop) return;

        block.setData('state', 'enQuestion');
        this.enQuestion = true;

        // Petit rebond visuel quand frappé par le dessous.
        if (hitFromBelow) {
            const yOrigine = block.y;
            this.tweens.add({
                targets: block,
                y: yOrigine - 6,
                duration: 80,
                yoyo: true,
                onComplete: () => { block.y = yOrigine; block.refreshBody(); }
            });
            hero.setVelocityY(0);
        }

        // Réinitialise les inputs maintenus pour éviter un mouvement parasite
        // au moment où la modale se ferme.
        this.touchInput.left = this.touchInput.right = this.touchInput.jump = false;

        this.afficherQuestion(block);
    }

    afficherQuestion(block) {
        const domaine = block.getData('domaine');
        const exclureId = block.getData('lastQuestionId');
        const question = this.questions.prochaineDuDomaine(domaine, exclureId)
                      || this.questions.prochaine();
        if (!question) {
            block.setData('state', 'active');
            this.enQuestion = false;
            return;
        }

        block.setData('lastQuestionId', question.id);

        this.physics.world.pause();

        this.modale.afficher(question, {
            onTermine: (resultat) => {
                let info;
                if (resultat.correct) {
                    info = this.score.bonneReponse(
                        question.pointsBase,
                        resultat.tempsRestant,
                        question.tempsSec
                    );
                    this.resoudreBloc(block);
                } else {
                    info = this.score.mauvaiseReponse();
                    this.echouerBloc(block);
                }
                this.afficherFloatScore(info);
                this.majHud();
                this.physics.world.resume();
                this.enQuestion = false;
            }
        });
    }

    /** Bonne réponse : le bloc devient gris-brun définitivement. */
    resoudreBloc(block) {
        block.setData('state', 'done');
        block.setTexture('used-block');
        block.refreshBody();
    }

    /** Mauvaise réponse / temps écoulé : bloc gris en cooldown, réactivé plus tard. */
    echouerBloc(block) {
        block.setData('state', 'cooldown');
        block.setTexture('used-block');
        block.refreshBody();

        this.time.delayedCall(CONFIG.delaiReactivationBloc * 1000, () => {
            if (!block.active) return;
            if (block.getData('state') !== 'cooldown') return;
            if (this.niveauFini) return;
            block.setData('state', 'active');
            block.setTexture('question-block');
            block.refreshBody();
        });
    }

    // ---------------- HUD & minuteur du tableau ----------------

    addHud() {
        const styleBase = {
            fontFamily: 'Arial, sans-serif',
            fontSize: '18px',
            color: '#ffffff',
            backgroundColor: 'rgba(0, 0, 0, 0.35)',
            padding: { x: 8, y: 4 }
        };

        this.hudScore    = this.add.text(16, 16, 'Score : 0', styleBase).setScrollFactor(0).setDepth(10);
        this.hudCristaux = this.add.text(16, 44, 'Cristaux : 0 / ' + CONFIG.cristauxRequisParNiveau, styleBase).setScrollFactor(0).setDepth(10);
        this.hudCombo    = this.add.text(16, 72, 'Série : ×1,0', styleBase).setScrollFactor(0).setDepth(10);
        this.hudTemps    = this.add.text(this.scale.width - 16, 16, 'Temps : --:--', {
            ...styleBase, fontSize: '20px'
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(10);

        this.add.text(
            16, this.scale.height - 32,
            'Saute sur un bloc « ? » par-dessous ou pose-toi dessus pour répondre',
            { ...styleBase, fontSize: '14px' }
        ).setScrollFactor(0).setDepth(10);
    }

    majHud() {
        this.hudScore.setText('Score : ' + this.score.score);
        this.hudCristaux.setText('Cristaux : ' + this.score.cristaux + ' / ' + CONFIG.cristauxRequisParNiveau);
        this.hudCombo.setText('Série : ' + this.score.formatCombo());
    }

    lancerMinuteurNiveau() {
        this.tempsRestant = CONFIG.tempsNiveau;
        this.majHudTemps();

        this.timerNiveau = this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => {
                if (this.enQuestion || this.niveauFini) return;
                this.tempsRestant -= 1;
                this.majHudTemps();
                if (this.tempsRestant <= 0) {
                    this.terminerNiveau();
                }
            }
        });
    }

    majHudTemps() {
        const t = Math.max(0, this.tempsRestant);
        const mm = Math.floor(t / 60);
        const ss = t % 60;
        const txt = mm + ':' + (ss < 10 ? '0' : '') + ss;
        this.hudTemps.setText('Temps : ' + txt);
        if (t <= 30) {
            this.hudTemps.setColor('#ffd166');
        }
        if (t <= 10) {
            this.hudTemps.setColor('#ff6b6b');
        }
    }

    // ---------------- Fin de niveau ----------------

    preparerFinDeNiveau() {
        this.endOverlay     = document.getElementById('end-of-level');
        this.endScoreEl     = document.getElementById('end-score');
        this.endCristauxEl  = document.getElementById('end-cristaux');
        this.endQuestionsEl = document.getElementById('end-questions');
        this.endRestartBtn  = document.getElementById('end-restart');

        // Évite d'attacher plusieurs fois si la scène redémarre.
        const nouveauBtn = this.endRestartBtn.cloneNode(true);
        this.endRestartBtn.parentNode.replaceChild(nouveauBtn, this.endRestartBtn);
        this.endRestartBtn = nouveauBtn;

        this.endRestartBtn.addEventListener('click', () => {
            this.endOverlay.hidden = true;
            this.endOverlay.setAttribute('aria-hidden', 'true');
            document.body.classList.remove('modal-open');
            this.scene.restart();
        });
    }

    terminerNiveau() {
        if (this.niveauFini) return;
        this.niveauFini = true;
        if (this.timerNiveau) this.timerNiveau.remove();
        this.hero.setVelocity(0, 0);
        this.physics.world.pause();

        this.endScoreEl.textContent     = this.score.score;
        this.endCristauxEl.textContent  = this.score.cristaux + ' / ' + CONFIG.cristauxRequisParNiveau;
        this.endQuestionsEl.textContent = this.score.questionsTotales;

        this.endOverlay.hidden = false;
        this.endOverlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
    }

    // ---------------- Petits effets ----------------

    afficherFloatScore(info) {
        if (!info || info.gain <= 0) return;
        const txt = this.add.text(
            this.hero.x, this.hero.y - 40,
            '+' + info.gain,
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: '22px',
                color: '#ffe66d',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3
            }
        ).setOrigin(0.5).setDepth(20);

        this.tweens.add({
            targets: txt,
            y: txt.y - 40,
            alpha: 0,
            duration: 900,
            ease: 'Cubic.easeOut',
            onComplete: () => txt.destroy()
        });
    }

    bindTouchControls() {
        const bind = (id, key) => {
            const el = document.getElementById(id);
            if (!el) return;

            const press = (e) => {
                e.preventDefault();
                this.touchInput[key] = true;
                el.classList.add('is-pressed');
            };
            const release = (e) => {
                e.preventDefault();
                this.touchInput[key] = false;
                el.classList.remove('is-pressed');
            };

            el.addEventListener('touchstart', press, { passive: false });
            el.addEventListener('touchend', release, { passive: false });
            el.addEventListener('touchcancel', release, { passive: false });
            el.addEventListener('mousedown', press);
            el.addEventListener('mouseup', release);
            el.addEventListener('mouseleave', release);
        };

        bind('btn-left', 'left');
        bind('btn-right', 'right');
        bind('btn-jump', 'jump');
    }
}

window.LevelScene = LevelScene;
