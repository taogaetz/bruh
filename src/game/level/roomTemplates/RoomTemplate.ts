import type { Room } from '../Room';
import { RoomType } from '../RoomType';
import { TileType, TILE_SIZE } from '../TileType';

// Room dimensions (in tiles)
export const ROOM_WIDTH = 20;  // 20 tiles wide
export const ROOM_HEIGHT = 15; // 15 tiles tall

// Room template generator interface
export interface RoomTemplateGenerator {
    generateRoom(type: RoomType, context?: RoomGenerationContext): Room;
}

export interface RoomGenerationContext {
    gridX?: number;
    gridY?: number;
    previousRoomType?: RoomType;
    hasBottomExit?: boolean;
    hasTopEntry?: boolean;
}

// Base room template generator
export class RoomTemplateGenerator implements RoomTemplateGenerator {
    generateRoom(type: RoomType, context?: RoomGenerationContext): Room {
        switch (type) {
            case RoomType.START:
                return this.generateStartRoom(context);
            case RoomType.EXIT:
                return this.generateExitRoom(context);
            case RoomType.LEFT_RIGHT:
                return this.generateLeftRightRoom(context);
            case RoomType.LEFT_RIGHT_BOTTOM:
                return this.generateLeftRightBottomRoom(context);
            case RoomType.LEFT_RIGHT_TOP:
                return this.generateLeftRightTopRoom(context);
            case RoomType.SIDE_ROOM:
                return this.generateSideRoom(context);
            case RoomType.SNAKE_PIT_TOP:
                return this.generateSnakePitTop(context);
            case RoomType.SNAKE_PIT_MIDDLE:
                return this.generateSnakePitMiddle(context);
            case RoomType.SNAKE_PIT_BOTTOM:
                return this.generateSnakePitBottom(context);
            default:
                return this.generateSideRoom(context);
        }
    }

    private generateStartRoom(context?: RoomGenerationContext): Room {
        const tiles = this.createEmptyRoom();
        this.fillWalls(tiles, context);

        const hasBottomExit = context?.hasBottomExit || false;

        // ALWAYS guarantee left and right exits for start room
        // If hasBottomExit is true, also add bottom exit
        this.createExits(tiles, true, true, false, hasBottomExit);

        // Guarantee a safe spawn platform in the center-top area
        const centerX = Math.floor(ROOM_WIDTH / 2);
        const spawnPlatformY = 5; // Platform height
        const spawnPlatformWidth = 4; // Platform width

        // Create a solid platform to spawn on (with chance for gold flecks)
        for (let x = centerX - Math.floor(spawnPlatformWidth / 2); x < centerX + Math.floor(spawnPlatformWidth / 2); x++) {
            if (x >= 1 && x < ROOM_WIDTH - 1) {
                tiles[spawnPlatformY][x] = this.getRandomTileType([TileType.DIRT, TileType.DIRT_GOLD]); // Solid platform
            }
        }

        // Clear area above the platform for spawning
        for (let y = spawnPlatformY - 2; y < spawnPlatformY; y++) {
            for (let x = centerX - Math.floor(spawnPlatformWidth / 2); x < centerX + Math.floor(spawnPlatformWidth / 2); x++) {
                if (x >= 1 && x < ROOM_WIDTH - 1 && y >= 1) {
                    tiles[y][x] = TileType.EMPTY;
                }
            }
        }

        // Ensure horizontal path is clear for left/right movement
        const pathY = Math.floor(ROOM_HEIGHT / 2);

        // Add some variety with platforms, but keep paths clear
        this.addPlatforms(tiles, 0.2, pathY + 3);

        // Carve from spawn platform to left and right exits (Force HMR update)
        // Spawn is at (centerX, 5) roughly
        this.carvePath(tiles, centerX, 5, 0, pathY);
        this.carvePath(tiles, centerX, 5, ROOM_WIDTH - 1, pathY);

        if (hasBottomExit) {
            // Carve path to bottom
            this.carvePath(tiles, centerX, 5, centerX, ROOM_HEIGHT - 1);
            this.createBottomDrop(tiles);
        }

        return {
            type: RoomType.START,
            tiles,
            width: ROOM_WIDTH,
            height: ROOM_HEIGHT,
            hasExitLeft: true,
            hasExitRight: true,
            hasExitTop: false,
            hasExitBottom: hasBottomExit
        };
    }

