/* global Phaser */

// Écran de lancement minimal : choix entre l'aventure (niveaux 1 à 20)
// et l'entraînement aux tables de multiplication.
// Phase 4 remplacera cet écran par une vraie carte des mondes.

class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        // Décor de fond simple, pour que ce ne soit pas vide derrière la modale.
        this.cameras.main.setBackgroundColor('#5dc1ff');
        const w = this.scale.width, h = this.scale.height;
        for (let i = 0; i < 5; i++) {
            this.add.image(
                Phaser.Math.Between(40, w - 40),
                Phaser.Math.Between(40, h - 200),
                'cloud'
            ).setAlpha(0.9);
        }

        const overlay = document.getElementById('menu-screen');
        const btnAv   = document.getElementById('menu-btn-aventure');
        const btnMu   = document.getElementById('menu-btn-mult');
        const btnDf   = document.getElementById('menu-btn-defi');
        const btnOr   = document.getElementById('menu-btn-ortho');

        // Reset des écouteurs (clones).
        const av = btnAv.cloneNode(true); btnAv.parentNode.replaceChild(av, btnAv);
        const mu = btnMu.cloneNode(true); btnMu.parentNode.replaceChild(mu, btnMu);
        const df = btnDf.cloneNode(true); btnDf.parentNode.replaceChild(df, btnDf);
        const or = btnOr.cloneNode(true); btnOr.parentNode.replaceChild(or, btnOr);

        av.addEventListener('click', () => {
            this._fermer(overlay);
            this.scene.start('LevelScene', { niveau: 1, mode: 'aventure' });
        });
        mu.addEventListener('click', () => {
            this._fermer(overlay);
            this.scene.start('LevelScene', { mode: 'mult' });
        });
        df.addEventListener('click', () => {
            this._fermer(overlay);
            this.scene.start('DefiScene', { defiLevel: 1 });
        });
        or.addEventListener('click', () => {
            this._fermer(overlay);
            this.scene.start('LevelScene', { mode: 'orthographe' });
        });

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

window.MenuScene = MenuScene;
