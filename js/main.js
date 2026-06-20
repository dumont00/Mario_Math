/* global Phaser, CONFIG, BootScene, MenuScene, LevelScene, ResultScene */

(function () {
    'use strict';

    const config = {
        type: Phaser.AUTO,
        parent: 'phaser-game',
        backgroundColor: '#5dc1ff',
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: 960,
            height: 540
        },
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: CONFIG.moteur.gravite },
                debug: false
            }
        },
        scene: [BootScene, MenuScene, LevelScene, ResultScene]
    };

    window.game = new Phaser.Game(config);
})();