    private generateExitRoom(context?: RoomGenerationContext): Room {
        const tiles = this.createEmptyRoom();
        this.fillWalls(tiles, context);

        // Exit room usually has top exit (to connect from room above)
        // But let's respect the context if provided, defaulting to true for safety
        const hasTopExit = context?.hasTopEntry !== undefined ? context.hasTopEntry : true;

        this.createExits(tiles, true, true, hasTopExit, false);

        // Guarantee a clear path from top to bottom center (where exit will be)
        const centerX = Math.floor(ROOM_WIDTH / 2);

        // Explicitly carve path from top entry to bottom exit
        this.carvePath(tiles, centerX, 0, centerX, ROOM_HEIGHT - 1);

        return {
            type: RoomType.EXIT,
            tiles,
            width: ROOM_WIDTH,
            height: ROOM_HEIGHT,
            hasExitLeft: true,
            hasExitRight: true,
            hasExitTop: true,
            hasExitBottom: false
        };
    }

    private generateLeftRightRoom(context?: RoomGenerationContext): Room {
        const tiles = this.createEmptyRoom();
        this.fillWalls(tiles, context);
        this.createExits(tiles, true, true, false, false);

        // Guarantee a clear horizontal path at mid-height for solution path
        const pathY = Math.floor(ROOM_HEIGHT / 2);

        // Add platforms above and below the path, but not blocking it
        this.addPlatforms(tiles, 0.3, pathY + 3); // Platforms below path

        // Explicitly carve path from left to right
        this.carvePath(tiles, 0, pathY, ROOM_WIDTH - 1, pathY);
        // Add platforms in upper area
        for (let y = 2; y < pathY - 2; y++) {
            for (let x = 2; x < ROOM_WIDTH - 2; x++) {
                if (Math.random() < 0.2 && tiles[y][x] === TileType.EMPTY) {
                    const platformWidth = Math.floor(Math.random() * 3) + 2;
                    let canPlace = true;
                    for (let px = 0; px < platformWidth && x + px < ROOM_WIDTH - 1; px++) {
                        if (tiles[y][x + px] !== TileType.EMPTY ||
                            tiles[y + 1][x + px] !== TileType.EMPTY) {
                            canPlace = false;
                            break;
                        }
                    }
                    if (canPlace) {
                        // Check if there's air above before placing grass
                        const canPlaceGrass = this.hasAirAbove(tiles, x, y);
                        for (let px = 0; px < platformWidth && x + px < ROOM_WIDTH - 1; px++) {
                            // Randomly choose dirt or stone, with chance for gold variant
                            if (canPlaceGrass && Math.random() < 0.1) {
                                // 10% chance for grass on top of platform
                                tiles[y][x + px] = TileType.GRASS;
                            } else {
                                // Regular dirt or stone with gold flecks
                                tiles[y][x + px] = this.getRandomTileType([TileType.DIRT, TileType.DIRT_GOLD]);
                            }
                        }
                    }
                }
            }
        }

        return {
            type: RoomType.LEFT_RIGHT,
            tiles,
            width: ROOM_WIDTH,
            height: ROOM_HEIGHT,
            hasExitLeft: true,
            hasExitRight: true,
            hasExitTop: false,
            hasExitBottom: false
        };
    }

    private generateLeftRightBottomRoom(context?: RoomGenerationContext): Room {
        const tiles = this.createEmptyRoom();
        this.fillWalls(tiles);

        // Check if there's a room above that connects down
        const hasTopExit = context?.hasTopEntry || false;

        this.createExits(tiles, true, true, hasTopExit, true);

        // Guarantee a clear horizontal path at mid-height
        const pathY = Math.floor(ROOM_HEIGHT / 2);
        const centerX = Math.floor(ROOM_WIDTH / 2);

        this.addPlatforms(tiles, 0.3, pathY + 3);
        this.createBottomDrop(tiles);
        if (hasTopExit) {
            this.createTopEntry(tiles);
        }

        // Explicitly carve path from left to right
        this.carvePath(tiles, 0, pathY, ROOM_WIDTH - 1, pathY);

        // Explicitly carve path to bottom
        this.carvePath(tiles, centerX, pathY, centerX, ROOM_HEIGHT - 1);

        if (hasTopExit) {
            // Carve path from top to center
            this.carvePath(tiles, centerX, 0, centerX, pathY);
        }

        return {
            type: RoomType.LEFT_RIGHT_BOTTOM,
            tiles,
            width: ROOM_WIDTH,
            height: ROOM_HEIGHT,
            hasExitLeft: true,
            hasExitRight: true,
            hasExitTop: hasTopExit,
            hasExitBottom: true
        };
    }

