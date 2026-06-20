/* global Phaser, CONFIG */

// Phase 1 — Moteur de base : un héros court et saute, entre en collision
// avec le sol et des plateformes, et la caméra le suit. Les blocs-questions,
// la modale, la sauvegarde et la pédagogie arriveront dans les phases
// suivantes (voir Specifications §18).

class LevelScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LevelScene' });

        this.touchInput = { left: false, right: false, jump: false };
    }

    create() {
        const m = CONFIG.moteur;

        this.physics.world.setBounds(0, 0, m.largeurMonde, m.hauteurMonde);

        this.addBackgroundDecor();

        this.platforms = this.physics.add.staticGroup();
        this.buildLevel();

        const groundTopY = m.hauteurMonde - 48;
        this.hero = this.physics.add.sprite(80, groundTopY - 30, 'hero');
        this.hero.setCollideWorldBounds(true);
        this.hero.setMaxVelocity(m.vitesseHero, 1400);
        this.hero.body.setSize(28, 44).setOffset(2, 2);

        this.physics.add.collider(this.hero, this.platforms);

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

    addBackgroundDecor() {
        const m = CONFIG.moteur;
        for (let x = 100; x < m.largeurMonde; x += 360) {
            const y = Phaser.Math.Between(50, 160);
            this.add.image(x, y, 'cloud').setScrollFactor(0.4).setDepth(-1);
        }
    }

    buildLevel() {
        const m = CONFIG.moteur;
        const groundY = m.hauteurMonde - 24; // sol = 48 px de haut, centré

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
    }

    addHud() {
        const hint = this.add.text(
            16,
            16,
            'Flèches ou ◀ ▶ pour bouger — Espace ou SAUT pour sauter',
            {
                fontFamily: 'Arial, sans-serif',
                fontSize: '16px',
                color: '#ffffff',
                backgroundColor: 'rgba(0, 0, 0, 0.35)',
                padding: { x: 8, y: 4 }
            }
        );
        hint.setScrollFactor(0).setDepth(10);
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
