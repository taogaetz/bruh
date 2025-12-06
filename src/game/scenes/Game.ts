import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { RoomLevelGenerator } from '../level/RoomLevelGenerator';
import { TileType, TILE_SIZE } from '../level/TileType';
import { ROOM_WIDTH, ROOM_HEIGHT } from '../level/roomTemplates/RoomTemplate';
import { GRID_WIDTH, GRID_HEIGHT } from '../level/RoomType';

export class Game extends Scene {
    camera!: Phaser.Cameras.Scene2D.Camera;
    player!: Phaser.Physics.Arcade.Sprite;
    map!: Phaser.Tilemaps.Tilemap;
    layer!: Phaser.Tilemaps.TilemapLayer;

    cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    wasd: any;
    roomLevelGenerator!: RoomLevelGenerator;
    exitPosition: { x: number; y: number } | null = null;
    exitMarker: Phaser.GameObjects.Image | null = null;
    debugGraphics: Phaser.GameObjects.Graphics | null = null;
    levelNumber: number = 1;
    bombKey!: Phaser.Input.Keyboard.Key;

    constructor() {
        super('Game');
    }

    init(data: { levelNumber?: number }) {
        // Get level number from data, or start at 1
        this.levelNumber = data?.levelNumber || 1;
    }

    create() {
        // Reset state
        this.debugGraphics = null;
        this.exitMarker = null;
        this.exitPosition = null;

        // Set up camera
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x87CEEB); // Sky blue background

        // Create room-based level generator (4x4 grid of rooms)
        this.roomLevelGenerator = new RoomLevelGenerator();
        this.roomLevelGenerator.generate();

        // Calculate level dimensions
        const levelWidthPixels = GRID_WIDTH * ROOM_WIDTH * TILE_SIZE;
        const levelHeightPixels = GRID_HEIGHT * ROOM_HEIGHT * TILE_SIZE;

        // Enable arcade physics with level bounds
        this.physics.world.setBounds(0, 0, levelWidthPixels, levelHeightPixels);

        // Create Tilemap
        this.map = this.make.tilemap({
            tileWidth: TILE_SIZE,
            tileHeight: TILE_SIZE,
            width: GRID_WIDTH * ROOM_WIDTH,
            height: GRID_HEIGHT * ROOM_HEIGHT
        });

        // Add tileset image
        const tileset = this.map.addTilesetImage('tileset', undefined, TILE_SIZE, TILE_SIZE, 0, 0);

        if (!tileset) {
            console.error("Failed to load tileset");
            return;
        }

        // Create layer
        this.layer = this.map.createBlankLayer('layer', tileset)!;

        // Render the level rooms into the layer
        this.renderLevel();

        // Set collision
        // Collide with everything except empty (0)
        this.layer.setCollisionBetween(1, 5);

        // Create player at start room position - find a safe spawn location
        const solutionPath = this.roomLevelGenerator.getSolutionPath();
        const startRoomPos = solutionPath[0];
        if (startRoomPos) {
            const spawnPos = this.findSafeSpawnPosition(startRoomPos);
            this.player = this.physics.add.sprite(spawnPos.x, spawnPos.y, 'player');
        } else {
            // Fallback spawn
            this.player = this.physics.add.sprite(TILE_SIZE * 10, TILE_SIZE * 5, 'player');
        }

        this.player.setCollideWorldBounds(true);
        this.player.setBounce(0.2);
        this.player.setGravityY(800); // Gravity for Spelunky-style falling
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        body.setSize(14, 22); // Slightly smaller collision box

        // Set up collisions
        this.physics.add.collider(this.player, this.layer);