    private generateLeftRightTopRoom(context?: RoomGenerationContext): Room {
        const tiles = this.createEmptyRoom();
        this.fillWalls(tiles, context);

        // Should always have top exit if it's this type, but let's be consistent
        const hasTopExit = true;

        this.createExits(tiles, true, true, hasTopExit, false);

        // Guarantee a clear horizontal path at mid-height
        const pathY = Math.floor(ROOM_HEIGHT / 2);
        const centerX = Math.floor(ROOM_WIDTH / 2);

        this.addPlatforms(tiles, 0.3, pathY + 3);
        this.createTopEntry(tiles);

        // Explicitly carve path from left to right
        this.carvePath(tiles, 0, pathY, ROOM_WIDTH - 1, pathY);

        // Carve path from top to center
        this.carvePath(tiles, centerX, 0, centerX, pathY);

        return {
            type: RoomType.LEFT_RIGHT_TOP,
            tiles,
            width: ROOM_WIDTH,
            height: ROOM_HEIGHT,
            hasExitLeft: true,
            hasExitRight: true,
            hasExitTop: true,
            hasExitBottom: false
        };
    }

    private generateSideRoom(context?: RoomGenerationContext): Room {
        const tiles = this.createEmptyRoom();
        this.fillWalls(tiles, context);
        // Side rooms have random exits, but ALWAYS at least one exit to prevent sealed rooms
        let hasLeft = Math.random() > 0.4;
        let hasRight = Math.random() > 0.4;
        let hasTop = Math.random() > 0.4;
        let hasBottom = Math.random() > 0.4;

        // Ensure at least one exit - if none, force one
        if (!hasLeft && !hasRight && !hasTop && !hasBottom) {
            // Force at least one exit - prefer left or right
            if (Math.random() > 0.5) {
                hasLeft = true;
            } else {
                hasRight = true;
            }
        }

        this.createExits(tiles, hasLeft, hasRight, hasTop, hasBottom);
        this.addPlatforms(tiles, 0.5); // More variety in side rooms

        return {
            type: RoomType.SIDE_ROOM,
            tiles,
            width: ROOM_WIDTH,
            height: ROOM_HEIGHT,
            hasExitLeft: hasLeft,
            hasExitRight: hasRight,
            hasExitTop: hasTop,
            hasExitBottom: hasBottom
        };
    }

    private generateSnakePitTop(context?: RoomGenerationContext): Room {
        const tiles = this.createEmptyRoom();
        this.fillWalls(tiles, context);
        // Snake pit top - open at bottom
        this.createExits(tiles, false, false, false, true);
        this.createSnakePitOpening(tiles, 'top');

        return {
            type: RoomType.SNAKE_PIT_TOP,
            tiles,
            width: ROOM_WIDTH,
            height: ROOM_HEIGHT,
            hasExitLeft: false,
            hasExitRight: false,
            hasExitTop: false,
            hasExitBottom: true
        };
    }

    private generateSnakePitMiddle(context?: RoomGenerationContext): Room {
        const tiles = this.createEmptyRoom();
        this.fillWalls(tiles, context);
        // Snake pit middle - open top and bottom
        this.createExits(tiles, false, false, true, true);
        this.createSnakePitOpening(tiles, 'middle');

        return {
            type: RoomType.SNAKE_PIT_MIDDLE,
            tiles,
            width: ROOM_WIDTH,
            height: ROOM_HEIGHT,
            hasExitLeft: false,
            hasExitRight: false,
            hasExitTop: true,
            hasExitBottom: true
        };
    }

