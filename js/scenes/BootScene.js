/* global Phaser */

// Scène de chargement : charge la banque de questions et génère les
// textures simples (rectangles colorés) pour le héros, le sol, les
// plateformes, les nuages, les blocs « ? » et le portail.

class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Banque de questions.
        this.load.json('questions', 'data/questions.json');

        // Indique un éventuel échec de chargement (utile pour debugging).
        this.load.on('loaderror', (file) => {
            console.warn('Échec du chargement :', file.key, file.src);
        });

        this.createHeroTexture();
        this.createGroundTexture();
        this.createPlatformTexture();
        this.createCloudTexture();
        this.createQuestionBlockTexture();
        this.createUsedBlockTexture();
        this.createPortalClosedTexture();
        this.createPortalOpenTexture();
    }

    create() {
        this.scene.start('LevelScene', { niveau: 1 });
    }

    // --- Textures générées par primitives Phaser ---

    createHeroTexture() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xe63946, 1); g.fillRect(0, 0, 32, 48);
        g.fillStyle(0xffd6a5, 1); g.fillRect(6, 4, 20, 14);
        g.fillStyle(0x1d3557, 1); g.fillRect(0, 30, 32, 18);
        g.fillStyle(0xffffff, 1);
        g.fillRect(11, 8, 4, 4); g.fillRect(19, 8, 4, 4);
        g.fillStyle(0x000000, 1);
        g.fillRect(12, 9, 2, 2); g.fillRect(20, 9, 2, 2);
        g.generateTexture('hero', 32, 48);
        g.destroy();
    }

    createGroundTexture() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x2a9d3a, 1); g.fillRect(0, 0, 64, 12);
        g.fillStyle(0x8b5a2b, 1); g.fillRect(0, 12, 64, 36);
        g.fillStyle(0x6b4423, 1);
        for (let i = 0; i < 4; i++) {
            g.fillRect(i * 16 + 2, 18, 12, 4);
            g.fillRect(i * 16 + 6, 30, 8, 4);
        }
        g.generateTexture('ground', 64, 48);
        g.destroy();
    }

    createPlatformTexture() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x9b6b3d, 1); g.fillRect(0, 0, 96, 24);
        g.fillStyle(0x6f4a26, 1); g.fillRect(0, 20, 96, 4);
        g.fillStyle(0x2a9d3a, 1); g.fillRect(0, 0, 96, 6);
        g.generateTexture('platform', 96, 24);
        g.destroy();
    }

    createCloudTexture() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xffffff, 0.9);
        g.fillCircle(20, 20, 18); g.fillCircle(40, 16, 22); g.fillCircle(60, 22, 18);
        g.fillRect(18, 18, 44, 14);
        g.generateTexture('cloud', 80, 40);
        g.destroy();
    }

    createQuestionBlockTexture() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x8a5a1c, 1); g.fillRect(0, 0, 40, 40);
        g.fillStyle(0xf6c244, 1); g.fillRect(3, 3, 34, 34);
        g.fillStyle(0xa56f23, 1);
        g.fillRect(4, 4, 4, 4); g.fillRect(32, 4, 4, 4);
        g.fillRect(4, 32, 4, 4); g.fillRect(32, 32, 4, 4);
        g.fillStyle(0xffffff, 1);
        g.fillRect(15, 11, 10, 4);
        g.fillRect(23, 13, 4, 6);
        g.fillRect(19, 17, 8, 4);
        g.fillRect(19, 19, 4, 6);
        g.fillRect(19, 28, 4, 4);
        g.generateTexture('question-block', 40, 40);
        g.destroy();
    }

    createUsedBlockTexture() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x6e5a3c, 1); g.fillRect(0, 0, 40, 40);
        g.fillStyle(0x8a7250, 1); g.fillRect(3, 3, 34, 34);
        g.fillStyle(0x5d4a30, 1);
        g.fillRect(4, 4, 4, 4); g.fillRect(32, 4, 4, 4);
        g.fillRect(4, 32, 4, 4); g.fillRect(32, 32, 4, 4);
        g.generateTexture('used-block', 40, 40);
        g.destroy();
    }

    createPortalClosedTexture() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        // Cadre pierre.
        g.fillStyle(0x5d6478, 1); g.fillRect(0, 0, 64, 110);
        g.fillStyle(0x3a4055, 1); g.fillRect(6, 6, 52, 98);
        // Cadenas central.
        g.fillStyle(0xc0c0c0, 1); g.fillRect(24, 48, 16, 18);
        g.lineStyle(3, 0xc0c0c0, 1); g.strokeCircle(32, 44, 8);
        g.fillStyle(0x2a2f40, 1); g.fillRect(30, 54, 4, 6);
        g.generateTexture('portail-ferme', 64, 110);
        g.destroy();
    }

    createPortalOpenTexture() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        // Cadre lumineux.
        g.fillStyle(0xa0d8ff, 1); g.fillRect(0, 0, 64, 110);
        // Aura.
        g.fillStyle(0x70bfff, 1); g.fillRect(6, 6, 52, 98);
        g.fillStyle(0x4ea7ef, 1); g.fillRect(14, 14, 36, 82);
        g.fillStyle(0xffffff, 1);
        // Petites étoiles
        g.fillRect(20, 30, 3, 3);
        g.fillRect(40, 50, 3, 3);
        g.fillRect(28, 70, 3, 3);
        g.fillRect(44, 80, 2, 2);
        g.fillRect(18, 60, 2, 2);
        g.generateTexture('portail-ouvert', 64, 110);
        g.destroy();
    }
}

window.BootScene = BootScene;
