/* global Phaser, CONFIG, ScoreManager, QuestionManager, QuestionModal */

// LevelScene — joue un niveau de plateforme.
// Deux modes :
//   - 'aventure' : niveaux 1 à 20 (mélange de paliers selon CLAUDE.md §7),
//     16 blocs « ? » de domaines variés. Le portail s'ouvre quand TOUS
//     les blocs ont été résolus.
//   - 'mult'     : entraînement aux tables de multiplication. Monde
//     élargi, 30 blocs, banque filtrée sur le sous-domaine
//     « Tables de multiplication ». Portail à 30 blocs résolus.

class LevelScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LevelScene' });

        this.touchInput = { left: false, right: false, jump: false };
    }

    init(data) {
        data = data || {};
        this.mode   = data.mode || 'aventure';
        this.niveau = data.niveau || 1;
        // Le mode entraînement utilise un monde plus large pour héberger 30 blocs.
        this.largeurMonde = this.mode === 'mult' ? 5600 : CONFIG.moteur.largeurMonde;
        // Pas de minuteur en entraînement (l'objectif est la maîtrise, pas la vitesse).
        this.tempsNiveauTotal = this.mode === 'mult' ? null : CONFIG.tempsNiveau;
    }

    create() {
        const m = CONFIG.moteur;

        this.physics.world.setBounds(0, 0, this.largeurMonde, m.hauteurMonde);

        const banque = this.cache.json.get('questions') || [];
        if (banque.length === 0) {
            console.warn('Banque de questions vide ou non chargée.');
        }

        this.score     = new ScoreManager();
        this.questions = new QuestionManager(banque, {
            niveau:         this.niveau,
            domainesActifs: this.mode === 'mult' ? ['Arithmétique'] : CONFIG.domainesActifs,
            sousDomaines:   this.mode === 'mult' ? ['Tables de multiplication'] : null,
            adaptatif:      CONFIG.adaptatif
        });
        this.modale       = new QuestionModal();
        this.enQuestion   = false;
        this.niveauFini   = false;
        this.portailOuvert = false;
        this.timerNiveau  = null;

        this.addBackgroundDecor();

        this.platforms = this.physics.add.staticGroup();
        this.questionBlocks = this.physics.add.staticGroup();
        this.buildLevel();

        this.totalBlocs = this.questionBlocks.getChildren().length;

        const groundTopY = m.hauteurMonde - 48;
        this.hero = this.physics.add.sprite(80, groundTopY - 30, 'hero');
        this.hero.setCollideWorldBounds(true);
        this.hero.setMaxVelocity(m.vitesseHero, 1400);
        this.hero.body.setSize(28, 44).setOffset(2, 2);

        this.physics.add.collider(this.hero, this.platforms);
        this.physics.add.collider(
            this.hero, this.questionBlocks,
            (hero, block) => this.onCollisionBlock(hero, block),
            null, this
        );

        // Portail à l'extrémité droite.
        this.portail = this.physics.add.staticSprite(this.largeurMonde - 60, groundTopY - 55, 'portail-ferme');
        this.portail.body.setSize(40, 80);
        this.physics.add.overlap(this.hero, this.portail, () => this.tenterEntreePortail());

        this.cameras.main.setBounds(0, 0, this.largeurMonde, m.hauteurMonde);
        this.cameras.main.startFollow(this.hero, true, 0.12, 0.12);
        this.cameras.main.setDeadzone(120, 80);

        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

        this.bindTouchControls();
        this.addHud();
        if (this.tempsNiveauTotal !== null) {
            this.lancerMinuteurNiveau();
        }
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

    // ---------------- Décor & construction du niveau ----------------

    addBackgroundDecor() {
        for (let x = 100; x < this.largeurMonde; x += 360) {
            const y = Phaser.Math.Between(50, 160);
            this.add.image(x, y, 'cloud').setScrollFactor(0.4).setDepth(-1);
        }
    }

    buildLevel() {
        const m = CONFIG.moteur;
        const groundY = m.hauteurMonde - 24;

        for (let x = 32; x < this.largeurMonde; x += 64) {
            this.platforms.create(x, groundY, 'ground').refreshBody();
        }

        if (this.mode === 'mult') {
            this._buildMultLevel();
        } else {
            this._buildAventureLevel();
        }
    }

    _buildAventureLevel() {
        // Plateformes basses (« marches ») accessibles depuis le sol.
        const lowPlatforms = [200, 520, 880, 1240, 1600, 1960, 2320, 2680, 3000];
        lowPlatforms.forEach(x => this.platforms.create(x, 450, 'platform').refreshBody());

        const midPlatforms = [380, 720, 1060, 1400, 1740, 2080, 2440, 2800];
        midPlatforms.forEach(x => this.platforms.create(x, 350, 'platform').refreshBody());

        const highPlatforms = [540, 900, 1260, 1620, 1980, 2340, 2700];
        highPlatforms.forEach(x => this.platforms.create(x, 250, 'platform').refreshBody());

        const domaines = CONFIG.domainesActifs;
        const questionSpots = [
            { x: 280,  y: 390 }, { x: 460,  y: 290 }, { x: 620,  y: 390 },
            { x: 800,  y: 190 }, { x: 980,  y: 390 }, { x: 1160, y: 290 },
            { x: 1340, y: 390 }, { x: 1500, y: 190 }, { x: 1680, y: 290 },
            { x: 1860, y: 390 }, { x: 2020, y: 190 }, { x: 2200, y: 290 },
            { x: 2400, y: 390 }, { x: 2560, y: 190 }, { x: 2760, y: 290 },
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

    _buildMultLevel() {
        // Monde élargi : plateformes régulières tous les ~320 px en marches,
        // ~340 mid, ~360 high, sur toute la largeur (5600 px).
        const step = 320;
        for (let x = 200; x < this.largeurMonde - 200; x += step) {
            this.platforms.create(x, 450, 'platform').refreshBody();
        }
        for (let x = 380; x < this.largeurMonde - 200; x += 340) {
            this.platforms.create(x, 350, 'platform').refreshBody();
        }
        for (let x = 540; x < this.largeurMonde - 200; x += 360) {
            this.platforms.create(x, 250, 'platform').refreshBody();
        }

        // 30 blocs « ? » disposés en alternance de hauteurs (391, 291, 191).
        const hauteurs = [390, 290, 190];
        const nbBlocs = 30;
        const start = 260;
        const ecart = (this.largeurMonde - 320 - start) / (nbBlocs - 1);
        for (let i = 0; i < nbBlocs; i++) {
            const x = Math.round(start + i * ecart);
            const y = hauteurs[i % hauteurs.length];
            const block = this.questionBlocks.create(x, y, 'question-block');
            block.refreshBody();
            block.setData('state', 'active');
            block.setData('id', 'qb_' + i);
            block.setData('domaine', 'Arithmétique');
            block.setData('lastQuestionId', null);
        }
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
                targets: block, y: yOrigine - 6, duration: 80, yoyo: true,
                onComplete: () => { block.y = yOrigine; block.refreshBody(); }
            });
            hero.setVelocityY(0);
        }

        this.touchInput.left = this.touchInput.right = this.touchInput.jump = false;
        this.afficherQuestion(block);
    }

    afficherQuestion(block) {
        const domaine   = block.getData('domaine');
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

    blocsResolus() {
        let n = 0;
        this.questionBlocks.getChildren().forEach(b => {
            if (b.getData('state') === 'done') n += 1;
        });
        return n;
    }

    majPortail() {
        if (this.portailOuvert) return;
        if (this.blocsResolus() < this.totalBlocs) return;

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

        const ann = this.add.text(
            this.scale.width / 2, 110,
            'Bravo ! Le portail est ouvert — cours vers la droite →',
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
            targets: ann, alpha: 0, delay: 2800, duration: 600,
            onComplete: () => ann.destroy()
        });
    }

    tenterEntreePortail() {
        if (!this.portailOuvert || this.niveauFini || this.enQuestion) return;
        this.terminerNiveau({ succes: true });
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

        const titre = this.mode === 'mult'
            ? 'Tables de multiplication'
            : 'Niveau ' + this.niveau;

        this.hudNiveau   = this.add.text(16, 16, titre, { ...styleBase, fontStyle: 'bold' })
            .setScrollFactor(0).setDepth(10);
        this.hudScore    = this.add.text(16, 44, 'Score : 0', styleBase).setScrollFactor(0).setDepth(10);
        this.hudCristaux = this.add.text(16, 72, 'Réussies : 0 / ' + this.totalBlocs, styleBase)
            .setScrollFactor(0).setDepth(10);
        this.hudCombo    = this.add.text(16, 100, 'Série : ×1,0', styleBase).setScrollFactor(0).setDepth(10);

        if (this.tempsNiveauTotal !== null) {
            this.hudTemps = this.add.text(this.scale.width - 16, 16, 'Temps : --:--',
                { ...styleBase, fontSize: '20px' }
            ).setOrigin(1, 0).setScrollFactor(0).setDepth(10);
        }

        const aide = this.mode === 'mult'
            ? 'Réponds aux 30 multiplications pour ouvrir le portail'
            : 'Réponds à toutes les questions pour ouvrir le portail';
        this.add.text(
            16, this.scale.height - 32, aide,
            { ...styleBase, fontSize: '14px' }
        ).setScrollFactor(0).setDepth(10);
    }

    majHud() {
        this.hudScore.setText('Score : ' + this.score.score);
        this.hudCristaux.setText('Réussies : ' + this.blocsResolus() + ' / ' + this.totalBlocs);
        this.hudCombo.setText('Série : ' + this.score.formatCombo());
    }

    // ---------------- Minuteur (mode aventure seulement) ----------------

    lancerMinuteurNiveau() {
        this.tempsRestant = this.tempsNiveauTotal;
        this.majHudTemps();

        this.timerNiveau = this.time.addEvent({
            delay: 1000, loop: true,
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
        if (!this.hudTemps) return;
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
            mode:             this.mode,
            niveau:           this.niveau,
            score:            this.score.score,
            cristaux:         this.score.cristaux,
            cristauxRequis:   this.totalBlocs,
            questionsTotales: this.score.questionsTotales,
            etoiles:          this.score.etoiles(),
            recap:            this.score.recapDomaines(),
            succes,
            tempsEcoule
        });
    }

    // ---------------- Effets & contrôles tactiles ----------------

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
