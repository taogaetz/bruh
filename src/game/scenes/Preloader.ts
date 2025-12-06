import { Scene } from 'phaser';

export class Preloader extends Scene {
    constructor() {
        super('Preloader');
    }

    init() {
        //  We loaded this image in our Boot Scene, so we can display it here
        this.add.image(512, 384, 'background');

        //  A simple progress bar. This is the outline of the bar.
        this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

        //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
        const bar = this.add.rectangle(512 - 230, 384, 4, 28, 0xffffff);

        //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
        this.load.on('progress', (progress: number) => {

            //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
            bar.width = 4 + (460 * progress);

        });
    }

    preload() {
        //  Load the assets for the game - Replace with your own assets
        this.load.setPath('assets');

        this.load.image('logo', 'logo.png');
        this.load.image('star', 'star.png');
    }

    create() {
        //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
        //  For example, you can define global animations here, so we can use them in other scenes.

        //  Create placeholder sprites for the game
        //  Player sprite (16x24 pixels, brown color)
        const playerGraphics = this.add.graphics();
        playerGraphics.fillStyle(0x8B4513); // Brown
        playerGraphics.fillRect(0, 0, 16, 24);
        playerGraphics.generateTexture('player', 16, 24);
        playerGraphics.destroy();

        //  Platform/ground sprite (32x32 pixels, gray color) - keeping for backwards compatibility
        const platformGraphics = this.add.graphics();
        platformGraphics.fillStyle(0x808080); // Gray
        platformGraphics.fillRect(0, 0, 32, 32);
        platformGraphics.generateTexture('platform', 32, 32);
        platformGraphics.destroy();

        //  Create tile sprites for the level
        const TILE_SIZE = 32;

        //  Create a single tileset texture
        //  Width = 6 * 32 (Empty, Dirt, Stone, Grass, Dirt Gold, Stone Gold)
        //  Height = 32
        const tilesetGraphics = this.add.graphics();

        // 1. Dirt (Index 1, x=32)
        tilesetGraphics.fillStyle(0x8B4513); // Brown
        tilesetGraphics.fillRect(32, 0, TILE_SIZE, TILE_SIZE);
        tilesetGraphics.lineStyle(2, 0x654321);
        tilesetGraphics.strokeRect(32, 0, TILE_SIZE, TILE_SIZE);
        tilesetGraphics.lineStyle(1, 0x654321);
        tilesetGraphics.moveTo(32 + 16, 0);
        tilesetGraphics.lineTo(32 + 16, TILE_SIZE);
        tilesetGraphics.moveTo(32, 16);
        tilesetGraphics.lineTo(32 + TILE_SIZE, 16);

        // 2. Stone (Index 2, x=64)
        tilesetGraphics.fillStyle(0x696969); // Dark gray
        tilesetGraphics.fillRect(64, 0, TILE_SIZE, TILE_SIZE);
        tilesetGraphics.lineStyle(2, 0x555555);
        tilesetGraphics.strokeRect(64, 0, TILE_SIZE, TILE_SIZE);
        tilesetGraphics.fillStyle(0x7a7a7a);
        tilesetGraphics.fillRect(64 + 4, 4, 8, 8);
        tilesetGraphics.fillRect(64 + 20, 20, 8, 8);

        // 3. Grass (Index 3, x=96)
        tilesetGraphics.fillStyle(0x8B4513); // Brown bottom
        tilesetGraphics.fillRect(96, 8, TILE_SIZE, TILE_SIZE - 8);
        tilesetGraphics.fillStyle(0x228B22); // Forest green
        tilesetGraphics.fillRect(96, 0, TILE_SIZE, 8);
        tilesetGraphics.lineStyle(1, 0x32CD32);
        for (let i = 0; i < TILE_SIZE; i += 4) {
            tilesetGraphics.moveTo(96 + i, 8);
            tilesetGraphics.lineTo(96 + i + 2, 0);
        }
        tilesetGraphics.lineStyle(2, 0x654321);
        tilesetGraphics.strokeRect(96, 0, TILE_SIZE, TILE_SIZE);

        // 4. Dirt Gold (Index 4, x=128)
        tilesetGraphics.fillStyle(0x8B4513); // Brown
        tilesetGraphics.fillRect(128, 0, TILE_SIZE, TILE_SIZE);
        tilesetGraphics.lineStyle(2, 0x654321);
        tilesetGraphics.strokeRect(128, 0, TILE_SIZE, TILE_SIZE);
        tilesetGraphics.lineStyle(1, 0x654321);
        tilesetGraphics.moveTo(128 + 16, 0);
        tilesetGraphics.lineTo(128 + 16, TILE_SIZE);
        tilesetGraphics.moveTo(128, 16);
        tilesetGraphics.lineTo(128 + TILE_SIZE, 16);
        tilesetGraphics.fillStyle(0xFFD700); // Gold
        for (let i = 0; i < 4; i++) {
            const x = Math.random() * TILE_SIZE;
            const y = Math.random() * TILE_SIZE;
            tilesetGraphics.fillCircle(128 + x, y, 2);
        }

        // 5. Stone Gold (Index 5, x=160)
        tilesetGraphics.fillStyle(0x696969); // Dark gray
        tilesetGraphics.fillRect(160, 0, TILE_SIZE, TILE_SIZE);
        tilesetGraphics.lineStyle(2, 0x555555);
        tilesetGraphics.strokeRect(160, 0, TILE_SIZE, TILE_SIZE);
        tilesetGraphics.fillStyle(0x7a7a7a);
        tilesetGraphics.fillRect(160 + 4, 4, 8, 8);
        tilesetGraphics.fillRect(160 + 20, 20, 8, 8);
        tilesetGraphics.fillStyle(0xFFD700); // Gold
        for (let i = 0; i < 5; i++) {
            const x = Math.random() * TILE_SIZE;
            const y = Math.random() * TILE_SIZE;
            tilesetGraphics.fillCircle(160 + x, y, 2);
        }

        // Generate the single tileset texture
        tilesetGraphics.generateTexture('tileset', 6 * TILE_SIZE, TILE_SIZE);
        tilesetGraphics.destroy();

        //  Exit marker (bright yellow/gold)
        const exitGraphics = this.add.graphics();
        exitGraphics.fillStyle(0xFFD700); // Gold
        exitGraphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
        exitGraphics.lineStyle(3, 0xFFA500); // Orange border
        exitGraphics.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
        // Add an "X" or arrow symbol
        exitGraphics.lineStyle(4, 0xFFFFFF);
        exitGraphics.moveTo(6, 6);
        exitGraphics.lineTo(TILE_SIZE - 6, TILE_SIZE - 6);
        exitGraphics.moveTo(TILE_SIZE - 6, 6);
        exitGraphics.lineTo(6, TILE_SIZE - 6);
        exitGraphics.generateTexture('exit_marker', TILE_SIZE, TILE_SIZE);
        exitGraphics.destroy();

        //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
        this.scene.start('MainMenu');
    }
}