    private generateSnakePitBottom(context?: RoomGenerationContext): Room {
        const tiles = this.createEmptyRoom();
        this.fillWalls(tiles, context);
        // Snake pit bottom - open at top
        this.createExits(tiles, false, false, true, false);
        this.createSnakePitOpening(tiles, 'bottom');

        return {
            type: RoomType.SNAKE_PIT_BOTTOM,
            tiles,
            width: ROOM_WIDTH,
            height: ROOM_HEIGHT,
            hasExitLeft: false,
            hasExitRight: false,
            hasExitTop: true,
            hasExitBottom: false
        };
    }

    // Helper methods
    private createEmptyRoom(): TileType[][] {
        const tiles: TileType[][] = [];
        for (let y = 0; y < ROOM_HEIGHT; y++) {
            tiles[y] = [];
            for (let x = 0; x < ROOM_WIDTH; x++) {
                tiles[y][x] = TileType.EMPTY;
            }
        }
        return tiles;
    }

    private fillWalls(tiles: TileType[][], context?: RoomGenerationContext): void {
        // Fill outer walls with organic mix of stone and dirt
        // Top wall - NEVER place grass on top boundaries (will be covered by room above)
        for (let x = 0; x < ROOM_WIDTH; x++) {
            const rand = Math.random();
            if (rand < 0.5) {
                tiles[0][x] = this.getRandomTileType([TileType.STONE, TileType.STONE_GOLD]);
            } else {
                tiles[0][x] = this.getRandomTileType([TileType.DIRT, TileType.DIRT_GOLD]);
            }
        }

        // Bottom wall - mostly stone and dirt (no grass, nothing above to check)
        for (let x = 0; x < ROOM_WIDTH; x++) {
            const rand = Math.random();
            if (rand < 0.6) {
                tiles[ROOM_HEIGHT - 1][x] = this.getRandomTileType([TileType.STONE, TileType.STONE_GOLD]);
            } else {
                tiles[ROOM_HEIGHT - 1][x] = this.getRandomTileType([TileType.DIRT, TileType.DIRT_GOLD]);
            }
        }

        // Left and right walls - mix with some variation, NO GRASS (can't check air above for side walls)
        for (let y = 0; y < ROOM_HEIGHT; y++) {
            // Left wall
            const leftRand = Math.random();
            if (leftRand < 0.5) {
                tiles[y][0] = this.getRandomTileType([TileType.STONE, TileType.STONE_GOLD]);
            } else {
                tiles[y][0] = this.getRandomTileType([TileType.DIRT, TileType.DIRT_GOLD]);
            }

            // Right wall
            const rightRand = Math.random();
            if (rightRand < 0.5) {
                tiles[y][ROOM_WIDTH - 1] = this.getRandomTileType([TileType.STONE, TileType.STONE_GOLD]);
            } else {
                tiles[y][ROOM_WIDTH - 1] = this.getRandomTileType([TileType.DIRT, TileType.DIRT_GOLD]);
            }
        }

        // Add some organic variation - occasional "cracks" or different tiles
        // Add random dirt patches in stone walls
        for (let i = 0; i < 5; i++) {
            const side = Math.floor(Math.random() * 4); // 0=top, 1=bottom, 2=left, 3=right
            const pos = Math.floor(Math.random() * (side < 2 ? ROOM_WIDTH : ROOM_HEIGHT));

            if (side === 0 && (tiles[0][pos] === TileType.STONE || tiles[0][pos] === TileType.STONE_GOLD)) {
                tiles[0][pos] = this.getRandomTileType([TileType.DIRT, TileType.DIRT_GOLD]);
            } else if (side === 1 && (tiles[ROOM_HEIGHT - 1][pos] === TileType.STONE || tiles[ROOM_HEIGHT - 1][pos] === TileType.STONE_GOLD)) {
                tiles[ROOM_HEIGHT - 1][pos] = this.getRandomTileType([TileType.DIRT, TileType.DIRT_GOLD]);
            } else if (side === 2 && (tiles[pos][0] === TileType.STONE || tiles[pos][0] === TileType.STONE_GOLD)) {
                tiles[pos][0] = this.getRandomTileType([TileType.DIRT, TileType.DIRT_GOLD]);
            } else if (side === 3 && (tiles[pos][ROOM_WIDTH - 1] === TileType.STONE || tiles[pos][ROOM_WIDTH - 1] === TileType.STONE_GOLD)) {
                tiles[pos][ROOM_WIDTH - 1] = this.getRandomTileType([TileType.DIRT, TileType.DIRT_GOLD]);
            }
        }
    }

