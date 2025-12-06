import { type GameObjects, Scene } from 'phaser';

import { EventBus } from '../EventBus';

export class MainMenu extends Scene
{
    background!: GameObjects.Image;

    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        // Subtle background for the menu - the Svelte overlay will handle the UI
        this.cameras.main.setBackgroundColor(0x1a1a2e);
        
        // Add some subtle background elements
        this.background = this.add.image(512, 384, 'background');
        this.background.setAlpha(0.3);
        this.background.setTint(0x4a4a6e);

        EventBus.emit('current-scene-ready', this);
    }
    
    changeScene ()
    {
        this.scene.start('Game');
    }
}