        // Set up controls
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.wasd = this.input.keyboard!.addKeys('W,S,A,D');
        this.bombKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F);

        // Set camera to follow player
        this.camera.startFollow(this.player);
        this.camera.setBounds(0, 0, levelWidthPixels, levelHeightPixels);

        // Draw debug path
        this.drawDebugPath();

        EventBus.emit('current-scene-ready', this);
    }

    private renderLevel(): void {
        const grid = this.roomLevelGenerator.getGrid();

        // Render each room in the grid
        for (let gridY = 0; gridY < GRID_HEIGHT; gridY++) {
            for (let gridX = 0; gridX < GRID_WIDTH; gridX++) {
                const room = grid[gridY][gridX];
                if (room) {
                    this.renderRoom(room, gridX, gridY);
                }
            }
        }
    }

    private renderRoom(room: any, gridX: number, gridY: number): void {
        // Calculate offsets in TILES
        const roomOffsetX = gridX * ROOM_WIDTH;
        const roomOffsetY = gridY * ROOM_HEIGHT;

        // Render each tile in the room
        for (let y = 0; y < room.height; y++) {
            for (let x = 0; x < room.width; x++) {
                const tileType = room.tiles[y][x];

                if (tileType !== TileType.EMPTY) {
                    // Place tile in layer
                    this.layer.putTileAt(tileType, roomOffsetX + x, roomOffsetY + y);
                }
            }
        }

        // If this is an exit room, add exit marker at the bottom center
        if (room.type === 11) { // RoomType.EXIT
            const centerX = Math.floor(ROOM_WIDTH / 2);
            const bottomY = ROOM_HEIGHT - 1;

            // World coordinates for exit marker
            const exitX = (roomOffsetX + centerX) * TILE_SIZE + (TILE_SIZE / 2);
            const exitY = (roomOffsetY + bottomY) * TILE_SIZE + (TILE_SIZE / 2);

            // Store exit position for collision detection
            this.exitPosition = { x: exitX, y: exitY };

            // Add exit marker (non-physics, just visual)
            this.exitMarker = this.add.image(exitX, exitY, 'exit_marker');
            this.exitMarker.setOrigin(0.5, 0.5);
            this.exitMarker.setDepth(50); // Above platforms but below UI

            // Add a pulsing animation to make it more visible
            this.tweens.add({
                targets: this.exitMarker,
                alpha: { from: 0.5, to: 1 },
                scale: { from: 0.9, to: 1.1 },
                duration: 1000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    private findSafeSpawnPosition(gridPos: { x: number; y: number }): { x: number; y: number } {
        const room = this.roomLevelGenerator.getRoom(gridPos.x, gridPos.y);
        if (!room) {
            return { x: TILE_SIZE * 10, y: TILE_SIZE * 5 };
        }

        const roomOffsetX = gridPos.x * ROOM_WIDTH * TILE_SIZE;
        const roomOffsetY = gridPos.y * ROOM_HEIGHT * TILE_SIZE;

        // ALWAYS find a position with solid ground below
        // Search from top to bottom, left to right
        for (let y = 2; y < room.height - 2; y++) {
            for (let x = 1; x < room.width - 1; x++) {
                // Check if this position is empty (air)
                if (room.tiles[y] && room.tiles[y][x] === TileType.EMPTY) {
                    // Check if there's space above (so we don't spawn in a wall)
                    if (y > 0 && room.tiles[y - 1] && room.tiles[y - 1][x] === TileType.EMPTY) {
                        // Check if there's solid ground directly below
                        if (room.tiles[y + 1] && room.tiles[y + 1][x] !== TileType.EMPTY) {
                            // Found a safe spawn position on solid ground!
                            return {
                                x: roomOffsetX + (x * TILE_SIZE) + (TILE_SIZE / 2),
                                y: roomOffsetY + (y * TILE_SIZE) + (TILE_SIZE / 2)
                            };
                        }
                    }
                }
            }
        }

        // Last resort: spawn on the bottom of the room (should always have ground)
        const centerX = Math.floor(ROOM_WIDTH / 2);
        const bottomY = room.height - 2;
        return {
            x: roomOffsetX + (centerX * TILE_SIZE) + (TILE_SIZE / 2),
            y: roomOffsetY + (bottomY * TILE_SIZE) + (TILE_SIZE / 2)
        };
    }

    private getTextureForTile(tileType: TileType): string {
        // Not used anymore with Tilemaps
        return '';
    }


    update() {
        // Check if player reached the exit
        if (this.exitPosition) {
            const distance = Phaser.Math.Distance.Between(
                this.player.x,
                this.player.y,
                this.exitPosition.x,
                this.exitPosition.y
            );

            // If player is close to exit (within 40 pixels), generate new level
            if (distance < 40) {
                this.generateNewLevel();
                return; // Skip movement this frame
            }
        }

        // Player movement
        const leftKey = this.cursors.left!.isDown || this.wasd.A.isDown;
        const rightKey = this.cursors.right!.isDown || this.wasd.D.isDown;
        const jumpKey = this.cursors.up!.isDown || this.wasd.W.isDown;

        // Horizontal movement
        if (leftKey) {
            this.player.setVelocityX(-200);
        } else if (rightKey) {
            this.player.setVelocityX(200);
        } else {
            this.player.setVelocityX(0);
        }

        // Jumping (only when touching ground)
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        if (jumpKey && (body.touching.down || body.blocked.down)) {
            this.player.setVelocityY(-400); // Jump velocity
        }

        this.handleBomb();
    }

    private handleBomb(): void {
        if (Phaser.Input.Keyboard.JustDown(this.bombKey)) {
            const playerX = this.player.x;
            const playerY = this.player.y;

            // Convert to tile coordinates
            const centerTileX = this.layer.worldToTileX(playerX);
            const centerTileY = this.layer.worldToTileY(playerY);

            const radius = 2;

            // Visual effect
            const explosion = this.add.circle(playerX, playerY, (radius + 0.5) * TILE_SIZE, 0xffaa00, 0.6);
            this.tweens.add({
                targets: explosion,
                alpha: 0,
                scale: 1.2,
                duration: 200,
                onComplete: () => explosion.destroy()
            });

            console.log(`Bomb at player: ${playerX}, ${playerY} -> Tile: ${centerTileX}, ${centerTileY}`);

            for (let y = centerTileY - radius; y <= centerTileY + radius; y++) {
                for (let x = centerTileX - radius; x <= centerTileX + radius; x++) {
                    // Remove tile from layer (updates collision automatically)
                    this.layer.removeTileAt(x, y);

                    // Update logical grid (optional, but good for consistency if we regenerate)
                    // 1. Find which room this tile belongs to
                    const gridX = Math.floor(x / ROOM_WIDTH);
                    const gridY = Math.floor(y / ROOM_HEIGHT);

                    // 2. Find local tile coordinates
                    const localX = x % ROOM_WIDTH;
                    const localY = y % ROOM_HEIGHT;

                    const room = this.roomLevelGenerator.getRoom(gridX, gridY);
                    if (room) {
                        // Ensure coordinates are valid
                        if (localY >= 0 && localY < room.height && localX >= 0 && localX < room.width) {
                            room.tiles[localY][localX] = TileType.EMPTY;
                        }
                    }
                }
            }
        }
    }

    private generateNewLevel(): void {
        // Increment level number
        this.levelNumber++;

        // Transition to LevelTransition scene which will generate the new level
        this.scene.start('LevelTransition', { levelNumber: this.levelNumber });
    }



    private drawDebugPath(): void {
        if (!this.debugGraphics) {
            this.debugGraphics = this.add.graphics();
            this.debugGraphics.setDepth(100); // Ensure it's on top
        }

        this.debugGraphics.clear();
        this.debugGraphics.lineStyle(5, 0x00ff00, 0.8); // Green line, 5px thick, 80% opacity

        const solutionPath = this.roomLevelGenerator.getSolutionPath();
        if (solutionPath.length === 0) return;

        const getRoomCenter = (pos: { x: number, y: number }) => {
            return {
                x: (pos.x * ROOM_WIDTH * TILE_SIZE) + (ROOM_WIDTH * TILE_SIZE / 2),
                y: (pos.y * ROOM_HEIGHT * TILE_SIZE) + (ROOM_HEIGHT * TILE_SIZE / 2)
            };
        };

        // Draw path
        this.debugGraphics.beginPath();
        const start = getRoomCenter(solutionPath[0]);
        this.debugGraphics.moveTo(start.x, start.y);

        for (let i = 1; i < solutionPath.length; i++) {
            const pos = getRoomCenter(solutionPath[i]);
            this.debugGraphics.lineTo(pos.x, pos.y);
        }
        this.debugGraphics.strokePath();

        // Draw points at each room center and add debug text
        this.debugGraphics.fillStyle(0xff0000, 1);

        const grid = this.roomLevelGenerator.getGrid();

        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                const room = grid[y][x];
                if (room) {
                    const center = getRoomCenter({ x, y });

                    // Draw node
                    if (this.roomLevelGenerator.getSolutionPath().some(p => p.x === x && p.y === y)) {
                        this.debugGraphics.fillCircle(center.x, center.y, 10);
                    }

                    // Add debug text
                    const exits = [];
                    if (room.hasExitLeft) exits.push('L');
                    if (room.hasExitRight) exits.push('R');
                    if (room.hasExitTop) exits.push('T');
                    if (room.hasExitBottom) exits.push('B');

                    const debugText = `Type: ${room.type}\nExits: ${exits.join(',')}`;
                    const text = this.add.text(center.x, center.y + 20, debugText, {
                        fontSize: '10px',
                        color: '#000000',
                        backgroundColor: '#ffffff',
                        align: 'center'
                    }).setOrigin(0.5);
                    text.setDepth(101);
                }
            }
        }
    }

    changeScene() {
        this.scene.start('GameOver');
    }
}