    // Helper to randomly choose between regular and gold-flecked tiles (~4% chance for gold - rare!)
    private getRandomTileType(types: TileType[]): TileType {
        if (types.length === 1) return types[0];
        // ~4% chance for gold variant (25% of original 15%)
        if (Math.random() < 0.04) {
            return types[1]; // Gold variant
        }
        return types[0]; // Regular variant
    }

    // Check if there's air above a position (for grass placement)
    private hasAirAbove(tiles: TileType[][], x: number, y: number): boolean {
        if (y === 0) return true; // Top row always has air above
        if (y > 0 && tiles[y - 1] && tiles[y - 1][x] === TileType.EMPTY) {
            return true;
        }
        return false;
    }

    private createExits(
        tiles: TileType[][],
        left: boolean,
        right: boolean,
        top: boolean,
        bottom: boolean
    ): void {
        const centerY = Math.floor(ROOM_HEIGHT / 2);
        const centerX = Math.floor(ROOM_WIDTH / 2);

        // Left exit
        if (left) {
            for (let y = centerY - 1; y <= centerY + 1; y++) {
                if (y >= 0 && y < ROOM_HEIGHT) {
                    tiles[y][0] = TileType.EMPTY;
                }
            }
        }

        // Right exit
        if (right) {
            for (let y = centerY - 1; y <= centerY + 1; y++) {
                if (y >= 0 && y < ROOM_HEIGHT) {
                    tiles[y][ROOM_WIDTH - 1] = TileType.EMPTY;
                }
            }
        }

        // Top exit
        if (top) {
            for (let x = centerX - 1; x <= centerX + 1; x++) {
                if (x >= 0 && x < ROOM_WIDTH) {
                    tiles[0][x] = TileType.EMPTY;
                }
            }
        }

        // Bottom exit
        if (bottom) {
            for (let x = centerX - 1; x <= centerX + 1; x++) {
                if (x >= 0 && x < ROOM_WIDTH) {
                    tiles[ROOM_HEIGHT - 1][x] = TileType.EMPTY;
                }
            }
        }
    }

    private addPlatforms(tiles: TileType[][], density: number, minY: number = 2): void {
        // Add random platforms throughout the room, starting from minY
        for (let y = minY; y < ROOM_HEIGHT - 3; y++) {
            for (let x = 2; x < ROOM_WIDTH - 2; x++) {
                if (Math.random() < density && tiles[y][x] === TileType.EMPTY) {
                    // Check if there's space for a platform
                    const platformWidth = Math.floor(Math.random() * 4) + 2;
                    let canPlace = true;

                    for (let px = 0; px < platformWidth && x + px < ROOM_WIDTH - 1; px++) {
                        if (tiles[y][x + px] !== TileType.EMPTY ||
                            tiles[y + 1][x + px] !== TileType.EMPTY) {
                            canPlace = false;
                            break;
                        }
                    }

                    if (canPlace) {
                        // Check if there's air above before placing grass
                        const canPlaceGrass = this.hasAirAbove(tiles, x, y);
                        for (let px = 0; px < platformWidth && x + px < ROOM_WIDTH - 1; px++) {
                            // Randomly choose dirt or stone, with chance for gold variant
                            if (canPlaceGrass && Math.random() < 0.1) {
                                // 10% chance for grass on top of platform
                                tiles[y][x + px] = TileType.GRASS;
                            } else {
                                // Regular dirt or stone with gold flecks
                                tiles[y][x + px] = this.getRandomTileType([TileType.DIRT, TileType.DIRT_GOLD]);
                            }
                        }
                    }
                }
            }
        }
    }

