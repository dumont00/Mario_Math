/* global Phaser, CONFIG, ScoreManager, QuestionManager, QuestionModal */

// Phase 2 — Blocs-questions et modale. Le héros frappe un bloc « ? » par
// le dessous, le jeu se met en pause, une question chronométrée s'ouvre,
// puis le score et le combo se mettent à jour selon Specifications §9.

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
    }

    update() {
        if (!this.hero || !this.hero.body) return;
        if (this.enQuestion) return;

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

        for (let x = 32; x < m.largeurMonde; x += 64) {
            this.platforms.create(x, groundY, 'ground').refreshBody();
        }

        const platformSpots = [
            { x: 280, y: 420 },
            { x: 460, y: 360 },
            { x: 640, y: 300 },
            { x: 880, y: 360 },
            { x: 1080, y: 280 },
            { x: 1280, y: 380 },
            { x: 1500, y: 320 },
            { x: 1720, y: 260 },
            { x: 1940, y: 360 },
            { x: 2180, y: 300 },
            { x: 2400, y: 380 },
            { x: 2620, y: 320 },
            { x: 2860, y: 260 },
            { x: 3060, y: 360 }
        ];
        platformSpots.forEach(p => {
            this.platforms.create(p.x, p.y, 'platform').refreshBody();
        });

        // Blocs « ? » placés à hauteur de saut, suffisamment espacés.
        const questionSpots = [
            { x: 220, y: 350 },
            { x: 540, y: 280 },
            { x: 780, y: 220 },
            { x: 1180, y: 200 },
            { x: 1380, y: 300 },
            { x: 1620, y: 240 },
            { x: 1840, y: 180 },
            { x: 2080, y: 230 },
            { x: 2300, y: 300 },
            { x: 2520, y: 240 },
            { x: 2760, y: 180 },
            { x: 2960, y: 200 }
        ];
        questionSpots.forEach((p, i) => {
            const block = this.questionBlocks.create(p.x, p.y, 'question-block');
            block.refreshBody();
            block.setData('used', false);
            block.setData('id', 'qb_' + i);
        });
    }

    // ---------------- Collision avec bloc-question ----------------

    onCollisionBlock(hero, block) {
        if (this.enQuestion) return;
        if (block.getData('used')) return;
        // Frappe par le dessous : la tête du héros touche le bloc.
        if (!hero.body.blocked.up) return;

        block.setData('used', true);
        this.enQuestion = true;

        // Petit rebond visuel : le bloc se soulève brièvement.
        const yOrigine = block.y;
        this.tweens.add({
            targets: block,
            y: yOrigine - 6,
            duration: 80,
            yoyo: true,
            onComplete: () => {
                block.y = yOrigine;
                block.setTexture('used-block');
                block.refreshBody();
            }
        });

        // Coupe la vitesse verticale pour éviter que le héros traverse.
        hero.setVelocityY(0);

        // Réinitialise les inputs maintenus pour ne pas s'envoler après reprise.
        this.touchInput.left = this.touchInput.right = this.touchInput.jump = false;

        this.afficherQuestion();
    }

    afficherQuestion() {
        const question = this.questions.prochaine();
        if (!question) {
            this.enQuestion = false;
            return;
        }

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
                } else {
                    info = this.score.mauvaiseReponse();
                }
                this.afficherFloatScore(info);
                this.majHud();
                this.physics.world.resume();
                this.enQuestion = false;
            }
        });
    }

    // ---------------- HUD ----------------

    addHud() {
        const styleBase = {
            fontFamily: 'Arial, sans-serif',
            fontSize: '18px',
            color: '#ffffff',
            backgroundColor: 'rgba(0, 0, 0, 0.35)',
            padding: { x: 8, y: 4 }
        };

        this.hudScore = this.add.text(16, 16, 'Score : 0', styleBase)
            .setScrollFactor(0).setDepth(10);
        this.hudCristaux = this.add.text(16, 44, 'Cristaux : 0 / ' + CONFIG.cristauxRequisParNiveau, styleBase)
            .setScrollFactor(0).setDepth(10);
        this.hudCombo = this.add.text(16, 72, 'Série : ×1,0', styleBase)
            .setScrollFactor(0).setDepth(10);

        this.add.text(
            16, this.scale.height - 32,
            'Saute sur un bloc « ? » pour répondre à une question',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: '14px',
                color: '#ffffff',
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                padding: { x: 8, y: 4 }
            }
        ).setScrollFactor(0).setDepth(10);
    }

    majHud() {
        this.hudScore.setText('Score : ' + this.score.score);
        this.hudCristaux.setText('Cristaux : ' + this.score.cristaux + ' / ' + CONFIG.cristauxRequisParNiveau);
        this.hudCombo.setText('Série : ' + this.score.formatCombo());
    }

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
