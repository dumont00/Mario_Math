/* global Phaser, CONFIG, ScoreManager, QuestionManager, QuestionModal */

// Phase 3 — Niveau complet :
//   - Numéro de niveau (1..20) → mélange de paliers (CLAUDE.md §7).
//   - Charge la banque depuis le cache JSON (BootScene).
//   - Portail de fin qui s'ouvre quand CONFIG.cristauxRequisParNiveau
//     cristaux sont récoltés ; entrer dedans → ResultScene.
//   - Bloc raté → cooldown puis réactivé avec une nouvelle question du même
//     domaine (CONFIG.delaiReactivationBloc).
//   - Minuteur du tableau (CONFIG.tempsNiveau) ; à 0 → ResultScene.

class LevelScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LevelScene' });

        this.touchInput = { left: false, right: false, jump: false };
    }

    init(data) {
        this.niveau = (data && data.niveau) || 1;
    }

    create() {
        const m = CONFIG.moteur;

        this.physics.world.setBounds(0, 0, m.largeurMonde, m.hauteurMonde);

        const banque = this.cache.json.get('questions') || [];
        if (banque.length === 0) {
            console.warn('Banque de questions vide ou non chargée.');
        }

        this.score     = new ScoreManager();
        this.questions = new QuestionManager(banque, {
            niveau: this.niveau,
            domainesActifs: CONFIG.domainesActifs,
            adaptatif: CONFIG.adaptatif
        });
        this.modale    = new QuestionModal();
        this.enQuestion   = false;
        this.niveauFini   = false;
        this.portailOuvert = false;

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

        // Portail (overlap, pas un mur).
        this.portail = this.physics.add.staticSprite(m.largeurMonde - 60, groundTopY - 55, 'portail-ferme');
        this.portail.body.setSize(40, 80);
        this.physics.add.overlap(this.hero, this.portail, () => this.tenterEntreePortail());

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

        for (let x = 32; x < m.largeurMonde; x += 64) {
            this.platforms.create(x, groundY, 'ground').refreshBody();
        }

        // Plateformes basses accessibles depuis le sol (saut ≈ 130 px).
        const lowPlatforms = [200, 520, 880, 1240, 1600, 1960, 2320, 2680, 3000];
        lowPlatforms.forEach(x => this.platforms.create(x, 450, 'platform').refreshBody());

        const midPlatforms = [380, 720, 1060, 1400, 1740, 2080, 2440, 2800];
        midPlatforms.forEach(x => this.platforms.create(x, 350, 'platform').refreshBody());

        const highPlatforms = [540, 900, 1260, 1620, 1980, 2340, 2700];
        highPlatforms.forEach(x => this.platforms.create(x, 250, 'platform').refreshBody());

        // Blocs « ? » : chaque bloc a un domaine fixe (thème), répété cycliquement.
        const domaines = CONFIG.domainesActifs;
        const questionSpots = [
            { x: 280,  y: 390 },
            { x: 460,  y: 290 },
            { x: 620,  y: 390 },
            { x: 800,  y: 190 },
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

    // ---------------- Blocs-questions ----------------

    onCollisionBlock(hero, block) {
        if (this.enQuestion || this.niveauFini) return;
        if (block.getData('state') !== 'active') return;

        const hitFromBelow = hero.body.blocked.up;
        const landedOnTop  = hero.body.blocked.down && block.body.center.y > hero.body.center.y;
        if (!hitFromBelow && !landedOnTop) return;

        block.setData('state', 'enQuestion');
        this.enQuestion = true;

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
                    info = this.score.bonneReponse(question, resultat.tempsRestant);
                    this.resoudreBloc(block);
                } else {
                    info = this.score.mauvaiseReponse(question);
                    this.echouerBloc(block);
                }
                this.questions.enregistrerResultat(
                    question.domaine, resultat.correct,
                    resultat.tempsRestant, question.tempsSec
                );

                this.afficherFloatScore(info);
                this.majHud();
                this.majPortail();

                this.physics.world.resume();
                this.enQuestion = false;
            }
        });
    }

    resoudreBloc(block) {
        block.setData('state', 'done');
        block.setTexture('used-block');
        block.refreshBody();
    }

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

    // ---------------- Portail ----------------

    majPortail() {
        if (!this.portailOuvert && this.score.cristaux >= CONFIG.cristauxRequisParNiveau) {
            this.portailOuvert = true;
            this.portail.setTexture('portail-ouvert');
            this.tweens.add({
                targets: this.portail,
                alpha: { from: 0.4, to: 1 },
                duration: 600,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1
            });

            // Petite annonce.
            const ann = this.add.text(
                this.scale.width / 2, 110,
                'Le portail est ouvert ! Cours vers la droite →',
                {
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '22px',
                    color: '#fff',
                    backgroundColor: 'rgba(78, 167, 239, 0.85)',
                    padding: { x: 14, y: 8 },
                    fontStyle: 'bold'
                }
            ).setOrigin(0.5).setScrollFactor(0).setDepth(20);
            this.tweens.add({
                targets: ann, alpha: 0, delay: 2500, duration: 600,
                onComplete: () => ann.destroy()
            });
        }
    }

    tenterEntreePortail() {
        if (!this.portailOuvert || this.niveauFini || this.enQuestion) return;
        this.terminerNiveau({ succes: true });
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

        this.hudNiveau   = this.add.text(16, 16, 'Niveau ' + this.niveau, { ...styleBase, fontStyle: 'bold' })
            .setScrollFactor(0).setDepth(10);
        this.hudScore    = this.add.text(16, 44, 'Score : 0', styleBase).setScrollFactor(0).setDepth(10);
        this.hudCristaux = this.add.text(16, 72, 'Cristaux : 0 / ' + CONFIG.cristauxRequisParNiveau, styleBase)
            .setScrollFactor(0).setDepth(10);
        this.hudCombo    = this.add.text(16, 100, 'Série : ×1,0', styleBase).setScrollFactor(0).setDepth(10);
        this.hudTemps    = this.add.text(this.scale.width - 16, 16, 'Temps : --:--',
            { ...styleBase, fontSize: '20px' }
        ).setOrigin(1, 0).setScrollFactor(0).setDepth(10);

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
                    this.terminerNiveau({ succes: false, tempsEcoule: true });
                }
            }
        });
    }

    majHudTemps() {
        const t = Math.max(0, this.tempsRestant);
        const mm = Math.floor(t / 60);
        const ss = t % 60;
        this.hudTemps.setText('Temps : ' + mm + ':' + (ss < 10 ? '0' : '') + ss);
        if (t <= 30) this.hudTemps.setColor('#ffd166');
        if (t <= 10) this.hudTemps.setColor('#ff6b6b');
    }

    // ---------------- Fin de niveau ----------------

    terminerNiveau({ succes = false, tempsEcoule = false } = {}) {
        if (this.niveauFini) return;
        this.niveauFini = true;
        if (this.timerNiveau) this.timerNiveau.remove();
        this.hero.setVelocity(0, 0);
        this.physics.world.pause();

        this.scene.start('ResultScene', {
            niveau:           this.niveau,
            score:            this.score.score,
            cristaux:         this.score.cristaux,
            cristauxRequis:   CONFIG.cristauxRequisParNiveau,
            questionsTotales: this.score.questionsTotales,
            etoiles:          this.score.etoiles(),
            recap:            this.score.recapDomaines(),
            succes,
            tempsEcoule
        });
    }

    // ---------------- Effets ----------------

    afficherFloatScore(info) {
        if (!info || info.gain <= 0) return;
        const txt = this.add.text(
            this.hero.x, this.hero.y - 40,
            '+' + info.gain,
            {
                fontFamily: 'Arial, sans-serif', fontSize: '22px',
                color: '#ffe66d', fontStyle: 'bold',
                stroke: '#000000', strokeThickness: 3
            }
        ).setOrigin(0.5).setDepth(20);

        this.tweens.add({
            targets: txt, y: txt.y - 40, alpha: 0,
            duration: 900, ease: 'Cubic.easeOut',
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