    private createBottomDrop(tiles: TileType[][]): void {
        const centerX = Math.floor(ROOM_WIDTH / 2);
        // Create a clear path down the center for dropping - clear EVERYTHING
        for (let y = 0; y < ROOM_HEIGHT - 1; y++) {
            // Only clear the center column to allow dropping, but ensure no blocks
            tiles[y][centerX] = TileType.EMPTY;
            // Clear a bit wider at the bottom to ensure the exit is accessible
            if (y > ROOM_HEIGHT - 5) {
                tiles[y][centerX - 1] = TileType.EMPTY;
                tiles[y][centerX + 1] = TileType.EMPTY;
            }
        }
    }

    private createTopEntry(tiles: TileType[][]): void {
        const centerX = Math.floor(ROOM_WIDTH / 2);
        // Create a clear path from top - clear EVERYTHING
        for (let y = 0; y < 4; y++) {
            tiles[y][centerX] = TileType.EMPTY;
            tiles[y][centerX - 1] = TileType.EMPTY;
            tiles[y][centerX + 1] = TileType.EMPTY;
        }
    }

    private createVerticalPath(tiles: TileType[][], x: number): void {
        // Create a vertical path - clear EVERYTHING
        for (let y = 0; y < ROOM_HEIGHT; y++) {
            tiles[y][x] = TileType.EMPTY;
            // Widen it slightly for safety
            if (x > 0) tiles[y][x - 1] = TileType.EMPTY;
            if (x < ROOM_WIDTH - 1) tiles[y][x + 1] = TileType.EMPTY;
        }
    }

    private createSnakePitOpening(tiles: TileType[][], position: 'top' | 'middle' | 'bottom'): void {
        const centerX = Math.floor(ROOM_WIDTH / 2);
        const pitWidth = 4;

        if (position === 'top' || position === 'middle') {
            // Open at bottom
            for (let x = centerX - Math.floor(pitWidth / 2); x <= centerX + Math.floor(pitWidth / 2); x++) {
                if (x >= 0 && x < ROOM_WIDTH) {
                    tiles[ROOM_HEIGHT - 1][x] = TileType.EMPTY;
                }
            }
        }

        if (position === 'bottom' || position === 'middle') {
            // Open at top
            for (let x = centerX - Math.floor(pitWidth / 2); x <= centerX + Math.floor(pitWidth / 2); x++) {
                if (x >= 0 && x < ROOM_WIDTH) {
                    tiles[0][x] = TileType.EMPTY;
                }
            }
        }

        // Clear the center column for the pit
        for (let y = 1; y < ROOM_HEIGHT - 1; y++) {
            for (let x = centerX - Math.floor(pitWidth / 2); x <= centerX + Math.floor(pitWidth / 2); x++) {
                if (x >= 0 && x < ROOM_WIDTH) {
                    tiles[y][x] = TileType.EMPTY;
                }
            }
        }
    }

    // Explicitly carve a path from start to end
    private carvePath(tiles: TileType[][], startX: number, startY: number, endX: number, endY: number): void {
        // Simple L-shape path carving
        // First move horizontally, then vertically (or vice versa depending on what makes sense)

        // For Spelunky style, we usually want to clear a horizontal corridor and then a vertical one
        // But let's just clear a direct L-path

        // Clear horizontal strip
        const minX = Math.min(startX, endX);
        const maxX = Math.max(startX, endX);
        for (let x = minX; x <= maxX; x++) {
            this.clearTile(tiles, x, startY);
            // Clear headroom (2 tiles high)
            this.clearTile(tiles, x, startY - 1);
        }

        // Clear vertical strip
        const minY = Math.min(startY, endY);
        const maxY = Math.max(startY, endY);
        for (let y = minY; y <= maxY; y++) {
            this.clearTile(tiles, endX, y);
            // Clear width (2 tiles wide)
            this.clearTile(tiles, endX + 1, y);
            this.clearTile(tiles, endX - 1, y);
        }
    }

    private clearTile(tiles: TileType[][], x: number, y: number): void {
        if (y >= 0 && y < ROOM_HEIGHT && x >= 0 && x < ROOM_WIDTH) {
            tiles[y][x] = TileType.EMPTY;
        }
    }
}

