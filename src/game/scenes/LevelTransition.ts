import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

export class LevelTransition extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    levelText: Phaser.GameObjects.Text;
    levelNumber: number = 1;

    constructor ()
    {
        super('LevelTransition');
    }

    init (data: { levelNumber: number })
    {
        this.levelNumber = data.levelNumber || 1;
    }

    create ()
    {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x1a1a2e);

        // Display level number
        this.levelText = this.add.text(512, 384, `Level ${this.levelNumber}`, {
            fontFamily: 'Arial Black', fontSize: 72, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);

        // Fade in animation
        this.levelText.setAlpha(0);
        this.tweens.add({
            targets: this.levelText,
            alpha: 1,
            duration: 300,
            ease: 'Power2'
        });

        // Wait a moment to show the level number, then transition to game
        // The game will generate the new level when it starts
        this.time.delayedCall(1500, () => {
            this.scene.start('Game', { levelNumber: this.levelNumber });
        });

        EventBus.emit('current-scene-ready', this);
    }
}

