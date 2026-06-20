/* global Phaser */

// Scène de chargement : génère les textures simples (rectangles colorés)
// pour le héros, le sol, les plateformes et les nuages, puis enchaîne
// sur LevelScene. À mesure que le jeu s'enrichira, on chargera ici les
// sprites et les sons des dossiers assets/.

class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        this.createHeroTexture();
        this.createGroundTexture();
        this.createPlatformTexture();
        this.createCloudTexture();
    }

    create() {
        this.scene.start('LevelScene');
    }

    createHeroTexture() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        // Corps (chandail rouge)
        g.fillStyle(0xe63946, 1);
        g.fillRect(0, 0, 32, 48);
        // Visage
        g.fillStyle(0xffd6a5, 1);
        g.fillRect(6, 4, 20, 14);
        // Salopette
        g.fillStyle(0x1d3557, 1);
        g.fillRect(0, 30, 32, 18);
        // Yeux
        g.fillStyle(0xffffff, 1);
        g.fillRect(11, 8, 4, 4);
        g.fillRect(19, 8, 4, 4);
        g.fillStyle(0x000000, 1);
        g.fillRect(12, 9, 2, 2);
        g.fillRect(20, 9, 2, 2);
        g.generateTexture('hero', 32, 48);
        g.destroy();
    }

    createGroundTexture() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0x2a9d3a, 1);
        g.fillRect(0, 0, 64, 12);
        g.fillStyle(0x8b5a2b, 1);
        g.fillRect(0, 12, 64, 36);
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
        g.fillStyle(0x9b6b3d, 1);
        g.fillRect(0, 0, 96, 24);
        g.fillStyle(0x6f4a26, 1);
        g.fillRect(0, 20, 96, 4);
        g.fillStyle(0x2a9d3a, 1);
        g.fillRect(0, 0, 96, 6);
        g.generateTexture('platform', 96, 24);
        g.destroy();
    }

    createCloudTexture() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        g.fillStyle(0xffffff, 0.9);
        g.fillCircle(20, 20, 18);
        g.fillCircle(40, 16, 22);
        g.fillCircle(60, 22, 18);
        g.fillRect(18, 18, 44, 14);
        g.generateTexture('cloud', 80, 40);
        g.destroy();
    }
}

window.BootScene = BootScene;
